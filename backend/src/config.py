"""Centralized configuration management for MTG Label Generator.

This module provides configuration management with environment variable support,
logging setup, and application settings.
"""

import logging
import os
from pathlib import Path

# Determine backend directory (where this config file is located)
# config.py is in backend/src/, so backend root is 2 levels up
_BACKEND_ROOT = Path(__file__).parent.parent.resolve()
_PROJECT_ROOT = _BACKEND_ROOT.parent.resolve()

# --- CORS Configuration ---
# Default CORS origins for development and production
# Includes localhost for development and Vercel frontend URL for production
# Override with CORS_ORIGINS environment variable if needed
_DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173,"
    "http://localhost:3000,"
    "http://localhost:8080,"
    "https://mtg-labels.vercel.app"
)
CORS_ORIGINS_STR = os.getenv("CORS_ORIGINS", _DEFAULT_CORS_ORIGINS)
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_STR.split(",") if origin.strip()]

# Note: FastAPI CORSMiddleware doesn't support wildcard patterns
# To add additional origins, set CORS_ORIGINS environment variable with comma-separated URLs

# --- Frontend Redirect Configuration ---
# URL to redirect root path (/) to when frontend is hosted separately (e.g., on Vercel)
# Set this to your Vercel deployment URL in production
VERCEL_FRONTEND_URL = os.getenv("VERCEL_FRONTEND_URL", "https://mtg-labels.vercel.app")

# --- Set Filtering Configuration ---
SET_TYPES = (
    "core",  # A yearly Magic core set (Tenth Edition, etc)
    "expansion",  # A rotational expansion set in a block (Zendikar, etc)
    "masters",  # A reprint set that contains no new cards (Modern Masters, etc)
    "eternal",  # A set of new cards that only get added to high-power formats
    "alchemy",  # An Arena set designed for Alchemy
    "masterpiece",  # Masterpiece Series premium foil cards
    # "arsenal",  # A Commander-oriented gift set
    "from_the_vault",  # From the Vault gift sets
    # "spellbook",  # Spellbook series gift sets
    "premium_deck",  # Premium Deck Series decks
    "duel_deck",  # Duel Decks
    "draft_innovation",  # Special draft sets, like Conspiracy and Battlebond
    # "treasure_chest",  # Magic Online treasure chest prize sets
    "commander",  # Commander preconstructed decks
    "planechase",  # Planechase sets
    # "archenemy",  # Archenemy sets
    # "vanguard",  # Vanguard card sets
    "funny",  # A funny un-set or set with funny promos (Unglued, Happy Holidays, etc)
    "starter",  # A starter/introductory set (Portal, etc)
    "box",  # A gift box set
    # "promo",  # A set that contains purely promotional cards
    # "token",  # A set made up of tokens and emblems
    # "memorabilia",  # A set made up of gold-bordered, oversize, or trophy cards that are not legal
    "minigame",  # A set that contains minigame card inserts from booster packs
)
MINIMUM_SET_SIZE = int(os.getenv("MINIMUM_SET_SIZE", "10"))
IGNORED_SETS = (
    "cmb1",  # Mystery Booster Playtest Cards
    "amh1",  # Modern Horizon Art Series
    "cmb2",  # Mystery Booster Playtest Cards Part Deux
    "fbb",  # Foreign Black Border
    "sum",  # Summer Magic / Edgar
    "4bb",  # Fourth Edition Foreign Black Border
    "bchr",  # Chronicles Foreign Black Border
    "rin",  # Rinascimento
    "ren",  # Renaissance
    "rqs",  # Rivals Quick Start Set
    "itp",  # Introductory Two-Player Set
    "sir",  # Shadows over Innistrad Remastered
    "sis",  # Shadows of the Past
    "cst",  # Coldsnap Theme Decks
)

