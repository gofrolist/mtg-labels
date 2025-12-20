"""PDF generation service for MTG Label Generator."""

import datetime
import gc
import io
import time
from collections import OrderedDict
from pathlib import Path
from typing import Any

from pypdf import PdfReader, PdfWriter
from reportlab.graphics import renderPDF
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from svglib.svglib import svg2rlg

from src.config import (
    CURRENT_LABEL_TEMPLATE,
    FONT_EB_GARAMOND_BOLD,
    FONT_SIZE_ROW1,
    FONT_SIZE_ROW2,
    FONT_SOURCE_SANS_PRO_REGULAR,
    LABEL_TEMPLATES,
    SET_SYMBOL_MAX_WIDTH,
    SVG_DRAWING_CACHE_MAX_SIZE,
    logger,
)
from src.services.helpers import (
    abbreviate_set_name,
    fit_text_to_width,
    get_svg_intrinsic_dimensions,
    get_symbol_file,
)

# LRU cache for SVG drawings to avoid re-parsing (memory-efficient)
# Uses OrderedDict for O(1) access and LRU eviction
_svg_drawing_cache: OrderedDict[str, Any] = OrderedDict()
_cache_max_size = SVG_DRAWING_CACHE_MAX_SIZE  # Configurable cache size


def clear_svg_drawing_cache() -> int:
    """Clear the SVG drawing cache to free memory.

    Returns:
        Number of entries cleared
    """
    global _svg_drawing_cache
    count = len(_svg_drawing_cache)
    _svg_drawing_cache.clear()
    logger.info(f"Cleared SVG drawing cache ({count} entries)")
    return count


def get_svg_drawing_cache_size() -> int:
    """Get current size of SVG drawing cache.

    Returns:
        Number of cached entries
    """
    return len(_svg_drawing_cache)


# Register fonts (should be done once at module import)
try:
    pdfmetrics.registerFont(TTFont("EBGaramondBold", FONT_EB_GARAMOND_BOLD))
except Exception:
    logger.warning(f"Could not register font {FONT_EB_GARAMOND_BOLD}")

try:
    pdfmetrics.registerFont(TTFont("SourceSansProRegular", FONT_SOURCE_SANS_PRO_REGULAR))
except Exception:
    logger.warning(f"Could not register font {FONT_SOURCE_SANS_PRO_REGULAR}")


