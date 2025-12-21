"""Helper functions for MTG Label Generator."""

import time
import xml.etree.ElementTree as ET

import requests
from reportlab.pdfgen import canvas

from src.cache.cache_manager import get_cache_manager
from src.config import (
    ABBREVIATION_MAP,
    MAX_SET_NAME_LENGTH,
    SCRYFALL_API_RATE_LIMIT_DELAY,
    logger,
)


def abbreviate_set_name(set_name: str) -> str:
    """
    Abbreviate set name if it's in the abbreviation map or too long.

    Args:
        set_name: Full set name to abbreviate

    Returns:
        Abbreviated or truncated set name
    """
    logger.debug(f"Abbreviating set name: {set_name}")

    if set_name in ABBREVIATION_MAP:
        logger.debug("Found in ABBREVIATION_MAP")
        return ABBREVIATION_MAP[set_name]

    if len(set_name) > MAX_SET_NAME_LENGTH:
        logger.debug("Name too long, truncating")
        return set_name[: MAX_SET_NAME_LENGTH - 3] + "..."

    return set_name


def fit_text_to_width(
    text: str, font_name: str, font_size: float, max_width: float, c: canvas.Canvas
) -> str:
    """
    Fit text to a maximum width by truncating if necessary.

    Args:
        text: Text to fit
        font_name: Font name for width calculation
        font_size: Font size for width calculation
        max_width: Maximum width in points
        c: Canvas instance for width calculation

    Returns:
        Text truncated to fit width, with "..." appended if truncated
    """
    current_text = text
    text_width = c.stringWidth(current_text, font_name, font_size)

    while text_width > max_width and len(current_text) > 0:
        current_text = current_text[:-1]
        text_width = c.stringWidth(current_text + "...", font_name, font_size)

    if current_text != text:
        current_text = current_text + "..."

    return current_text


def get_symbol_file(set_data: dict) -> str | None:
    """
    Get local file path for set symbol, downloading if necessary.

    Uses CacheManager for symbol caching with validation.

    Args:
        set_data: Dictionary containing set data with 'icon_svg_uri' and 'id'

    Returns:
        Local file path to symbol file, or None if unavailable
    """
    symbol_url = set_data.get("icon_svg_uri")
    if not symbol_url:
        logger.debug(f"No symbol URL for set '{set_data.get('name')}'")
        return None

    set_id = set_data.get("id")
    if not set_id:
        logger.warning("Set data missing 'id' field")
        return None

    cache_manager = get_cache_manager()

    # Try to get from cache
    cached_path = cache_manager.get_symbol(set_id)
    if cached_path:
        logger.debug(f"Symbol file found in cache: {cached_path}")
        return cached_path

    # Download symbol
    logger.info(f"Downloading symbol from {symbol_url} for set '{set_data.get('name')}'")

    try:
        # Apply rate limiting for symbol downloads
        # Note: *.scryfall.io domains don't have rate limits, but we apply it for consistency
        time.sleep(SCRYFALL_API_RATE_LIMIT_DELAY)

        response = requests.get(symbol_url, timeout=30)
    except requests.RequestException as e:
        logger.error(f"Error downloading symbol image: {e}")
        return None

    if response.status_code != 200:
        logger.error(f"Failed to download symbol, status: {response.status_code}")
        return None

    # Save to cache
    cached_path = cache_manager.save_symbol(set_id, response.content)
    if cached_path:
        logger.info(f"Saved symbol to cache: {cached_path}")
        return cached_path
    else:
        logger.error("Failed to save symbol to cache")
        return None


def get_svg_intrinsic_dimensions(file_path: str) -> tuple[float, float] | None:
    """
    Extract intrinsic dimensions from SVG file's viewBox attribute.

    Args:
        file_path: Path to SVG file

    Returns:
        Tuple of (width, height) if viewBox found, None otherwise
    """
    try:
        tree = ET.parse(file_path)
    except (ET.ParseError, FileNotFoundError, OSError) as e:
        logger.error(f"Error parsing SVG file {file_path}: {e}")
        return None

    root = tree.getroot()
    view_box = root.attrib.get("viewBox")

    if view_box:
        parts = view_box.strip().split()
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
