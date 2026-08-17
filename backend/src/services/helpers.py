"""Helper functions for MTG Label Generator."""

import hashlib
import time
from pathlib import Path
from typing import NamedTuple

import defusedxml.ElementTree as DefusedET
import requests
from reportlab.pdfgen import canvas

from src.cache.cache_manager import get_cache_manager
from src.config import (
    ABBREVIATION_MAP,
    LETTER_FONT_SCALE,
    LETTER_MAX_FONT_SIZE,
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


def letter_font_size(label_height: float) -> float:
    """Font size (points) for the alphabet divider letter on a label.

    Scales with the label height so the letter stays large on tall labels and
    shrinks on short ones, capped at ``LETTER_MAX_FONT_SIZE``.

    Args:
        label_height: Label height in points.

    Returns:
        Font size in points.
    """
    return min(label_height * LETTER_FONT_SCALE, LETTER_MAX_FONT_SIZE)


def letter_baseline_y(
    label_top: float,
    label_margin_y: float,
    row1_font_size: float,
    letter_size: float,
    cap_height_ratio: float,
) -> float:
    """Baseline Y for a top-aligned alphabet divider letter.

    Positions the letter so its cap top lines up with the cap top of the set
    name's first text line. This anchors the big letter to the top of the
    label instead of vertically centering it.

    Args:
        label_top: Y coordinate of the top edge of the label.
        label_margin_y: Internal top margin; the set name baseline sits this
            far below ``label_top``.
        row1_font_size: Font size (points) of the set name's first line.
        letter_size: Font size (points) of the divider letter.
        cap_height_ratio: Cap height as a fraction of the font size (em).

    Returns:
        Baseline Y (points) for the divider letter.
    """
    row1_baseline = label_top - label_margin_y
    row1_cap_top = row1_baseline + cap_height_ratio * row1_font_size
    return row1_cap_top - cap_height_ratio * letter_size


class SymbolFetch(NamedTuple):
    """Result of fetching a symbol: its cached path and how it got there.

    ``outcome`` is one of ``"cached"`` (version already current),
    ``"revalidated"`` (version bumped but the server confirmed the bytes with a
    304), ``"downloaded"``, or ``"failed"``.
    """

    path: str | None
    outcome: str


def _content_etag(path: str) -> str | None:
    """Derive the ETag Scryfall would serve for an already-cached file.

    Their CDN's ETag is the MD5 of the file content, so hashing the cached bytes
    reproduces it exactly. That lets a file cached before validators were
    recorded still be revalidated with ``If-None-Match``: matching bytes answer
    304, genuinely changed artwork answers 200 and is downloaded. If the CDN ever
    stopped deriving ETags this way the header simply would not match, and the
    request degrades to a normal download.
    """
    try:
        digest = hashlib.md5(Path(path).read_bytes(), usedforsecurity=False).hexdigest()
    except OSError as e:
        logger.warning(f"Could not hash cached symbol {path}: {e}")
        return None
    return f'"{digest}"'


def fetch_symbol(symbol_id: str, symbol_url: str, description: str) -> SymbolFetch:
    """
    Fetch a symbol SVG into the local cache, revalidating when possible.

    Checks the file cache first. When the cached file exists but the icon
    version has moved on, the current copy is revalidated with a conditional
    request rather than downloaded again — Scryfall rolls the version query for
    every set at once (a periodic cache-buster), so a roll otherwise means
    re-downloading roughly a thousand unchanged icons.

    Args:
        symbol_id: Cache key for the symbol
        symbol_url: URL to download the symbol from
        description: Human-readable description for logging

    Returns:
        The cached path and the outcome (see :class:`SymbolFetch`).
    """
    cache_manager = get_cache_manager()

    # Version-aware lookup: the file keeps a stable name ({id}.svg) but the
    # manifest records Scryfall's icon version, so a changed icon URL misses and
    # re-downloads instead of serving a stale preview-era placeholder forever.
    version = cache_manager.symbol_version(symbol_url)

    cached_path = cache_manager.get_symbol(symbol_id, version)
    if cached_path:
        logger.debug(f"Symbol file found in cache: {cached_path}")
        return SymbolFetch(cached_path, "cached")

    # Validate URL is from Scryfall to prevent SSRF
    if not symbol_url.startswith("https://svgs.scryfall.io/"):
        logger.warning(f"Rejected non-Scryfall symbol URL: {symbol_url}")
        return SymbolFetch(None, "failed")

    # A copy on disk under an older version can be confirmed with a conditional
    # request: 304 means the bytes are still current and only the version moved.
    stale_path = cache_manager.get_symbol(symbol_id)
    headers: dict[str, str] = {}
    if stale_path:
        etag, last_modified = cache_manager.symbol_validators(symbol_id)
        etag = etag or _content_etag(stale_path)
        if etag:
            headers["If-None-Match"] = etag
        if last_modified:
            headers["If-Modified-Since"] = last_modified

    if headers:
        logger.debug(f"Revalidating symbol {symbol_url} for {description}")
    else:
        logger.info(f"Downloading symbol from {symbol_url} for {description}")

    try:
        time.sleep(SCRYFALL_API_RATE_LIMIT_DELAY)
        response = requests.get(symbol_url, timeout=30, headers=headers)
    except requests.RequestException as e:
        logger.error(f"Error downloading symbol: {e}")
        return SymbolFetch(None, "failed")

    # 304: the cached bytes are current; record the version so the next boot is
    # a plain cache hit, and keep the validators the server just confirmed.
    if response.status_code == 304 and stale_path:
        cache_manager.record_symbol_version(
            symbol_id,
            version,
            response.headers.get("ETag"),
            response.headers.get("Last-Modified"),
        )
        logger.debug(f"Symbol unchanged, revalidated from cache: {stale_path}")
        return SymbolFetch(stale_path, "revalidated")

    if response.status_code != 200:
        logger.error(f"Failed to download symbol, status: {response.status_code}")
        return SymbolFetch(None, "failed")

    # Reject excessively large files (max 1MB for an SVG symbol)
    max_size = 1024 * 1024
    if len(response.content) > max_size:
        logger.warning(f"Symbol file too large ({len(response.content)} bytes), rejecting")
        return SymbolFetch(None, "failed")

    # Validate SVG content before saving
    if not response.content.lstrip().startswith((b"<svg", b"<?xml")):
        logger.warning("Downloaded content is not valid SVG, rejecting")
        return SymbolFetch(None, "failed")

    cached_path = cache_manager.save_symbol(
        symbol_id,
        response.content,
        version,
        response.headers.get("ETag"),
        response.headers.get("Last-Modified"),
    )
    if cached_path:
        logger.info(f"Saved symbol to cache: {cached_path}")
        return SymbolFetch(cached_path, "downloaded")
    logger.error("Failed to save symbol to cache")
    return SymbolFetch(None, "failed")


def download_and_cache_symbol(symbol_id: str, symbol_url: str, description: str) -> str | None:
    """
    Download a symbol SVG and cache it locally.

    Thin wrapper over :func:`fetch_symbol` for callers that only need the path.

    Args:
        symbol_id: Cache key for the symbol
        symbol_url: URL to download the symbol from
        description: Human-readable description for logging

    Returns:
        Local file path to cached symbol, or None if unavailable
    """
    return fetch_symbol(symbol_id, symbol_url, description).path


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

    return download_and_cache_symbol(set_id, symbol_url, f"set '{set_data.get('name')}'")


def get_svg_intrinsic_dimensions(file_path: str) -> tuple[float, float] | None:
    """
    Extract intrinsic dimensions from SVG file's viewBox attribute.

    Args:
        file_path: Path to SVG file

    Returns:
        Tuple of (width, height) if viewBox found, None otherwise
    """
    try:
        tree = DefusedET.parse(file_path)
    except (DefusedET.ParseError, FileNotFoundError, OSError) as e:
        logger.error(f"Error parsing SVG file {file_path}: {e}")
        return None

    root = tree.getroot()
    if root is None:
        return None
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
