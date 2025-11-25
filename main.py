import os
import io
import datetime
import logging
from typing import List, Dict, Optional, Tuple
import xml.etree.ElementTree as ET

import requests
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

from config import (
    SET_TYPES, MINIMUM_SET_SIZE, IGNORED_SETS,
    ABBREVIATION_MAP, MAX_SET_NAME_LENGTH,
    FONT_SIZE_ROW1, FONT_SIZE_ROW2,
    FONT_EB_GARAMOND_BOLD, FONT_SOURCE_SANS_PRO_REGULAR,
    LABEL_TEMPLATES, CURRENT_LABEL_TEMPLATE, SET_SYMBOL_MAX_WIDTH
)

from svglib.svglib import svg2rlg
from reportlab.graphics import renderPDF

# Load template configuration based on CURRENT_LABEL_TEMPLATE.
TEMPLATE = LABEL_TEMPLATES[CURRENT_LABEL_TEMPLATE]

# -----------------------------------------------------------------------------
# Logger Configuration
# -----------------------------------------------------------------------------
logger = logging.getLogger("mtg_labels")
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

# -----------------------------------------------------------------------------
# Register Fonts
# -----------------------------------------------------------------------------
pdfmetrics.registerFont(TTFont("EBGaramondBold", FONT_EB_GARAMOND_BOLD))
pdfmetrics.registerFont(TTFont("SourceSansProRegular", FONT_SOURCE_SANS_PRO_REGULAR))

# -----------------------------------------------------------------------------
# FastAPI Setup
# -----------------------------------------------------------------------------
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# -----------------------------------------------------------------------------
# Scryfall Client for API Interactions
# -----------------------------------------------------------------------------
class ScryfallClient:
    """
    Client to fetch and process Scryfall set data.
    Uses caching and session reuse for improved performance.
    """
    BASE_URL = "https://api.scryfall.com/sets"

    def __init__(self) -> None:
        self.session = requests.Session()
        self.cache: Dict[str, List[dict]] = {}

    def fetch_sets(self) -> List[dict]:
        if "sets" in self.cache:
            logger.debug("Using cached sets")
            return self.cache["sets"]
        logger.info("Fetching sets from Scryfall API")
        try:
            response = self.session.get(self.BASE_URL)
        except requests.RequestException as e:
            logger.error(f"Network error while fetching sets: {e}")
            raise HTTPException(status_code=500, detail="Network error fetching sets from Scryfall.")
        if response.status_code != 200:
            logger.error(f"Failed to fetch sets, status code: {response.status_code}")
            raise HTTPException(status_code=500, detail="Error fetching sets from Scryfall.")
        data = response.json()
        sets = data.get("data", [])
        self.cache["sets"] = sets
        logger.info(f"Fetched {len(sets)} sets")
        return sets

    @staticmethod
    def filter_sets(sets: List[dict]) -> List[dict]:
        filtered = []
        for s in sets:
            set_type = s.get("set_type", "").lower()
            card_count = s.get("card_count", 0)
            code = s.get("code", "").lower()
            if set_type not in SET_TYPES:
                logger.debug(f"Excluding set '{s.get('name')}' due to set_type '{set_type}'")
                continue
            if card_count < MINIMUM_SET_SIZE:
                logger.debug(f"Excluding set '{s.get('name')}' due to card_count {card_count}")
                continue
            if code in IGNORED_SETS:
                logger.debug(f"Excluding set '{s.get('name')}' due to ignored code '{code}'")
                continue
            filtered.append(s)
        logger.info(f"Filtered sets count: {len(filtered)}")
        return filtered

    @staticmethod
    def group_sets(sets: List[dict]) -> Dict[str, List[dict]]:
        groups: Dict[str, List[dict]] = {}
        for s in sets:
            group = s.get("set_type") or "Other"
            group = group.capitalize()
            groups.setdefault(group, []).append(s)
        logger.info(f"Grouped sets into {len(groups)} groups")
        return groups


# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
def abbreviate_set_name(set_name: str) -> str:
    logger.debug(f"Abbreviating set name: {set_name}")
    if set_name in ABBREVIATION_MAP:
        logger.debug("Found in ABBREVIATION_MAP")
        return ABBREVIATION_MAP[set_name]
    if len(set_name) > MAX_SET_NAME_LENGTH:
        logger.debug("Name too long, truncating")
        return set_name[:MAX_SET_NAME_LENGTH - 3] + "..."
    return set_name


def fit_text_to_width(text: str, font_name: str, font_size: float, max_width: float, c: canvas.Canvas) -> str:
    current_text = text
    text_width = c.stringWidth(current_text, font_name, font_size)
    while text_width > max_width and len(current_text) > 0:
        current_text = current_text[:-1]
        text_width = c.stringWidth(current_text + "...", font_name, font_size)
    if current_text != text:
        current_text = current_text + "..."
    return current_text