# --- Abbreviation Mapping ---
ABBREVIATION_MAP = {
    "Adventures in the Forgotten Realms Minigames": "Forgotten Realms Minigames",
    "Adventures in the Forgotten Realms": "Forgotten Realms",
    "Angels: They're Just Like Us but Cooler and with Wings": "Angels: They're Just Like Us",
    "Archenemy: Nicol Bolas Schemes": "Archenemy: Bolas Schemes",
    "Commander Anthology Volume II": "Commander Anthology II",
    "Commander Legends: Battle for Baldur's Gate": "CMDR Legends: Baldur's Gate",
    "Crimson Vow Commander": "CMDR Crimson Vow",
    "Dominaria United Commander": "CMDR Dominaria United",
    "Duel Decks Anthology: Divine vs. Demonic": "DDA: Divine vs. Demonic",
    "Duel Decks Anthology: Elves vs. Goblins": "DDA: Elves vs. Goblins",
    "Duel Decks Anthology: Garruk vs. Liliana": "DDA: Garruk vs. Liliana",
    "Duel Decks Anthology: Jace vs. Chandra": "DDA: Jace vs. Chandra",
    "Duel Decks: Ajani vs. Nicol Bolas": "DD: Ajani vs. Nicol Bolas",
    "Duel Decks: Blessed vs. Cursed": "DD: Blessed vs. Cursed",
    "Duel Decks: Divine vs. Demonic": "DD: Divine vs. Demonic",
    "Duel Decks: Elspeth vs. Kiora": "DD: Elspeth vs. Kiora",
    "Duel Decks: Elspeth vs. Tezzeret": "DD: Elspeth vs. Tezzeret",
    "Duel Decks: Elves vs. Goblins": "DD: Elves vs. Goblins",
    "Duel Decks: Elves vs. Inventors": "DD: Elves vs. Inventors",
    "Duel Decks: Garruk vs. Liliana": "DD: Garruk vs. Liliana",
    "Duel Decks: Heroes vs. Monsters": "DD: Heroes vs. Monsters",
    "Duel Decks: Jace vs. Chandra": "DD: Jace vs. Chandra",
    "Duel Decks: Knights vs. Dragons": "DD: Knights vs. Dragons",
    "Duel Decks: Merfolk vs. Goblins": "DD: Merfolk vs. Goblins",
    "Duel Decks: Nissa vs. Ob Nixilis": "DD: Nissa vs. Ob Nixilis",
    "Duel Decks: Phyrexia vs. the Coalition": "DD: Phyrexia vs. Coalition",
    "Duel Decks: Speed vs. Cunning": "DD: Speed vs. Cunning",
    "Duel Decks: Zendikar vs. Eldrazi": "DD: Zendikar vs. Eldrazi",
    "Forgotten Realms Commander": "CMDR Forgotten Realms",
    "Fourth Edition Foreign Black Border": "Fourth Edition FBB",
    "Global Series Jiang Yanggu & Mu Yanling": "Jiang Yanggu & Mu Yanling",
    "Innistrad: Crimson Vow Minigames": "Crimson Vow Minigames",
    "Introductory Two-Player Set": "Intro Two-Player Set",
    "Kaldheim Commander": "CMDR Kaldheim",
    "March of the Machine Commander": "CMDR March of the Machine",
    "March of the Machine: The Aftermath": "March of the Machine: Aftermath",
    "Midnight Hunt Commander": "CMDR Midnight Hunt",
    "Mystery Booster Playtest Cards 2019": "MB Playtest Cards 2019",
    "Mystery Booster Playtest Cards 2021": "MB Playtest Cards 2021",
    "Mystery Booster Playtest Cards": "Mystery Booster Playtest",
    "Mystery Booster Retail Edition Foils": "Mystery Booster Retail Foils",
    "Neon Dynasty Commander": "CMDR Neon Dynasty",
    "New Capenna Commander": "CMDR New Capenna",
    "Phyrexia: All Will Be One Commander": "CMDR Phyrexia: One",
    "Planechase Anthology Planes": "Planechase Anth. Planes",
    "Premium Deck Series: Fire and Lightning": "PD: Fire & Lightning",
    "Premium Deck Series: Graveborn": "Premium Deck Graveborn",
    "Premium Deck Series: Slivers": "Premium Deck Slivers",
    "Starter Commander Decks": "CMDR Starter Decks",
    "Strixhaven: School of Mages Minigames": "Strixhaven Minigames",
    "Tales of Middle-earth Commander": "CMDR The Lord of the Rings",
    "The Brothers' War Commander": "CMDR The Brothers' War",
    "The Brothers' War Retro Artifacts": "The Brothers' War Retro",
    "The Lord of the Rings: Tales of Middle-earth": "The Lord of the Rings",
    "The Lost Caverns of Ixalan Commander": "CMDR Lost Caverns of Ixalan",
    "Warhammer 40,000 Commander": "CMDR Warhammer 40K",
    "Wilds of Eldraine Commander": "CMDR Wilds of Eldraine",
    "World Championship Decks 1997": "World Championship 1997",
    "World Championship Decks 1998": "World Championship 1998",
    "World Championship Decks 1999": "World Championship 1999",
    "World Championship Decks 2000": "World Championship 2000",
    "World Championship Decks 2001": "World Championship 2001",
    "World Championship Decks 2002": "World Championship 2002",
    "World Championship Decks 2003": "World Championship 2003",
    "World Championship Decks 2004": "World Championship 2004",
    "Zendikar Rising Commander": "CMDR Zendikar Rising",
    "Murders at Karlov Manor Commander": "CMDR Murders at Karlov Manor",
    "Outlaws of Thunder Junction Commander": "CMDR Outlaws of Thunder Junction",
    "Modern Horizons 3 Commander": "CMDR Modern Horizons 3",
    "Bloomburrow Commander": "CMDR Bloomburrow",
    "Duskmourn: House of Horror Commander": "CMDR Duskmourn: House of Horror",
    "Aetherdrift Commander": "CMDR Aetherdrift",
    "Tarkir: Dragonstorm Commander": "CMDR Tarkir: Dragonstorm",
    "Final Fantasy Commander": "CMDR Final Fantasy",
    "Edge of Eternities Commander": "CMDR Edge of Eternities",
}
MAX_SET_NAME_LENGTH = int(os.getenv("MAX_SET_NAME_LENGTH", "32"))

