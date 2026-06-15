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
from fastapi.responses import JSONResponse, RedirectResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.gzip import GZipMiddleware
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from src.api.dependencies import setup_error_handlers
from src.api.rate_limit import RateLimiter, get_client_ip
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
    MAX_INPUT_ITEMS,
    MAX_ITEM_LENGTH,
    MAX_LABELS_PER_AXIS,
    MAX_REQUEST_BODY_BYTES,
    MAX_TEMPLATE_DIMENSION,
    RATE_LIMIT_API_MAX_REQUESTS,
    RATE_LIMIT_MAX_KEYS,
    RATE_LIMIT_PDF_MAX_REQUESTS,
    RATE_LIMIT_WINDOW_SECONDS,
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
        filtered = scryfall_client.filter_non_digital(all_sets)
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


def _error_body(status_code: int, error_type: str, detail: str, path: str) -> dict:
    """Build the structured error envelope used across the API."""
    return {
        "error": {
            "type": error_type,
            "status_code": status_code,
            "detail": detail,
            "path": path,
        }
    }


class _BodySizeLimitMiddleware:
    """ASGI middleware that rejects request bodies larger than ``max_bytes``.

    Enforcement is twofold:

    1. A fast ``Content-Length`` pre-check rejects a *declared* oversized body
       (413) before any of it is read, and rejects a malformed/negative
       ``Content-Length`` (400 — fail closed rather than letting it through).
    2. An authoritative running byte count over the streamed body catches
       chunked / ``Content-Length``-less requests that would otherwise bypass
       the header check.

    Bodies on this API are tiny (<= ``max_bytes``), so buffering the whole body
    to count it before handing it to the route is acceptable.
    """

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # 1. Declared-length fast path (and fail-closed on malformed values).
        declared: int | None = None
        for name, value in scope.get("headers", []):
            if name == b"content-length":
                try:
                    declared = int(value)
                except ValueError:
                    await self._reject(scope, send, 400, "Invalid Content-Length header.")
                    return
                if declared < 0:
                    await self._reject(scope, send, 400, "Invalid Content-Length header.")
                    return
                break
        if declared is not None and declared > self.max_bytes:
            await self._reject(scope, send, 413, "Request body too large.")
            return

        # 2. Authoritative streamed byte count (catches chunked / lying CL).
        body = bytearray()
        more_body = True
        while more_body:
            message = await receive()
            message_type = message["type"]
            if message_type == "http.disconnect":
                # Surface the disconnect to the inner app and stop. Bind the
                # message as a default arg so the closure captures it by value,
                # not by (later-rebindable) reference to the loop variable.
                async def _disconnected(msg: Message = message) -> Message:
                    return msg

                await self.app(scope, _disconnected, send)
                return
            if message_type != "http.request":
                # The ASGI HTTP spec only delivers http.request / http.disconnect
                # on the receive channel. Stop reading on anything else rather
                # than `continue` (which would not advance more_body and could
                # spin forever if the channel went quiet).
                break
            body.extend(message.get("body", b""))
            if len(body) > self.max_bytes:
                await self._reject(scope, send, 413, "Request body too large.")
                return
            more_body = message.get("more_body", False)

        # Replay the buffered body to the inner app exactly once, then delegate
        # to the real receive channel. The delegation matters: after the body,
        # downstream code (e.g. StreamingResponse) calls receive() to watch for
        # client disconnect — it must get the genuine http.disconnect, not a
        # second http.request (which raises "Unexpected message received").
        buffered = bytes(body)
        replayed = False

        async def replay() -> Message:
            nonlocal replayed
            if not replayed:
                replayed = True
                return {"type": "http.request", "body": buffered, "more_body": False}
            return await receive()

        await self.app(scope, replay, send)

    async def _reject(self, scope: Scope, send: Send, status_code: int, detail: str) -> None:
        error_type = "PayloadTooLarge" if status_code == 413 else "BadRequest"
        # This middleware sits just inside CORS, so CORS headers are still added
        # to the rejection, but it is outside the security-header middleware —
        # apply the hardening headers here so 413/400 responses are protected.
        headers = security_headers()
        # We reject before draining the (possibly still-streaming) request body.
        # Ask the server to close the connection so leftover body bytes cannot
        # corrupt the next request on a keep-alive connection.
        headers["Connection"] = "close"
        response = JSONResponse(
            status_code=status_code,
            content=_error_body(status_code, error_type, detail, scope.get("path", "")),
            headers=headers,
        )
        await response(scope, _empty_receive, send)


async def _empty_receive() -> Message:
    """A no-op receive for sending a response without consuming a request body."""
    return {"type": "http.request", "body": b"", "more_body": False}


