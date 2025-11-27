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
    async def index(request: Request) -> HTMLResponse:
        """
        Render the main index page with grouped sets.

        Args:
            request: FastAPI request object

        Returns:
            HTML response with index page
        """
        all_sets = scryfall_client.fetch_sets()
        filtered = scryfall_client.filter_sets(all_sets)
        grouped_sets = scryfall_client.group_sets(filtered)
        return app.state.templates.TemplateResponse(
            request,
            "index.html",
            {
                "grouped_sets": grouped_sets,
                "current_template": CURRENT_LABEL_TEMPLATE,
                "enable_template_debug": ENABLE_TEMPLATE_DEBUG,
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
        use_template: str | None = Form(None),
        template: str | None = Form(None),
    ) -> StreamingResponse:
        """
        Generate PDF with labels for selected sets.

        Args:
            set_ids: List of set IDs to include in PDF
            use_template: If provided (checkbox checked), overlay labels on
                Avery5160AddressLabels.pdf template
            template: Label template name (e.g., "avery5160", "avery64x30-r")

        Returns:
            StreamingResponse with PDF file

        Raises:
            HTTPException: If no valid sets are selected or invalid template
        """
        # Handle case where no sets are selected
        if not set_ids or len(set_ids) == 0:
            logger.warning("PDF generation attempted with no sets selected")
            raise HTTPException(
                status_code=400, detail="Please select at least one set before generating the PDF."
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
            f"Generating PDF for set_ids: {set_ids}, "
            f"template: {label_template}, use_template: {use_template_bool}"
        )
        all_sets = scryfall_client.fetch_sets()
        filtered = scryfall_client.filter_sets(all_sets)

        # Convert to dict format for PDFGenerator
        selected_sets_data = []
        for s in filtered:
            set_dict = s.to_dict() if isinstance(s, MTGSet) else s
            if set_dict.get("id") in set_ids:
                selected_sets_data.append(set_dict)

        if not selected_sets_data:
            logger.error("No valid sets selected")
            raise HTTPException(status_code=400, detail="No valid sets selected.")

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
            selected_sets_data, template_name=label_template, template_path=template_path
        )
        pdf_buffer = pdf_generator.generate()
        filename = "mtg_labels.pdf" if not use_template_bool else "mtg_labels_with_template.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment;filename={filename}"},
        )

    return app