# --- Font Sizes for PDF Generation ---
# For full set name (EB Garamond Bold)
FONT_SIZE_ROW1 = int(os.getenv("FONT_SIZE_ROW1", "11"))
# For set code and release date (Source Sans Pro Regular)
FONT_SIZE_ROW2 = int(os.getenv("FONT_SIZE_ROW2", "10"))

# --- Font Files ---
# Fonts are in backend/fonts/
_DEFAULT_FONT_EB_GARAMOND_BOLD = str(_BACKEND_ROOT / "fonts" / "EBGaramond-Bold.ttf")
_DEFAULT_FONT_SOURCE_SANS_PRO_REGULAR = str(_BACKEND_ROOT / "fonts" / "SourceSansPro-Regular.ttf")
FONT_EB_GARAMOND_BOLD = os.getenv("FONT_EB_GARAMOND_BOLD", _DEFAULT_FONT_EB_GARAMOND_BOLD)
FONT_SOURCE_SANS_PRO_REGULAR = os.getenv(
    "FONT_SOURCE_SANS_PRO_REGULAR", _DEFAULT_FONT_SOURCE_SANS_PRO_REGULAR
)

# --- Label Templates Configuration ---
# All dimensions are in points (1 inch = 72 points)
LABEL_TEMPLATES: dict[str, dict[str, float]] = {
    "avery5160": {
        "page_width": 612,  # 8.5 inches
        "page_height": 792,  # 11 inches
        "labels_per_row": 3,
        "label_rows": 10,
        "label_width": 189,  # 2.625 inches (approx)
        "label_height": 72,  # 1 inch (approx)
        "label_margin_x": 0.1 * 72,  # 0.1 inch
        "label_margin_y": 1,
        "left_margin": 13.5,  # Avery-suggested left margin
        "top_margin": 54,  # Avery-suggested top margin
        "horizontal_gap": 9,  # gap between columns
        "vertical_gap": 0,  # gap between rows (if any)
    },
    "avery64x30-r": {
        "page_width": 595.2,  # A4 width
        "page_height": 841.8,  # A4 height
        "labels_per_row": 3,
        "label_rows": 9,  # 3 columns x 9 rows = 27 labels
        "label_width": 181.417,  # 64mm = 181.417 points
        "label_height": 85.039,  # 30mm = 85.039 points
        "label_margin_x": 0.1 * 72,  # 0.1 inch internal margin
        "label_margin_y": 0.1 * 72,  # 0.1 inch internal margin
        "left_margin": 20.551,  # 7.25mm = 20.551 points (Avery spec)
        "top_margin": 45.869,  # ~16.18mm - increased for better vertical centering
        "horizontal_gap": 7.087,  # 2.5mm = 7.087 points (gap between columns)
        "vertical_gap": 0,  # 0mm - labels touch vertically (Avery spec)
    },
    "averyl7160": {
        "page_width": 595.2,  # A4 width
        "page_height": 841.8,  # A4 height
        "labels_per_row": 3,
        "label_rows": 7,  # 3 columns x 7 rows = 21 labels
        "label_width": 180.0,  # 63.5mm = 180.0 points
        "label_height": 108.75,  # 38.1mm = 108.7 points
        "label_margin_x": 0.1 * 72,  # 0.1 inch internal margin
        "label_margin_y": 0.1 * 72,  # 0.1 inch internal margin
        "left_margin": 20.551,  # 7.25mm = 20.551 points (Avery L7160 spec)
        "top_margin": 52,  # 18.5mm = 52 points (Avery L7160 spec)
        "horizontal_gap": 7.087,  # 2.5mm = 7.087 points (Avery L7160 spec)
        "vertical_gap": 0,  # 1mm - labels touch vertically (Avery L7160 spec)
    },
    "averyl7157": {
        "page_width": 595.2,  # A4 width
        "page_height": 841.8,  # A4 height
        "labels_per_row": 3,
        "label_rows": 11,  # 3 columns x 11 rows = 33 labels
        "label_width": 181.417,  # 64mm = 181.417 points
        "label_height": 69.75,  # 24.3mm = 68.787 points
        "label_margin_x": 0.1 * 72,  # 0.1 inch internal margin
        "label_margin_y": 0.1 * 72,  # 0.1 inch internal margin
        "left_margin": 20.551,  # 7.25mm = 20.551 points (Avery spec)
        "top_margin": 47.5,  # ~13.5mm = 38.268 points (original calculated value)
        "horizontal_gap": 7.087,  # 2.5mm = 7.087 points (gap between columns)
        "vertical_gap": 0,  # 0mm - labels touch vertically (Avery spec)
    },
    "averyj8158": {
        "page_width": 595.2,  # A4 width
        "page_height": 841.8,  # A4 height
        "labels_per_row": 3,
        "label_rows": 10,  # 3 columns x 10 rows = 30 labels
        "label_width": 181.417,  # 64mm = 181.417 points
        "label_height": 76.5,  # 26.7mm = 75.59 points
        "label_margin_x": 0.1 * 72,  # 0.1 inch internal margin
        "label_margin_y": 0.1 * 72,  # 0.1 inch internal margin
        "left_margin": 20.551,  # 7.25mm = 20.551 points (Avery spec)
        "top_margin": 47.5,  # ~15mm = 42.519 points (calculated for centering)
        "horizontal_gap": 7.087,  # 2.5mm = 7.087 points (gap between columns)
        "vertical_gap": 0,  # 0mm - labels touch vertically (Avery spec)
    },
    "avery94208": {
        "page_width": 612,  # 8.5 inches
        "page_height": 792,  # 11 inches
        "labels_per_row": 4,  # 4 columns
        "label_rows": 15,  # 4 columns x 15 rows = 60 labels
        "label_width": 126,  # 2/3" = 48 points
        "label_height": 48,  # 1-3/4" = 126 points
        "label_margin_x": 0.08 * 72,  # 0.03 inch internal margin (reduced for narrow labels)
        "label_margin_y": 0.1 * 72,  # 0.1 inch internal margin
        "left_margin": 21.6,  # 0.3" = 21.6 points (Avery spec)
        "top_margin": 46,  # 0.5" = 36 points (Avery spec) - adjust if PDF template differs
        "horizontal_gap": 21.6,  # Calculated: (612 - 2*21.6 - 4*48) / 3
        "vertical_gap": 0,  # Negative gap (overlap) to fit 15 rows: (720 - 15*126) / 14
    },
}

