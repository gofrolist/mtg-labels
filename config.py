# config.py

# --- Set Filtering Configuration ---
SET_TYPES = (
    "core",
    "expansion",
    "starter",        # e.g., Portal, P3k, welcome decks
    "masters",
    "commander",
    "planechase",
    "draft_innovation",  # e.g., Battlebond, Conspiracy
    "duel_deck",
    "premium_deck",
    "from_the_vault",
    "archenemy",
    "box",
    "funny",          # e.g., Unglued, Unhinged, Ponies: TG, etc.
)
MINIMUM_SET_SIZE = 50
IGNORED_SETS = (
    "cmb1", "amh1", "cmb2", "fbb", "sum", "4bb", "bchr",
    "rin", "ren", "rqs", "itp", "sir", "sis", "cst",
)

# --- Abbreviation Mapping ---
ABBREVIATION_MAP = {
    "Adventures in the Forgotten Realms Minigames": "Forgotten Realms Minigames",
    "Adventures in the Forgotten Realms": "Forgotten Realms",
    # ... (rest of your mappings)
    "Zendikar Rising Commander": "CMDR Zendikar Rising"
}
MAX_SET_NAME_LENGTH = 32

# --- Font Sizes for PDF Generation ---
FONT_SIZE_ROW1 = 11  # For full set name (EB Garamond Bold)
FONT_SIZE_ROW2 = 10  # For set code and release date (Source Sans Pro Regular)

# --- Font Files ---
FONT_EB_GARAMOND_BOLD = "fonts/EBGaramond-Bold.ttf"
FONT_SOURCE_SANS_PRO_REGULAR = "fonts/SourceSansPro-Regular.ttf"

# --- Label Templates Configuration ---
# All dimensions are in points (1 inch = 72 points)
LABEL_TEMPLATES = {
    "avery5160": {
         "page_width": 612,         # 8.5 inches
         "page_height": 792,        # 11 inches
         "labels_per_row": 3,
         "label_rows": 10,
         "label_width": 189,        # 2.625 inches (approx)
         "label_height": 72,        # 1 inch (approx)
         "label_margin_x": 0.1 * 72,  # 0.1 inch
         "label_margin_y": 1,
         "left_margin": 13.5,       # Avery-suggested left margin
         "top_margin": 54,          # Avery-suggested top margin
         "horizontal_gap": 9,       # gap between columns
         "vertical_gap": 0,         # gap between rows (if any)
    },
    "a4": {
         "page_width": 595.2,       # A4 width ≈ 8.27 inches
         "page_height": 841.8,      # A4 height ≈ 11.69 inches
         "labels_per_row": 3,
         "label_rows": 8,           # Example: 3 columns x 8 rows
         "label_width": 595.2 / 3,   # evenly divide page width
         "label_height": 841.8 / 8,  # evenly divide page height
         "label_margin_x": 0.1 * 72,
         "label_margin_y": 0.1 * 72,
         "left_margin": 10,         # adjust as needed
         "top_margin": 30,          # adjust as needed
         "horizontal_gap": 5,
         "vertical_gap": 5,
    }
}

# --- Maximum Symbol Width ---
# Maximum width (in points) allowed for a set symbol on a label.
SET_SYMBOL_MAX_WIDTH = 30

# --- Current Template Selection ---
# Change this to "avery5160" or "a4" to select the desired label layout.
CURRENT_LABEL_TEMPLATE = "avery5160"