def get_symbol_file(set_data: dict) -> Optional[str]:
    symbol_url = set_data.get("icon_svg_uri")
    if not symbol_url:
        logger.debug(f"No symbol URL for set '{set_data.get('name')}'")
        return None
    images_dir = os.path.join("static", "images")
    os.makedirs(images_dir, exist_ok=True)
    file_name = f"{set_data.get('id')}.svg"
    file_path = os.path.join(images_dir, file_name)
    if os.path.exists(file_path):
        logger.debug(f"Symbol file already cached: {file_path}")
        return file_path
    logger.info(f"Downloading symbol from {symbol_url} for set '{set_data.get('name')}'")
    try:
        response = requests.get(symbol_url)
    except requests.RequestException as e:
        logger.error(f"Error downloading symbol image: {e}")
        return None
    if response.status_code != 200:
        logger.error(f"Failed to download symbol, status: {response.status_code}")
        return None
    try:
        with open(file_path, "wb") as f:
            f.write(response.content)
    except OSError as e:
        logger.error(f"Error saving symbol image: {e}")
        return None
    logger.info(f"Saved symbol to {file_path}")
    return file_path


def get_svg_intrinsic_dimensions(file_path: str) -> Optional[Tuple[float, float]]:
    try:
        tree = ET.parse(file_path)
    except ET.ParseError as e:
        logger.error(f"Error parsing SVG file {file_path}: {e}")
        return None
    root = tree.getroot()
    viewBox = root.attrib.get("viewBox")
    if viewBox:
        parts = viewBox.strip().split()
        if len(parts) == 4:
            try:
                width = float(parts[2])
                height = float(parts[3])
                logger.debug(f"Parsed viewBox for {file_path}: width={width}, height={height}")
                return width, height
            except ValueError as e:
                logger.error(f"Error converting viewBox dimensions to float for {file_path}: {e}")
                return None
    return None