class PDFGenerator:
    """
    Generates a PDF file with labels for selected sets.

    Uses the current label template configuration to layout labels
    on pages with proper spacing and formatting.

    Optimized for memory efficiency and performance with:
    - Lazy loading of SVG symbols
    - Resource cleanup after generation
    - Performance monitoring
    """

    def __init__(
        self,
        selected_sets: list[dict],
        template_name: str | None = None,
        template_path: str | None = None,
        view_mode: str = "sets",
    ) -> None:
        """
        Initialize PDFGenerator with selected sets or card types.

        Args:
            selected_sets: List of set/card type dictionaries to generate labels for
            template_name: Name of label template to use (defaults to CURRENT_LABEL_TEMPLATE)
            template_path: Optional path to template PDF file for debugging overlay
            view_mode: View mode - "sets" or "types" (default: "sets")
        """
        self.selected_sets = selected_sets
        self.view_mode = view_mode
        template_key = template_name or CURRENT_LABEL_TEMPLATE
        if template_key not in LABEL_TEMPLATES:
            logger.warning(
                f"Invalid template '{template_key}', using default '{CURRENT_LABEL_TEMPLATE}'"
            )
            template_key = CURRENT_LABEL_TEMPLATE
        self.template = LABEL_TEMPLATES[template_key]
        self.template_path = template_path
        self.buffer = io.BytesIO()
        self.canvas = canvas.Canvas(
            self.buffer, pagesize=(self.template["page_width"], self.template["page_height"])
        )
        self.current_label = 0
        self.text_block_height = FONT_SIZE_ROW1 + FONT_SIZE_ROW2 + 4
        self.SYMBOL_AREA_WIDTH = self.text_block_height + 10
        # Initialize effective symbol width (will be recalculated in _draw_label for narrow labels)
        self.effective_symbol_width = SET_SYMBOL_MAX_WIDTH

        # Performance metrics
        self.start_time: float | None = None
        self.end_time: float | None = None
        self.labels_processed = 0

    def generate(self) -> io.BytesIO:
        """
        Generate PDF with labels for all selected sets.

        Returns:
            BytesIO buffer containing PDF data
        """
        self.start_time = time.time()

        try:
            labels_per_page = self.template["labels_per_row"] * self.template["label_rows"]

            for set_data in self.selected_sets:
                # Check if we need a new page BEFORE drawing the label
                # After drawing labels_per_page labels (0 to labels_per_page-1),
                # we need a new page for the next label
                if self.current_label == labels_per_page:
                    logger.debug(f"Starting new page after {self.current_label} labels")
                    self.canvas.showPage()
                    self.current_label = 0
                    # Force garbage collection after each page to free memory
                    # Use more aggressive collection for memory-constrained environments
                    collected = gc.collect()
                    if collected > 0:
                        logger.debug(f"Garbage collected {collected} objects after page")

                self._draw_label(set_data)
                self.current_label += 1
                self.labels_processed += 1

                # Periodically clear SVG cache if it's getting large (memory optimization)
                if get_svg_drawing_cache_size() > _cache_max_size * 0.8:
                    logger.debug("SVG cache approaching limit, clearing oldest entries")
                    # Clear half of the cache (keep most recent)
                    items_to_remove = _cache_max_size // 2
                    for _ in range(items_to_remove):
                        if _svg_drawing_cache:
                            _svg_drawing_cache.popitem(last=False)

            self.canvas.save()
            self.buffer.seek(0)

            self.end_time = time.time()
            duration = self.end_time - self.start_time
            logger.info(
                f"PDF generation complete: {self.labels_processed} labels in {duration:.2f}s "
                f"({self.labels_processed / duration:.1f} labels/sec)"
            )

            # If template PDF is provided, merge labels on top of template
            if self.template_path:
                return self._merge_with_template()

            return self.buffer
        finally:
            # Cleanup resources
            self._cleanup()

    def _draw_label(self, set_data: dict) -> None:
        """
        Draw a single label for a set or card type.

        Args:
            set_data: Dictionary containing set or card type data
        """
        # Handle placeholder labels (empty slots to shift starting position)
        if set_data.get("__placeholder__"):
            logger.debug(f"Placeholder label at index {self.current_label}, leaving blank")
            return

        label_index = self.current_label
        row = label_index // self.template["labels_per_row"]
        col = label_index % self.template["labels_per_row"]

        # Calculate label position using template margins and gaps
        label_x = self.template["left_margin"] + col * (
            self.template["label_width"] + self.template["horizontal_gap"]
        )
        # Position from top: top of label = page_height - top_margin - row * (label_height + gap)
        # Then label_y (bottom) = top - label_height
        label_top = (
            self.template["page_height"]
            - self.template["top_margin"]
            - row * (self.template["label_height"] + self.template["vertical_gap"])
        )
        label_y = label_top - self.template["label_height"]

        # Debug logging for first row to diagnose positioning issues
        if row == 0:
            logger.debug(
                f"Row 0 positioning: label_index={label_index}, "
                f"label_top={label_top:.2f}, label_y={label_y:.2f}, "
                f"top_margin={self.template['top_margin']:.2f}, "
                f"page_height={self.template['page_height']:.2f}, "
                f"distance_from_top={self.template['page_height'] - label_top:.2f}"
            )

        # Align text to the very top of the label
        # Use label_top directly to ensure text is inside the label, not on the border
        text_x = label_x + self.template["label_margin_x"]
        text_y = label_top - self.template["label_margin_y"]

        # Calculate available width for text (label width minus margins and symbol space)
        # Symbol is positioned at top-right, so reserve space for max symbol width plus padding
        # For narrow labels (< 60pt), use a smaller symbol to fit text
        if self.template["label_width"] >= 60:
            self.effective_symbol_width = SET_SYMBOL_MAX_WIDTH
            padding = 5
        else:
            # Narrow labels - use smaller symbol (40% of width)
            self.effective_symbol_width = min(
                SET_SYMBOL_MAX_WIDTH, self.template["label_width"] * 0.4
            )
            padding = 3

        symbol_area_start = (
            label_x
            + self.template["label_width"]
            - self.template["label_margin_x"]
            - self.effective_symbol_width
            - padding
        )
        max_text_width = symbol_area_start - text_x

        # Ensure max_text_width is positive
        if max_text_width <= 0:
            logger.warning(
                f"Label too narrow for text: max_width={max_text_width}, "
                f"label_width={self.template['label_width']}, "
                f"symbol_area={self.SYMBOL_AREA_WIDTH}"
            )
            max_text_width = max(10, self.template["label_width"] - self.SYMBOL_AREA_WIDTH - 20)

        if self.view_mode == "types":
            # Draw card type name (e.g., "Creature", "Instant")
            card_type = set_data.get("type", set_data.get("name", ""))
            color = set_data.get("color", "")

            fitted_name = fit_text_to_width(
                card_type,
                "EBGaramondBold",
                FONT_SIZE_ROW1,
                max_text_width,
                self.canvas,
            )

            # Draw color name on second line (optional, or leave empty)
            text_line2 = color if color else ""

            # Fit second line to width as well
            fitted_line2 = fit_text_to_width(
                text_line2, "SourceSansProRegular", FONT_SIZE_ROW2, max_text_width, self.canvas
            )

            logger.debug(
                f"Drawing text for type '{card_type}' (color: {color}) at ({text_x}, {text_y}), "
                f"max_width={max_text_width}"
            )
            self.canvas.setFont("EBGaramondBold", FONT_SIZE_ROW1)
            self.canvas.setFillColorRGB(0, 0, 0)
            self.canvas.drawString(text_x, text_y, fitted_name)

            # Position second text line below the first (if color is shown)
            if fitted_line2:
                second_text_y = text_y - FONT_SIZE_ROW1 - 4
                self.canvas.setFont("SourceSansProRegular", FONT_SIZE_ROW2)
                self.canvas.drawString(text_x, second_text_y, fitted_line2)

            # Draw mana symbol for the color
            mana_symbol_file = self._get_mana_symbol_file(color)
            if mana_symbol_file:
                self._draw_symbol(mana_symbol_file, label_x, label_y, f"{color} {card_type}")
        else:
            # Draw set name
            full_set_name = set_data.get("name", "")
            fitted_name = fit_text_to_width(
                abbreviate_set_name(full_set_name),
                "EBGaramondBold",
                FONT_SIZE_ROW1,
                max_text_width,
                self.canvas,
            )

            # Draw set code and release date
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

            # Fit second line to width as well
            fitted_line2 = fit_text_to_width(
                text_line2, "SourceSansProRegular", FONT_SIZE_ROW2, max_text_width, self.canvas
            )

            logger.debug(
                f"Drawing text for set '{full_set_name}' at ({text_x}, {text_y}), "
                f"max_width={max_text_width}"
            )
            self.canvas.setFont("EBGaramondBold", FONT_SIZE_ROW1)
            self.canvas.setFillColorRGB(0, 0, 0)
            self.canvas.drawString(text_x, text_y, fitted_name)

            # Position second text line below the first
            second_text_y = text_y - FONT_SIZE_ROW1 - 4
            self.canvas.setFont("SourceSansProRegular", FONT_SIZE_ROW2)
            self.canvas.drawString(text_x, second_text_y, fitted_line2)

            # Draw the set symbol (lazy loading - only load if needed)
            local_file = get_symbol_file(set_data)
            if local_file:
                self._draw_symbol(local_file, label_x, label_y, full_set_name)

    def _get_mana_symbol_file(self, color: str) -> str | None:
        """
        Get mana symbol file path for a color.

        Uses Scryfall's symbology API to get the correct SVG URI.

        Args:
            color: Color name (White, Blue, Black, Red, Green, Multicolor, Colorless)

        Returns:
            Path to mana symbol SVG file, or None if unavailable
        """
        import time

        import requests

        from src.cache.cache_manager import get_cache_manager
        from src.config import SCRYFALL_API_RATE_LIMIT_DELAY, logger

        # Map color names to Scryfall mana symbol codes
        # These are the symbol codes used in mana costs
        color_to_symbol = {
            "White": "{W}",
            "Blue": "{U}",
            "Black": "{B}",
            "Red": "{R}",
            "Green": "{G}",
            "Multicolor": "{PW}",  # Use PW symbol for multicolor
            "Colorless": "{C}",
        }

        symbol_code = color_to_symbol.get(color)
        if not symbol_code:
            return None

        cache_manager = get_cache_manager()
        # Use cache key based on color name and symbol code to ensure correct symbol
        # This ensures cache invalidation when symbol changes (e.g., Multicolor: {G} -> {PW})
        symbol_id = f"mana_{color.lower()}_{symbol_code.replace('{', '').replace('}', '')}"

        # Try to get from cache
        cached_path = cache_manager.get_symbol(symbol_id)
        if cached_path:
            logger.debug(f"Mana symbol file found in cache: {cached_path}")
            return cached_path

        # Get symbol URI from Scryfall symbology API
        symbol_url = self._get_mana_symbol_uri_from_api(symbol_code, color)
        if not symbol_url:
            logger.warning(f"Could not get symbol URI for {color} ({symbol_code})")
            return None

        logger.info(f"Downloading mana symbol from {symbol_url} for color '{color}'")

        try:
            time.sleep(SCRYFALL_API_RATE_LIMIT_DELAY)
            response = requests.get(symbol_url, timeout=30)
        except requests.RequestException as e:
            logger.error(f"Error downloading mana symbol: {e}")
            return None

        if response.status_code != 200:
            logger.error(f"Failed to download mana symbol, status: {response.status_code}")
            return None

        # Save to cache
        cached_path = cache_manager.save_symbol(symbol_id, response.content)
        if cached_path:
            logger.info(f"Saved mana symbol to cache: {cached_path}")
            return cached_path
        else:
            logger.error("Failed to save mana symbol to cache")
            return None

    def _get_mana_symbol_uri_from_api(self, symbol_code: str, color: str) -> str | None:
        """
        Get mana symbol SVG URI from Scryfall symbology API.

        Uses the official Scryfall symbology API as documented at:
        https://scryfall.com/docs/api/card-symbols

        Args:
            symbol_code: Symbol code (e.g., "{W}", "{U}", "{B}")
            color: Color name for logging

        Returns:
            SVG URI string or None if not found
        """
        import time

        import requests

        from src.config import SCRYFALL_API_RATE_LIMIT_DELAY, SCRYFALL_API_TIMEOUT, logger

        # Cache the symbology data to avoid repeated API calls
        if not hasattr(self, "_symbology_cache"):
            self._symbology_cache: dict[str, str] | None = None

        # Fetch symbology data if not cached
        if self._symbology_cache is None:
            try:
                time.sleep(SCRYFALL_API_RATE_LIMIT_DELAY)
                response = requests.get(
                    "https://api.scryfall.com/symbology", timeout=SCRYFALL_API_TIMEOUT
                )
                if response.status_code == 200:
                    data = response.json()
                    # Build a cache of symbol -> svg_uri
                    # According to Scryfall docs (https://scryfall.com/docs/api/card-symbols):
                    # - object: "card_symbol"
                    # - symbol: plaintext symbol (e.g., "{W}")
                    # - svg_uri: URI to SVG image (nullable)
                    self._symbology_cache = {}
                    for symbol_obj in data.get("data", []):
                        # Validate object type
                        if symbol_obj.get("object") != "card_symbol":
                            continue
                        symbol_text = symbol_obj.get("symbol", "")
                        svg_uri = symbol_obj.get("svg_uri")
                        # svg_uri is nullable, so only cache if it exists
                        if symbol_text and svg_uri:
                            self._symbology_cache[symbol_text] = svg_uri
                    logger.debug(f"Cached {len(self._symbology_cache)} symbols from symbology API")
                else:
                    logger.warning(f"Failed to fetch symbology API, status: {response.status_code}")
                    return None
            except Exception as e:
                logger.error(f"Error fetching symbology API: {e}")
                return None

        # Look up the symbol
        if self._symbology_cache and symbol_code in self._symbology_cache:
            return self._symbology_cache[symbol_code]

        # Special handling for multicolor - use PW symbol
        if color == "Multicolor":
            # Try PW symbol (as requested)
            if self._symbology_cache and "{PW}" in self._symbology_cache:
                logger.debug("Using {PW} symbol for multicolor")
                return self._symbology_cache["{PW}"]
            # If PW symbol is not available, log warning and return None
            logger.warning("PW symbol not found in symbology cache for multicolor")

        logger.warning(f"Symbol code '{symbol_code}' not found in symbology cache")
        return None

    def _draw_symbol(self, local_file: str, label_x: float, label_y: float, set_name: str) -> None:
        """
        Draw set symbol on label.

        Args:
            local_file: Path to symbol file
            label_x: X position of label
            label_y: Y position of label
            set_name: Name of set for logging
        """
        target_symbol_height = self.text_block_height

        if local_file.lower().endswith(".svg"):
            self._draw_svg_symbol(local_file, label_x, label_y, target_symbol_height, set_name)
        else:
            self._draw_raster_symbol(local_file, label_x, label_y, target_symbol_height)

    def _draw_svg_symbol(
        self, local_file: str, label_x: float, label_y: float, target_height: float, set_name: str
    ) -> None:
        """
        Draw SVG symbol on label with lazy loading and caching.

        Args:
            local_file: Path to SVG file
            label_x: X position of label
            label_y: Y position of label
            target_height: Target height for symbol
            set_name: Name of set for logging
        """
        # Use cached drawing if available (lazy loading optimization)
        drawing = self._get_cached_svg_drawing(local_file)
        if drawing is None:
            try:
                drawing = svg2rlg(local_file)
                if drawing is not None:
                    self._cache_svg_drawing(local_file, drawing)
            except Exception as e:
                logger.error(f"Error converting SVG to drawing for set '{set_name}': {e}")
                return

        if drawing is None:
            return

        # Get dimensions
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
                logger.error(f"Error getting bounds from drawing for set '{set_name}': {e}")
                intrinsic_height = drawing.height
                intrinsic_width = drawing.width
                logger.debug(f"Fallback dimensions: {intrinsic_width}x{intrinsic_height}")

        if intrinsic_height <= 0:
            intrinsic_height = 1

        # Calculate scale
        # Use effective symbol width for narrow labels
        effective_symbol_width = getattr(self, "effective_symbol_width", SET_SYMBOL_MAX_WIDTH)
        scale_from_height = target_height / intrinsic_height
        scale_from_width = effective_symbol_width / intrinsic_width
        scale_factor = min(scale_from_height, scale_from_width)
        scaled_symbol_height = intrinsic_height * scale_factor
        scaled_width = intrinsic_width * scale_factor

        logger.debug(
            f"Scale factors: height {scale_from_height}, width {scale_from_width}; "
            f"chosen scale: {scale_factor}, scaled width: {scaled_width}"
        )

        # Position symbol in top-right corner
        # Y: align top of symbol with top of first text line
        # Calculate label_top from label_y, then text_y same way as in _draw_label
        # label_top = label_y + label_height (since label_y is bottom of label)
        label_top = label_y + self.template["label_height"]
        text_y_pos = label_top - self.template["label_margin_y"]
        text_top_y = text_y_pos + FONT_SIZE_ROW1
        symbol_y = text_top_y - scaled_symbol_height
        # X: right edge of label minus margin minus symbol width
        symbol_x = (
            label_x + self.template["label_width"] - self.template["label_margin_x"] - scaled_width
        )

        logger.debug(f"Drawing SVG symbol at ({symbol_x}, {symbol_y})")
        self.canvas.saveState()
        self.canvas.translate(symbol_x, symbol_y)
        self.canvas.scale(scale_factor, scale_factor)

        try:
            bounds = drawing.getBounds()
            self.canvas.translate(-bounds[0], -bounds[1])
        except Exception as e:
            logger.error(f"Error translating drawing for set '{set_name}': {e}")

        renderPDF.draw(drawing, self.canvas, 0, 0)
        self.canvas.restoreState()

    def _draw_raster_symbol(
        self, local_file: str, label_x: float, label_y: float, target_height: float
    ) -> None:
        """
        Draw raster image symbol on label.

        Args:
            local_file: Path to image file
            label_x: X position of label
            label_y: Y position of label
            target_height: Target height for symbol
        """
        try:
            image_reader = ImageReader(local_file)
            # Use effective symbol width for narrow labels
            effective_symbol_width = getattr(self, "effective_symbol_width", SET_SYMBOL_MAX_WIDTH)
            symbol_width = min(target_height, effective_symbol_width)
            symbol_height = symbol_width

            # Position symbol in top-right corner
            # Y: align top of symbol with top of first text line
            # Calculate label_top from label_y, then text_y same way as in _draw_label
            label_top = label_y + self.template["label_height"]
            text_y_pos = label_top - self.template["label_margin_y"]
            text_top_y = text_y_pos + FONT_SIZE_ROW1
            symbol_y = text_top_y - symbol_height
            # X: right edge of label minus margin minus symbol width
            symbol_x = (
                label_x
                + self.template["label_width"]
                - self.template["label_margin_x"]
                - symbol_width
            )

            logger.debug(
                f"Drawing raster symbol at ({symbol_x}, {symbol_y}) "
                f"with size {symbol_width}x{symbol_height}"
            )

            self.canvas.drawImage(
                image_reader,
                symbol_x,
                symbol_y,
                width=symbol_width,
                height=symbol_height,
                preserveAspectRatio=True,
                mask="auto",
            )
            # ImageReader handles cleanup automatically
        except Exception as e:
            logger.error(f"Error drawing raster symbol: {e}")

    def _get_cached_svg_drawing(self, file_path: str):
        """Get cached SVG drawing or None if not cached.

        Uses LRU cache: moves accessed item to end (most recently used).

        Args:
            file_path: Path to SVG file

        Returns:
            Cached drawing object or None
        """
        if file_path in _svg_drawing_cache:
            # Move to end (most recently used) for LRU behavior
            _svg_drawing_cache.move_to_end(file_path)
            return _svg_drawing_cache[file_path]
        return None

    def _cache_svg_drawing(self, file_path: str, drawing: Any) -> None:
        """Cache SVG drawing for reuse with LRU eviction.

        Args:
            file_path: Path to SVG file
            drawing: Drawing object to cache
        """
        # Limit cache size to prevent memory issues
        if len(_svg_drawing_cache) >= _cache_max_size:
            # Remove oldest entry (LRU eviction - removes least recently used)
            _svg_drawing_cache.popitem(last=False)

        # Add new entry at end (most recently used)
        _svg_drawing_cache[file_path] = drawing

    def _merge_with_template(self) -> io.BytesIO:
        """
        Merge generated labels PDF with template PDF for debugging.

        The template PDF is used as the background, and labels are overlaid on top.

        Returns:
            BytesIO buffer containing merged PDF data
        """
        if self.template_path is None:
            self.buffer.seek(0)
            return self.buffer

        try:
            template_file = Path(self.template_path)
            if not template_file.exists():
                logger.warning(
                    f"Template PDF not found: {self.template_path}, "
                    "returning labels without template"
                )
                self.buffer.seek(0)
                return self.buffer

            logger.info(f"Merging labels with template PDF: {self.template_path}")

            # Read the template PDF
            template_reader = PdfReader(str(template_file))
            labels_reader = PdfReader(self.buffer)

            # Verify page dimensions match
            if len(template_reader.pages) > 0 and len(labels_reader.pages) > 0:
                template_page = template_reader.pages[0]
                labels_page = labels_reader.pages[0]
                template_mediabox = template_page.mediabox
                labels_mediabox = labels_page.mediabox

                template_width = float(template_mediabox.width)
                template_height = float(template_mediabox.height)
                labels_width = float(labels_mediabox.width)
                labels_height = float(labels_mediabox.height)

                logger.debug(
                    f"Template dimensions: {template_width}x{template_height}, "
                    f"Labels dimensions: {labels_width}x{labels_height}"
                )

                # Warn if dimensions don't match
                width_diff = abs(template_width - labels_width)
                height_diff = abs(template_height - labels_height)
                if width_diff > 1 or height_diff > 1:
                    logger.warning(
                        f"Page dimensions mismatch: template ({template_width}x{template_height}) "
                        f"vs labels ({labels_width}x{labels_height}). "
                        "Labels may not align correctly."
                    )

            # Create output PDF writer
            output_writer = PdfWriter()

            # Get number of pages needed
            labels_per_page = self.template["labels_per_row"] * self.template["label_rows"]
            total_pages_needed = (len(self.selected_sets) + labels_per_page - 1) // labels_per_page

            # Merge each page
            for page_num in range(int(total_pages_needed)):
                # Get corresponding labels page first
                if page_num >= len(labels_reader.pages):
                    # No more label pages, just use template
                    if page_num < len(template_reader.pages):
                        template_page = template_reader.pages[page_num]
                    elif len(template_reader.pages) > 0:
                        # Clone the last template page for reuse
                        temp_writer = PdfWriter()
                        temp_writer.add_page(template_reader.pages[-1])
                        temp_buffer = io.BytesIO()
                        temp_writer.write(temp_buffer)
                        temp_buffer.seek(0)
                        temp_reader = PdfReader(temp_buffer)
                        template_page = temp_reader.pages[0]
                    else:
                        logger.warning("Template PDF has no pages, skipping merge")
                        self.buffer.seek(0)
                        return self.buffer
                    output_writer.add_page(template_page)
                    continue

                labels_page = labels_reader.pages[page_num]

                # Use template page if available, otherwise create blank page
                if page_num < len(template_reader.pages):
                    source_template_page = template_reader.pages[page_num]
                else:
                    # If template has fewer pages, use the last template page
                    if len(template_reader.pages) > 0:
                        source_template_page = template_reader.pages[-1]
                    else:
                        logger.warning("Template PDF has no pages, skipping merge")
                        self.buffer.seek(0)
                        return self.buffer

                # Create a copy of the template page to avoid modifying the original
                # This is critical when reusing the same template page for multiple pages
                # We clone by writing to a temp buffer and reading back
                temp_writer = PdfWriter()
                temp_writer.add_page(source_template_page)
                temp_buffer = io.BytesIO()
                temp_writer.write(temp_buffer)
                temp_buffer.seek(0)
                temp_reader = PdfReader(temp_buffer)
                template_page = temp_reader.pages[0]

                # Merge: template as background, labels on top
                # Use expand=False to prevent scaling issues
                template_page.merge_page(labels_page, expand=False)
                output_writer.add_page(template_page)

            # Write merged PDF to buffer
            merged_buffer = io.BytesIO()
            output_writer.write(merged_buffer)
            merged_buffer.seek(0)

            logger.info(f"Successfully merged {total_pages_needed} pages with template")
            return merged_buffer

        except Exception as e:
            logger.error(f"Error merging with template: {e}", exc_info=True)
            # Return labels without template on error
            self.buffer.seek(0)
            return self.buffer

    def _cleanup(self) -> None:
        """Clean up resources after PDF generation.

        Note: Does not close the buffer as it may still be in use by StreamingResponse.
        The buffer will be cleaned up automatically when no longer referenced.
        """
        # Clear canvas reference
        if hasattr(self, "canvas"):
            try:
                # Canvas is already saved, just clear reference
                del self.canvas
            except Exception:
                pass

        # Don't close buffer here - it's returned and may still be used by StreamingResponse
        # The buffer will be cleaned up automatically when no longer referenced
        # Just clear the reference to help with garbage collection
        if hasattr(self, "buffer"):
            try:
                # Don't close - let it be garbage collected naturally
                del self.buffer
            except Exception:
                pass

        # Force garbage collection with multiple generations for better cleanup
        collected = gc.collect()
        if collected > 0:
            logger.debug(f"Garbage collected {collected} objects during cleanup")
        # Run collection again to catch objects with finalizers
        gc.collect()

        logger.debug("PDFGenerator resources cleaned up")
