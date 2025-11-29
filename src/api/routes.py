"""FastAPI route handlers for MTG Label Generator.

This module defines the API routes and application setup.
"""

from pathlib import Path

from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from src.api.dependencies import setup_error_handlers
from src.config import (
    APP_NAME,
    CURRENT_LABEL_TEMPLATE,
    DEBUG,
    ENABLE_TEMPLATE_DEBUG,
    LABEL_TEMPLATES,
    TEMPLATE_PDF_FILES,
    logger,
)
from src.models.set_data import MTGSet
from src.mtg_label_generator import __version__
from src.services.pdf_generator import PDFGenerator
from src.services.scryfall_client import ScryfallClient

# Global Scryfall client instance
scryfall_client = ScryfallClient()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(
        title=APP_NAME,
        debug=DEBUG,
        version=__version__,
    )

    # Setup error handlers
    setup_error_handlers(app)

    # Mount static files
    static_dir = Path("static")
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    # Setup templates
    templates_dir = Path("templates")
    if templates_dir.exists():
        templates = Jinja2Templates(directory=str(templates_dir))
        app.state.templates = templates

    # Register routes
    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request, view: str = "sets") -> HTMLResponse:
        """
        Render the main index page with grouped sets or card types.

        Args:
            request: FastAPI request object
            view: View mode - "sets" or "types" (default: "sets")

        Returns:
            HTML response with index page
        """
        # Calculate labels per page for each template
        template_labels_per_page = {
            template_id: int(template_config["labels_per_row"] * template_config["label_rows"])
            for template_id, template_config in LABEL_TEMPLATES.items()
        }

        if view == "types":
            # Get card types organized by color (no need to fetch all cards)
            card_types_by_color = scryfall_client.get_card_types_by_color()

            return app.state.templates.TemplateResponse(
                request,
                "index.html",
                {
                    "view_mode": "types",
                    "card_types_by_color": card_types_by_color,
                    "grouped_sets": {},
                    "current_template": CURRENT_LABEL_TEMPLATE,
                    "enable_template_debug": ENABLE_TEMPLATE_DEBUG,
                    "template_labels_per_page": template_labels_per_page,
                },
            )
        else:
            # Default: sets view
            all_sets = scryfall_client.fetch_sets()
            filtered = scryfall_client.filter_sets(all_sets)
            grouped_sets = scryfall_client.group_sets(filtered)

            return app.state.templates.TemplateResponse(
                request,
                "index.html",
                {
                    "view_mode": "sets",
                    "grouped_sets": grouped_sets,
                    "grouped_cards": {},
                    "current_template": CURRENT_LABEL_TEMPLATE,
                    "enable_template_debug": ENABLE_TEMPLATE_DEBUG,
                    "template_labels_per_page": template_labels_per_page,
                },
            )

    @app.get("/api/sets")
    async def api_sets() -> list[dict]:
        """
        API endpoint to get filtered sets.

        Returns:
            List of filtered set dictionaries
        """
        all_sets = scryfall_client.fetch_sets()
        filtered = scryfall_client.filter_sets(all_sets)
        # Convert MTGSet objects to dictionaries if needed
        return [s.to_dict() if isinstance(s, MTGSet) else s for s in filtered]

    @app.post("/generate-pdf")
    async def generate_pdf(
        set_ids: list[str] | None = Form(None),
        card_type_ids: list[str] | None = Form(None),
        use_template: str | None = Form(None),
        template: str | None = Form(None),
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
        labels_config = LABEL_TEMPLATES[label_template]
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
                    selected_items_data.append({
                        "color": color,
                        "type": card_type,
                        "name": f"{card_type}",  # Just the type name for the label
                        "id": card_type_id,  # Use the combined ID
                    })
        else:
            # Handle sets (default)
            all_sets = scryfall_client.fetch_sets()
            filtered = scryfall_client.filter_sets(all_sets)

            # Create a mapping of set_id to set_dict for quick lookup
            sets_by_id: dict[str, dict] = {}
            for s in filtered:
                set_dict = s.to_dict() if isinstance(s, MTGSet) else s
                set_id_key = set_dict.get("id")
                if isinstance(set_id_key, str):
                    sets_by_id[set_id_key] = set_dict

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

        pdf_generator = PDFGenerator(
            selected_items_data,
            template_name=label_template,
            template_path=template_path,
            view_mode=view_mode,
        )
        pdf_buffer = pdf_generator.generate()
        filename = "mtg_labels.pdf" if not use_template_bool else "mtg_labels_with_template.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment;filename={filename}"},
        )

    return app