def security_headers() -> dict[str, str]:
    """Return the hardening response headers applied to every response.

    HSTS is only emitted outside DEBUG (production is always served over TLS).
    """
    headers = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        # Limit powerful browser features for any HTML/error responses served here.
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
        # Isolate this origin from cross-origin window references.
        "Cross-Origin-Opener-Policy": "same-origin",
        # This API never returns active HTML content; lock it down so any error
        # page or unexpected HTML cannot execute scripts or be framed.
        "Content-Security-Policy": (
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
        ),
    }
    if not DEBUG:
        # Force HTTPS for a year (Fly serves with force_https).
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return headers


def _validate_id_list(ids: list[str] | None, singular: str, plural: str) -> None:
    """Reject an ID list that is too long or contains an over-length entry.

    Args:
        ids: The submitted list (may be ``None``/empty — both are no-ops here).
        singular: Noun for the per-item message, e.g. ``"Set ID"``.
        plural: Noun for the list-size message, e.g. ``"set IDs"``.
    """
    if not ids:
        return
    if len(ids) > MAX_INPUT_ITEMS:
        raise HTTPException(
            status_code=400, detail=f"Too many {plural}. Maximum is {MAX_INPUT_ITEMS}."
        )
    for item in ids:
        if len(item) > MAX_ITEM_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=f"{singular} too long. Maximum is {MAX_ITEM_LENGTH} characters.",
            )


def _parse_letters(raw: str | None) -> list[str]:
    """Parse the alphabet-divider ``letters`` form value into single letters.

    The frontend expands ranges (``A-F, H, L-Z``) before sending, so the value
    here is a comma-separated list of single letters. Each token is validated as
    a single A-Z letter, uppercased, and de-duplicated while preserving order.

    Args:
        raw: Comma-separated single letters, or ``None``/empty.

    Returns:
        Ordered, de-duplicated list of uppercase letters (empty if no input).

    Raises:
        HTTPException: 400 if the value is too long or has a non-letter token.
    """
    if not raw:
        return []
    if len(raw) > 200:
        raise HTTPException(status_code=400, detail="Letters value too long.")
    letters: list[str] = []
    for token in raw.split(","):
        token = token.strip().upper()
        if not token:
            continue
        if len(token) != 1 or not ("A" <= token <= "Z"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid letter '{token}'. Use single letters A-Z.",
            )
        if token not in letters:
            letters.append(token)
    return letters


