"""FastAPI route handlers for MTG Label Generator.

This module defines the API routes and application setup.
"""

import json
import threading
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.gzip import GZipMiddleware

from src.api.dependencies import setup_error_handlers
from src.cache.cache_manager import get_cache_manager
from src.config import (
    _BACKEND_ROOT,
    APP_NAME,
    CORS_ORIGIN_REGEX,
    CORS_ORIGINS,
    CURRENT_LABEL_TEMPLATE,
    DEBUG,
    ENABLE_TEMPLATE_DEBUG,
    LABEL_TEMPLATES,
    TEMPLATE_PDF_FILES,
    VERCEL_FRONTEND_URL,
    logger,
)
from src.models.set_data import MTGSetResponse
from src.mtg_labels import __version__
from src.services.helpers import download_and_cache_symbol
from src.services.pdf_generator import PDFGenerator
from src.services.scryfall_client import ScryfallClient

# Global Scryfall client instance
scryfall_client = ScryfallClient()


def _preload_icon_cache() -> None:
    """Preload SVG icon cache in background.

    Iterates filtered sets and downloads any uncached icons.
    Rate limiting is built into download_and_cache_symbol.
    """
    try:
        all_sets = scryfall_client.fetch_sets()
        filtered = scryfall_client.filter_sets(all_sets)
        cache_manager = get_cache_manager()

        downloaded = 0
        skipped = 0
        for s in filtered:
            set_id = s.get("id")
            symbol_url = s.get("icon_svg_uri")
            if not set_id or not symbol_url:
                continue

            if cache_manager.get_symbol(set_id):
                skipped += 1
                continue

            download_and_cache_symbol(set_id, symbol_url, f"set '{s.get('name')}'")
            downloaded += 1

        logger.info(
            f"Icon cache preload complete: {downloaded} downloaded, {skipped} already cached"
        )
    except Exception as e:
        logger.error(f"Icon cache preload failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """Application lifespan: start background icon cache preload on startup."""
    thread = threading.Thread(target=_preload_icon_cache, daemon=True)
    thread.start()
    logger.info("Started background icon cache preload")
    yield


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(
        title=APP_NAME,
        debug=DEBUG,
        version=__version__,
        lifespan=lifespan,
        # Disable interactive docs in production
        docs_url="/docs" if DEBUG else None,
        redoc_url="/redoc" if DEBUG else None,
        openapi_url="/openapi.json",
    )

    # Setup error handlers
    setup_error_handlers(app)

    # GZip compression for large responses (e.g. /api/set-icons ~650KB → ~150KB)
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Security response headers
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):  # type: ignore[no-untyped-def]
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_origin_regex=CORS_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Accept"],
    )

    # Mount static files (backend/static/)
    static_dir = _BACKEND_ROOT / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    # Register routes

    @app.get("/", include_in_schema=False)
    async def root_redirect(request: Request):
        """
        Redirect root path to Vercel frontend.
        This allows the old domain to redirect to the new Vercel deployment
        while keeping the API at /api endpoints.

        Health checks and monitoring services are not redirected to prevent loops.
        """
        # Check if this is a health check or monitoring request
        user_agent = request.headers.get("user-agent", "").lower()
        referer = request.headers.get("referer", "")

        # Health checks often have no user-agent or empty user-agent
        has_no_user_agent = not user_agent or user_agent.strip() == ""

        # Common health check patterns
        health_check_patterns = [
            "health",
            "monitor",
            "ping",
            "uptime",
            "status",
            "fly.io",
            "flyio",
            "elb",  # AWS ELB
            "elastichost",  # ElasticHosts
        ]

        # Check if user-agent indicates a health check
        is_health_check = has_no_user_agent or any(
            pattern in user_agent for pattern in health_check_patterns
        )

        # Check if referer is the Vercel URL (prevent redirect loops)
        is_from_vercel = VERCEL_FRONTEND_URL in referer

        # Don't redirect health checks or requests already from Vercel
        if is_health_check or is_from_vercel:
            return Response(
                content="OK",
                status_code=200,
                headers={"Content-Type": "text/plain"},
            )

        # Redirect browser requests to Vercel frontend
        return RedirectResponse(url=VERCEL_FRONTEND_URL, status_code=301)

    @app.get("/api/sets")
    async def api_sets() -> list[MTGSetResponse]:
        """
        API endpoint to get filtered sets.

        Returns:
            List of filtered set dictionaries
        """
        all_sets = scryfall_client.fetch_sets()
        filtered = scryfall_client.filter_sets(all_sets)
        return [MTGSetResponse(**s) for s in filtered]

    @app.get("/api/card-types")
    async def api_card_types() -> dict[str, list[str]]:
        """
        API endpoint to get card types organized by color.

        Returns:
            Dictionary mapping color names to lists of card types
        """
        return scryfall_client.get_card_types_by_color()

    @app.get("/api/set-icons")
    async def api_set_icons() -> Response:
        """
        API endpoint to get all cached set icon SVGs in a single response.

        Returns a JSON dict mapping set_id → raw SVG string for all icons
        that are already cached on disk. Missing icons are omitted.

        Returns:
            JSON response with Cache-Control headers
        """
        cache_manager = get_cache_manager()
        all_sets = scryfall_client.fetch_sets()
        filtered = scryfall_client.filter_sets(all_sets)

        icons: dict[str, str] = {}
        for s in filtered:
            set_id = s.get("id")
            if not set_id:
                continue
            cached_path = cache_manager.get_symbol(set_id)
            if cached_path:
                try:
                    svg_content = Path(cached_path).read_text(encoding="utf-8")
                    icons[set_id] = svg_content
                except Exception as e:
                    logger.warning(f"Failed to read cached symbol for {set_id}: {e}")

        return Response(
            content=json.dumps(icons),
            media_type="application/json",
            headers={
                "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
            },
        )

    @app.post("/generate-pdf", include_in_schema=False)
    async def generate_pdf(
        set_ids: list[str] | None = Form(None),
        card_type_ids: list[str] | None = Form(None),
        use_template: str | None = Form(None),
        template: str | None = Form(None),
        custom_template: str | None = Form(None),
        label_layout: str | None = Form(None),
        placeholders: int = Form(0),
        view_mode: str = Form("sets"),
    ) -> StreamingResponse:
        """
        Generate PDF with labels for selected sets or card types.

        Args:
            set_ids: List of set IDs to include in PDF (for sets view)
            card_type_ids: List of card type IDs (format: "color:type") to include
                in PDF (for types view)
            use_template: If provided (checkbox checked), overlay labels on
                Avery5160AddressLabels.pdf template
            template: Label template name (e.g., "avery5160", "avery64x30-r")
            placeholders: Number of empty labels at start
            view_mode: View mode - "sets" or "types" (default: "sets")

        Returns:
            StreamingResponse with PDF file

        Raises:
            HTTPException: If no valid sets/card types are selected or invalid template
        """
        # Validate view_mode
        if view_mode not in ("sets", "types"):
            raise HTTPException(
                status_code=400, detail="Invalid view_mode. Must be 'sets' or 'types'."
            )

        # Limit input list sizes to prevent abuse
        max_items = 500
        if set_ids and len(set_ids) > max_items:
            raise HTTPException(
                status_code=400, detail=f"Too many set IDs. Maximum is {max_items}."
            )
        if card_type_ids and len(card_type_ids) > max_items:
            raise HTTPException(
                status_code=400, detail=f"Too many card type IDs. Maximum is {max_items}."
            )

        # Handle case where no sets/card types are selected
        if view_mode == "types":
            if not card_type_ids or len(card_type_ids) == 0:
                logger.warning("PDF generation attempted with no card types selected")
                raise HTTPException(
                    status_code=400,
                    detail="Please select at least one card type before generating the PDF.",
                )
        else:
            if not set_ids or len(set_ids) == 0:
                logger.warning("PDF generation attempted with no sets selected")
                raise HTTPException(
                    status_code=400,
                    detail="Please select at least one set before generating the PDF.",
                )

        # Parse and validate custom template if provided
        custom_template_config: dict[str, float] | None = None
        if custom_template:
            try:
                parsed = json.loads(custom_template)
                required_fields = [
                    "page_width",
                    "page_height",
                    "labels_per_row",
                    "label_rows",
                    "label_width",
                    "label_height",
                    "left_margin",
                    "top_margin",
                    "horizontal_gap",
                    "vertical_gap",
                ]
                missing = [f for f in required_fields if f not in parsed]
                if missing:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Custom template missing fields: {', '.join(missing)}",
                    )
                custom_template_config = {
                    "page_width": float(parsed["page_width"]),
                    "page_height": float(parsed["page_height"]),
                    "labels_per_row": float(parsed["labels_per_row"]),
                    "label_rows": float(parsed["label_rows"]),
                    "label_width": float(parsed["label_width"]),
                    "label_height": float(parsed["label_height"]),
                    "left_margin": float(parsed["left_margin"]),
                    "top_margin": float(parsed["top_margin"]),
                    "horizontal_gap": float(parsed["horizontal_gap"]),
                    "vertical_gap": float(parsed["vertical_gap"]),
                    "label_margin_x": float(parsed.get("label_margin_x", 7.2)),
                    "label_margin_y": float(parsed.get("label_margin_y", 7.2)),
                }
                # Validate positive values
                for field, value in custom_template_config.items():
                    if field not in ("horizontal_gap", "vertical_gap") and value <= 0:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Custom template field '{field}' must be positive.",
                        )
                logger.info(f"Using custom template: {custom_template_config}")
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=400, detail="Invalid JSON in custom_template field."
                )

        # Validate and set template
        label_template = template or CURRENT_LABEL_TEMPLATE
        if label_template not in LABEL_TEMPLATES:
            logger.warning(
                f"Invalid template '{label_template}', using default '{CURRENT_LABEL_TEMPLATE}'"
            )
            label_template = CURRENT_LABEL_TEMPLATE

        use_template_bool = use_template is not None

        # Check if template debug feature is enabled
        if use_template_bool and not ENABLE_TEMPLATE_DEBUG:
            logger.warning("Template debug feature is disabled. Ignoring use_template request.")
            use_template_bool = False

        logger.info(
            f"Generating PDF for view_mode: {view_mode}, "
            f"set_ids: {set_ids}, card_type_ids: {card_type_ids}, "
            f"template: {label_template}, use_template: {use_template_bool}, "
            f"placeholders: {placeholders}"
        )

        # Calculate how many placeholders (empty labels) to insert at the start.
        # We clamp this to at most labels_per_page - 1 so the user can shift
        # labels within the first page of the sheet.
        labels_config = custom_template_config or LABEL_TEMPLATES[label_template]
        labels_per_page = int(labels_config["labels_per_row"] * labels_config["label_rows"])
        raw_placeholders = placeholders or 0
        placeholder_count = max(0, min(raw_placeholders, max(labels_per_page - 1, 0)))

        # Build the list of labels to render
        selected_items_data: list[dict] = []

        # Add placeholders as special entries understood by PDFGenerator
        for _ in range(placeholder_count):
            selected_items_data.append({"__placeholder__": True})

        if view_mode == "types":
            # Handle card types (color + type combinations)
            # card_type_ids format: "color:type" (e.g., "White:Creature")
            for card_type_id in card_type_ids or []:
                if ":" in card_type_id:
                    color, card_type = card_type_id.split(":", 1)
                    # Create a simple dict for the label
                    selected_items_data.append(
                        {
                            "color": color,
                            "type": card_type,
                            "name": f"{card_type}",  # Just the type name for the label
                            "id": card_type_id,  # Use the combined ID
                        }
                    )
        else:
            # Handle sets (default)
            all_sets = scryfall_client.fetch_sets()
            filtered = scryfall_client.filter_sets(all_sets)

            # Create a mapping of set_id to set_dict for quick lookup
            sets_by_id: dict[str, dict] = {}
            for s in filtered:
                set_id_key = s.get("id")
                if isinstance(set_id_key, str):
                    sets_by_id[set_id_key] = s

            # Expand set_ids list to include duplicates based on quantities
            for set_id in set_ids or []:
                if set_id in sets_by_id:
                    selected_items_data.append(sets_by_id[set_id])

        if not selected_items_data:
            item_type = "card types" if view_mode == "types" else "sets"
            logger.error(f"No valid {item_type} selected")
            raise HTTPException(status_code=400, detail=f"No valid {item_type} selected.")

        # Set template path if debug mode is enabled
        template_path = None
        if use_template_bool:
            # Get the template PDF file based on the selected template
            template_pdf_filename = TEMPLATE_PDF_FILES.get(label_template)
            if template_pdf_filename:
                template_file = Path(template_pdf_filename)
                if template_file.exists():
                    template_path = str(template_file)
                    logger.info(
                        f"Using template PDF '{template_pdf_filename}' "
                        f"for template '{label_template}'"
                    )
                else:
                    logger.warning(
                        f"Template PDF not found: {template_file} "
                        f"for template '{label_template}', generating without template"
                    )
            else:
                logger.warning(
                    f"No template PDF mapping found for template '{label_template}', "
                    "generating without template overlay"
                )

        # Parse label layout if provided
        label_layout_config: dict | None = None
        if label_layout:
            try:
                label_layout_config = json.loads(label_layout)
                logger.info(f"Using custom label layout: {label_layout_config}")
            except json.JSONDecodeError:
                logger.warning("Invalid JSON in label_layout field, using default layout")

        pdf_generator = PDFGenerator(
            selected_items_data,
            template_name=label_template,
            template_path=template_path,
            view_mode=view_mode,
            template_config=custom_template_config,
            label_layout=label_layout_config,
        )
        pdf_buffer = pdf_generator.generate()
        filename = "mtg_labels.pdf" if not use_template_bool else "mtg_labels_with_template.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment;filename={filename}"},
        )

    return app