# -----------------------------------------------------------------------------
# PDF Generation
# -----------------------------------------------------------------------------
class PDFGenerator:
    """
    Generates a PDF file with labels for selected sets,
    using the current label template.
    """

    def __init__(self, selected_sets: List[dict]) -> None:
        self.selected_sets = selected_sets
        self.buffer = io.BytesIO()
        self.canvas = canvas.Canvas(self.buffer, pagesize=(TEMPLATE['page_width'], TEMPLATE['page_height']))
        self.current_label = 0
        self.text_block_height = FONT_SIZE_ROW1 + FONT_SIZE_ROW2 + 4
        self.SYMBOL_AREA_WIDTH = self.text_block_height + 10

    def generate(self) -> io.BytesIO:
        for set_data in self.selected_sets:
            label_index = self.current_label
            row = label_index // TEMPLATE['labels_per_row']
            col = label_index % TEMPLATE['labels_per_row']
            logger.debug(f"Processing label {label_index} at row {row}, col {col}")

            # Calculate label position using template margins and gaps.
            label_x = TEMPLATE['left_margin'] + col * (TEMPLATE['label_width'] + TEMPLATE['horizontal_gap'])
            label_y = TEMPLATE['page_height'] - TEMPLATE['top_margin'] - row * (
                        TEMPLATE['label_height'] + TEMPLATE['vertical_gap']) - TEMPLATE['label_height']

            # Align text to the very top of the label.
            text_x = label_x + TEMPLATE['label_margin_x']
            text_y = label_y + TEMPLATE['label_height'] - TEMPLATE['label_margin_y']

            full_set_name = set_data.get("name", "")
            max_text_width = (label_x + TEMPLATE['label_width'] - TEMPLATE[
                'label_margin_x']) - text_x - self.SYMBOL_AREA_WIDTH
            fitted_name = fit_text_to_width(
                abbreviate_set_name(full_set_name),
                "EBGaramondBold",
                FONT_SIZE_ROW1,
                max_text_width,
                self.canvas
            )

            set_code = set_data.get("code", "").upper()
            release_date_str = ""
            released_at = set_data.get("released_at")
            if released_at:
                try:
                    date_obj = datetime.datetime.strptime(released_at, "%Y-%m-%d")
                    release_date_str = date_obj.strftime("%B %Y")
                except ValueError:
                    release_date_str = released_at
            text_line2 = f"{set_code} - {release_date_str}"

            logger.debug(f"Drawing text for set '{full_set_name}' at ({text_x}, {text_y})")
            self.canvas.setFont("EBGaramondBold", FONT_SIZE_ROW1)
            self.canvas.setFillColorRGB(0, 0, 0)
            self.canvas.drawString(text_x, text_y, fitted_name)

            # Position second text line below the first.
            second_text_y = text_y - FONT_SIZE_ROW1 - 4
            self.canvas.setFont("SourceSansProRegular", FONT_SIZE_ROW2)
            self.canvas.drawString(text_x, second_text_y, text_line2)

            # Draw the set symbol.
            local_file = get_symbol_file(set_data)
            if local_file:
                # For symbol scaling, set target height from the text block.
                target_symbol_height = self.text_block_height
                if local_file.lower().endswith(".svg"):
                    try:
                        drawing = svg2rlg(local_file)
                    except Exception as e:
                        logger.error(f"Error converting SVG to drawing for set '{full_set_name}': {e}")
                        drawing = None
                    if drawing is not None:
                        dimensions = get_svg_intrinsic_dimensions(local_file)
                        if dimensions:
                            intrinsic_width, intrinsic_height = dimensions
                            logger.debug(f"Extracted viewBox dimensions: {intrinsic_width}x{intrinsic_height}")
                        else:
                            try:
                                bounds = drawing.getBounds()
                                intrinsic_width = bounds[2] - bounds[0]
                                intrinsic_height = bounds[3] - bounds[1]
                                logger.debug(f"Extracted bounds dimensions: {intrinsic_width}x{intrinsic_height}")
                            except Exception as e:
                                logger.error(f"Error getting bounds from drawing for set '{full_set_name}': {e}")
                                intrinsic_height = drawing.height
                                intrinsic_width = drawing.width
                                logger.debug(f"Fallback dimensions: {intrinsic_width}x{intrinsic_height}")
                        if intrinsic_height <= 0:
                            intrinsic_height = 1
                        scale_from_height = target_symbol_height / intrinsic_height
                        scale_from_width = SET_SYMBOL_MAX_WIDTH / intrinsic_width
                        scale_factor = min(scale_from_height, scale_from_width)
                        scaled_symbol_height = intrinsic_height * scale_factor
                        scaled_width = intrinsic_width * scale_factor
                        logger.debug(
                            f"Scale factors: height {scale_from_height}, width {scale_from_width}; chosen scale: {scale_factor}, scaled width: {scaled_width}")
                        # Align symbol to the top: set its y so that its top matches the top of the label.
                        symbol_y = label_y + TEMPLATE['label_height'] - scaled_symbol_height
                        symbol_x = label_x + TEMPLATE['label_width'] - TEMPLATE[
                            'label_margin_x'] - self.SYMBOL_AREA_WIDTH + ((self.SYMBOL_AREA_WIDTH - scaled_width) / 2)
                        logger.debug(f"Drawing SVG symbol at ({symbol_x}, {symbol_y})")
                        self.canvas.saveState()
                        self.canvas.translate(symbol_x, symbol_y)
                        self.canvas.scale(scale_factor, scale_factor)
                        try:
                            bounds = drawing.getBounds()
                            self.canvas.translate(-bounds[0], -bounds[1])
                        except Exception as e:
                            logger.error(f"Error translating drawing for set '{full_set_name}': {e}")
                        renderPDF.draw(drawing, self.canvas, 0, 0)
                        self.canvas.restoreState()
                else:
                    try:
                        image_reader = ImageReader(local_file)
                        # For raster images, assume we want a square image scaled to meet the target height and max width.
                        # Here, we simply set the symbol's width to the lesser of target height and SET_SYMBOL_MAX_WIDTH.
                        symbol_width = min(target_symbol_height, SET_SYMBOL_MAX_WIDTH)
                        symbol_height = symbol_width
                        # Align symbol to the top.
                        symbol_y = label_y + TEMPLATE['label_height'] - symbol_height
                        symbol_x = label_x + TEMPLATE['label_width'] - TEMPLATE[
                            'label_margin_x'] - self.SYMBOL_AREA_WIDTH + ((self.SYMBOL_AREA_WIDTH - symbol_width) / 2)
                        logger.debug(
                            f"Drawing raster symbol at ({symbol_x}, {symbol_y}) with size {symbol_width}x{symbol_height}")
                        self.canvas.drawImage(
                            image_reader,
                            symbol_x,
                            symbol_y,
                            width=symbol_width,
                            height=symbol_height,
                            preserveAspectRatio=True,
                            mask='auto'
                        )
                    except Exception as e:
                        logger.error(f"Error drawing raster symbol for set '{full_set_name}': {e}")
            self.current_label += 1
            if self.current_label == (TEMPLATE['labels_per_row'] * TEMPLATE['label_rows']):
                logger.debug("Starting new page")
                self.canvas.showPage()
                self.current_label = 0
        self.canvas.save()
        self.buffer.seek(0)
        logger.info("PDF generation complete")
        return self.buffer


# -----------------------------------------------------------------------------
# Instantiate Scryfall Client and Define Endpoints
# -----------------------------------------------------------------------------
scryfall_client = ScryfallClient()


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    all_sets = scryfall_client.fetch_sets()
    filtered = ScryfallClient.filter_sets(all_sets)
    grouped_sets = ScryfallClient.group_sets(filtered)
    return templates.TemplateResponse("index.html", {"request": request, "grouped_sets": grouped_sets})


@app.get("/api/sets")
async def api_sets():
    all_sets = scryfall_client.fetch_sets()
    filtered = ScryfallClient.filter_sets(all_sets)
    return filtered


@app.post("/generate-pdf")
async def generate_pdf(set_ids: List[str] = Form(...)):
    logger.info(f"Generating PDF for set_ids: {set_ids}")
    all_sets = scryfall_client.fetch_sets()
    selected_sets = [s for s in all_sets if s.get("id") in set_ids]
    if not selected_sets:
        logger.error("No valid sets selected")
        raise HTTPException(status_code=400, detail="No valid sets selected.")
    pdf_generator = PDFGenerator(selected_sets)
    pdf_buffer = pdf_generator.generate()
    filename = "mtg_labels.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment;filename={filename}"}
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