def _parse_custom_template(custom_template: str) -> dict[str, float]:
    """Parse and validate the ``custom_template`` JSON blob into a config dict.

    Raises:
        HTTPException(400): on invalid JSON, missing/non-numeric fields,
            non-positive dimensions, or values exceeding the safe maximums.
    """
    try:
        parsed = json.loads(custom_template)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in custom_template field.")

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

    try:
        config: dict[str, float] = {
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
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Custom template fields must be numeric.")

    # Gaps may legitimately be zero; everything else must be strictly positive.
    gap_fields = ("horizontal_gap", "vertical_gap")
    for field, value in config.items():
        if field not in gap_fields and value <= 0:
            raise HTTPException(
                status_code=400, detail=f"Custom template field '{field}' must be positive."
            )

    # Bound every dimension to prevent resource exhaustion (DoS): an oversized
    # page/label or a huge grid would force the PDF generator into an enormous
    # label layout. Grid counts and physical dimensions have separate ceilings.
    grid_fields = ("labels_per_row", "label_rows")
    for field in grid_fields:
        if config[field] > MAX_LABELS_PER_AXIS:
            raise HTTPException(
                status_code=400,
                detail=f"Custom template field '{field}' exceeds maximum "
                f"of {int(MAX_LABELS_PER_AXIS)}.",
            )
    for field, value in config.items():
        if field not in grid_fields and value > MAX_TEMPLATE_DIMENSION:
            raise HTTPException(
                status_code=400,
                detail=f"Custom template field '{field}' exceeds maximum "
                f"of {MAX_TEMPLATE_DIMENSION} points.",
            )

    logger.info(f"Using custom template: {config}")
    return config


def _build_label_items(
    view_mode: str,
    set_ids: list[str] | None,
    card_type_ids: list[str] | None,
    placeholder_count: int,
    letters: list[str] | None = None,
) -> list[dict]:
    """Build the ordered list of label entries to render.

    Leading placeholders shift the first printed label; the remainder are the
    resolved card-type or set entries.
    """
    items: list[dict] = [{"__placeholder__": True} for _ in range(placeholder_count)]

    if view_mode == "types":
        # card_type_ids format: "color:type" (e.g. "White:Creature").
        for card_type_id in card_type_ids or []:
            if ":" in card_type_id:
                color, card_type = card_type_id.split(":", 1)
                items.append(
                    {
                        "color": color,
                        "type": card_type,
                        "name": card_type,
                        "id": card_type_id,
                    }
                )
        return items

    # Sets (default): resolve each requested ID against the non-digital sets.
    all_sets = scryfall_client.fetch_sets()
    filtered = scryfall_client.filter_non_digital(all_sets)
    sets_by_id: dict[str, dict] = {s["id"]: s for s in filtered if isinstance(s.get("id"), str)}
    for set_id in set_ids or []:
        if set_id not in sets_by_id:
            continue
        set_dict = sets_by_id[set_id]
        if letters:
            # One label per letter; build a new dict so the cached set is
            # never mutated.
            for letter in letters:
                items.append({**set_dict, "letter": letter})
        else:
            items.append(set_dict)
    return items


def _resolve_template_path(use_template: bool, label_template: str) -> str | None:
    """Return the overlay PDF path for debug mode, or ``None`` if unavailable."""
    if not use_template:
        return None
    template_pdf_filename = TEMPLATE_PDF_FILES.get(label_template)
    if not template_pdf_filename:
        logger.warning(
            f"No template PDF mapping found for template '{label_template}', "
            "generating without template overlay"
        )
        return None
    template_file = Path(template_pdf_filename)
    if not template_file.exists():
        logger.warning(
            f"Template PDF not found: {template_file} "
            f"for template '{label_template}', generating without template"
        )
        return None
    logger.info(f"Using template PDF '{template_pdf_filename}' for template '{label_template}'")
    return str(template_file)


def create_app(
    *,
    pdf_limiter: RateLimiter | None = None,
    api_limiter: RateLimiter | None = None,
    max_body_bytes: int | None = None,
) -> FastAPI:
    """Create and configure the FastAPI application.

    Args:
        pdf_limiter: Rate limiter applied to ``/generate-pdf``. If omitted, a
            fresh limiter scoped to this app instance is created — this keeps
            tests that spin up multiple apps independent of each other.
        api_limiter: Rate limiter applied to ``/api/*`` GET endpoints. Same
            defaulting/override pattern as ``pdf_limiter``.
        max_body_bytes: Maximum allowed request body size (bytes). Larger
            requests return 413 (enforced by streamed byte count, so chunked
            bodies cannot bypass it). ``None`` uses ``MAX_REQUEST_BODY_BYTES``.

    Returns:
        Configured FastAPI application instance
    """
    # Limiters default per-instance, not module-global, so each create_app()
    # call (notably in tests) gets a fresh bucket.
    if pdf_limiter is None:
        pdf_limiter = RateLimiter(
            max_requests=RATE_LIMIT_PDF_MAX_REQUESTS,
            window_seconds=RATE_LIMIT_WINDOW_SECONDS,
            max_keys=RATE_LIMIT_MAX_KEYS,
        )
    if api_limiter is None:
        api_limiter = RateLimiter(
            max_requests=RATE_LIMIT_API_MAX_REQUESTS,
            window_seconds=RATE_LIMIT_WINDOW_SECONDS,
            max_keys=RATE_LIMIT_MAX_KEYS,
        )
    body_cap = max_body_bytes if max_body_bytes is not None else MAX_REQUEST_BODY_BYTES

    app = FastAPI(
        title=APP_NAME,
        debug=DEBUG,
        version=__version__,
        lifespan=lifespan,
        # Disable interactive docs and schema exposure in production.
        # The frontend uses a committed openapi.json (Orval), so the live
        # schema endpoint is unnecessary in prod and only widens attack surface.
        docs_url="/docs" if DEBUG else None,
        redoc_url="/redoc" if DEBUG else None,
        openapi_url="/openapi.json" if DEBUG else None,
    )

    # Setup error handlers
    setup_error_handlers(app)

    # Middleware below is registered innermost-first. Starlette wraps each newly
    # added middleware AROUND the previously added ones, so the LAST one
    # registered is the OUTERMOST at runtime. Effective request order:
    #   CORS -> body-size cap -> security headers -> rate limit -> GZip -> route
    #
    # The body-size cap is a pure-ASGI middleware that consumes and re-emits the
    # request body. It must sit OUTSIDE the BaseHTTPMiddleware layers (security
    # headers, rate limit): nesting a body-reading ASGI middleware *inside* a
    # BaseHTTPMiddleware deadlocks Starlette on streaming responses. CORS is
    # itself a pure-ASGI middleware (not BaseHTTPMiddleware), so it can safely
    # wrap the body-size cap — and being outermost means CORS headers are added
    # to the body-size cap's own 413/400 responses too. The body-size cap
    # applies the hardening headers to those responses directly (see _reject);
    # the security-header middleware wraps the rate limiter so 429s carry them.

    # GZip compression for large responses (e.g. /api/set-icons ~650KB → ~150KB)
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Per-IP rate limiting on the expensive PDF endpoint and the public /api
    # surface. ``/``, ``/static/*`` and docs paths are intentionally exempt:
    # the root path serves health checks, and static SVGs are bulk-fetched by
    # browsers (one request per set icon).
    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):  # type: ignore[no-untyped-def]
        path = request.url.path
        if path == "/generate-pdf":
            limiter: RateLimiter | None = pdf_limiter
        elif path.startswith("/api/"):
            limiter = api_limiter
        else:
            limiter = None
        if limiter is not None:
            client_ip = get_client_ip(request)
            if not limiter.hit(client_ip):
                return JSONResponse(
                    status_code=429,
                    content=_error_body(
                        429,
                        "RateLimited",
                        "Too many requests. Please slow down and retry shortly.",
                        request.url.path,
                    ),
                    headers={"Retry-After": str(RATE_LIMIT_WINDOW_SECONDS)},
                )
        return await call_next(request)

    # Security response headers
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):  # type: ignore[no-untyped-def]
        response = await call_next(request)
        for header, value in security_headers().items():
            response.headers[header] = value
        return response

    # Reject oversized request bodies (413), enforced by a streamed byte count so
    # chunked / Content-Length-less requests cannot bypass the cap. Registered
    # before CORS so it wraps the BaseHTTPMiddleware layers (avoiding the
    # Starlette streaming deadlock) but is itself wrapped by CORS (so its
    # rejections still get CORS headers).
    app.add_middleware(_BodySizeLimitMiddleware, max_bytes=body_cap)

    # Configure CORS.
    # This API is stateless and uses no cookies, Authorization headers, or any
    # other credentials, so credentials are disabled. This is important because
    # allow_origin_regex matches a broad set of preview origins
    # (*.vusercontent.net); pairing that with allow_credentials=True would let
    # those origins make authenticated cross-site requests.
    # Registered LAST so CORS is the OUTERMOST middleware.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_origin_regex=CORS_ORIGIN_REGEX,
        allow_credentials=False,
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
        filtered = scryfall_client.filter_non_digital(all_sets)
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
        filtered = scryfall_client.filter_non_digital(all_sets)

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
        placeholders: int = Form(0),
        view_mode: str = Form("sets"),
        letters: str | None = Form(None),
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

        # Bound input list sizes and per-item lengths to prevent abuse.
        _validate_id_list(set_ids, "Set ID", "set IDs")
        _validate_id_list(card_type_ids, "Card type ID", "card type IDs")

        # Require a non-empty selection for the active view mode.
        if view_mode == "types" and not card_type_ids:
            logger.warning("PDF generation attempted with no card types selected")
            raise HTTPException(
                status_code=400,
                detail="Please select at least one card type before generating the PDF.",
            )
        if view_mode == "sets" and not set_ids:
            logger.warning("PDF generation attempted with no sets selected")
            raise HTTPException(
                status_code=400,
                detail="Please select at least one set before generating the PDF.",
            )

        # Parse and validate the custom template (raises 400 on any problem).
        custom_template_config = (
            _parse_custom_template(custom_template) if custom_template else None
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
        # labels within the first page of the sheet. The absolute cap also
        # prevents a large custom grid from turning an unbounded `placeholders`
        # value into a huge label list (resource-exhaustion / DoS guard).
        labels_config = custom_template_config or LABEL_TEMPLATES[label_template]
        labels_per_page = int(labels_config["labels_per_row"] * labels_config["label_rows"])
        max_placeholders = max(labels_per_page - 1, 0)
        placeholder_count = min(max(0, placeholders or 0), max_placeholders)

        # Parse alphabet divider letters (raises 400 on a non-letter token).
        parsed_letters = _parse_letters(letters)

        # Bound the set x letter cross-product to the same ceiling that limits a
        # plain label request, so alphabet expansion cannot amplify a small
        # request into a huge PDF (resource-exhaustion guard).
        if parsed_letters and set_ids and len(set_ids) * len(parsed_letters) > MAX_INPUT_ITEMS:
            raise HTTPException(
                status_code=400,
                detail=f"Too many label items. Maximum is {MAX_INPUT_ITEMS}.",
            )

        selected_items_data = _build_label_items(
            view_mode, set_ids, card_type_ids, placeholder_count, parsed_letters
        )
        if not selected_items_data:
            item_type = "card types" if view_mode == "types" else "sets"
            logger.error(f"No valid {item_type} selected")
            raise HTTPException(status_code=400, detail=f"No valid {item_type} selected.")

        template_path = _resolve_template_path(use_template_bool, label_template)

        pdf_generator = PDFGenerator(
            selected_items_data,
            template_name=label_template,
            template_path=template_path,
            view_mode=view_mode,
            template_config=custom_template_config,
        )
        pdf_buffer = pdf_generator.generate()
        filename = "mtg_labels.pdf" if not use_template_bool else "mtg_labels_with_template.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment;filename={filename}"},
        )

    return app