# --- Template Files Mapping ---
# Maps template names to their corresponding PDF template files for debug overlay
# PDF templates are in backend/pdf-templates/
_PDF_TEMPLATES_DIR = _BACKEND_ROOT / "pdf-templates"
TEMPLATE_PDF_FILES: dict[str, str] = {
    "avery5160": str(_PDF_TEMPLATES_DIR / "avery-5160.pdf"),
    "averyl7160": str(_PDF_TEMPLATES_DIR / "avery-l7160.pdf"),
    "averyl7157": str(_PDF_TEMPLATES_DIR / "avery-l7157.pdf"),
    "averyj8158": str(_PDF_TEMPLATES_DIR / "avery-j8158.pdf"),
    "avery94208": str(_PDF_TEMPLATES_DIR / "avery-94208.pdf"),
}

# --- Maximum Symbol Width ---
# Maximum width (in points) allowed for a set symbol on a label.
SET_SYMBOL_MAX_WIDTH = float(os.getenv("SET_SYMBOL_MAX_WIDTH", "30"))

# --- Current Template Selection ---
# Change this to "avery5160" or "a4" to select the desired label layout.
CURRENT_LABEL_TEMPLATE = os.getenv("CURRENT_LABEL_TEMPLATE", "avery5160")

# --- Application Settings ---
APP_NAME = os.getenv("APP_NAME", "MTG Label Generator")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# --- Feature Flags ---
# Enable template debug overlay feature (disabled by default)
ENABLE_TEMPLATE_DEBUG = os.getenv("ENABLE_TEMPLATE_DEBUG", "false").lower() == "true"

# --- Scryfall API Settings ---
SCRYFALL_API_BASE_URL = os.getenv("SCRYFALL_API_BASE_URL", "https://api.scryfall.com/sets")
SCRYFALL_API_TIMEOUT = int(os.getenv("SCRYFALL_API_TIMEOUT", "30"))  # seconds
SCRYFALL_API_RETRY_ATTEMPTS = int(os.getenv("SCRYFALL_API_RETRY_ATTEMPTS", "3"))
# Rate limiting: Scryfall recommends 50-100ms delay between requests (10 req/sec average)
SCRYFALL_API_RATE_LIMIT_DELAY = float(
    os.getenv("SCRYFALL_API_RATE_LIMIT_DELAY", "0.075")
)  # 75ms default

# --- Cache Settings ---
# Scryfall recommends caching data for at least 24 hours
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "86400"))  # 24 hours default (was 1 hour)
CACHE_MAX_SIZE = int(os.getenv("CACHE_MAX_SIZE", "100"))
# Symbol cache is in backend/static/images/
_DEFAULT_SYMBOL_CACHE_DIR = _BACKEND_ROOT / "static" / "images"
SYMBOL_CACHE_DIR = Path(os.getenv("SYMBOL_CACHE_DIR", str(_DEFAULT_SYMBOL_CACHE_DIR)))
# SVG drawing cache size (in-memory cache for parsed SVG drawings)
SVG_DRAWING_CACHE_MAX_SIZE = int(os.getenv("SVG_DRAWING_CACHE_MAX_SIZE", "50"))  # Reduced from 100


# --- Logging Configuration ---
def setup_logging(log_level: str | None = None) -> logging.Logger:
    """Configure and return the application logger.

    Args:
        log_level: Optional log level override. If not provided, uses LOG_LEVEL from config.

    Returns:
        Configured logger instance.
    """
    level = log_level or LOG_LEVEL
    numeric_level = getattr(logging, level, logging.INFO)

    # Create logger
    logger = logging.getLogger("mtg_labels")
    logger.setLevel(numeric_level)

    # Remove existing handlers to avoid duplicates
    logger.handlers.clear()

    # Create console handler
    handler = logging.StreamHandler()
    handler.setLevel(numeric_level)

    # Create formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)

    # Add handler to logger
    logger.addHandler(handler)

    return logger


# Initialize logger
logger = setup_logging()
