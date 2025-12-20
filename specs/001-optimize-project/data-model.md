# Data Model: Project Optimization & Modernization

**Date**: 2025-11-25
**Feature**: Project Optimization & Modernization
**Phase**: Phase 1 - Design

## Entities

### MTGSet

Represents a Magic: The Gathering set with all metadata needed for label generation.

**Fields**:
- `id` (str): Unique identifier from Scryfall API
- `name` (str): Full set name
- `code` (str): Set code (e.g., "MH2", "CMM")
- `set_type` (str): Type of set (core, expansion, commander, etc.)
- `card_count` (int): Number of cards in the set
- `released_at` (str): Release date in ISO format (YYYY-MM-DD)
- `icon_svg_uri` (str, optional): URL to set symbol SVG
- `scryfall_uri` (str, optional): Scryfall API URI for the set

**Validation Rules**:
- `id` must be non-empty
- `name` must be non-empty
- `code` must be uppercase, 2-5 characters
- `card_count` must be >= 0
- `released_at` must be valid ISO date format if present

**State Transitions**: None (immutable data from external API)

**Relationships**:
- Associated with cached symbol file (one-to-one)
- Part of set groups (many-to-many via set_type)

### CachedSetData

Represents cached set list data with metadata for cache management.

**Fields**:
- `sets` (List[MTGSet]): List of MTG sets
- `cached_at` (datetime): Timestamp when data was cached
- `expires_at` (datetime): Timestamp when cache expires
- `source` (str): Source identifier ("scryfall_api")

**Validation Rules**:
- `sets` must be non-empty list
- `cached_at` must be <= current time
- `expires_at` must be > `cached_at`
- `source` must be non-empty

**State Transitions**:
- Fresh → Stale (when `expires_at` < current time)
- Stale → Refreshed (when cache is updated)

### CachedSymbol

Represents a cached set symbol file.

**Fields**:
- `set_id` (str): Associated MTG set ID
- `file_path` (str): Local file system path to SVG file
- `cached_at` (datetime): Timestamp when file was cached
- `file_size` (int): Size of cached file in bytes
- `checksum` (str, optional): File checksum for validation

**Validation Rules**:
- `set_id` must match existing MTG set
- `file_path` must exist and be readable
- `file_size` must be > 0
- File must be valid SVG format

**State Transitions**:
- Missing → Cached (when symbol downloaded)
- Cached → Invalid (when file corrupted or missing)
- Invalid → Refreshed (when re-downloaded)

### PDFGenerationRequest

Represents a request to generate PDF labels.

**Fields**:
- `set_ids` (List[str]): List of MTG set IDs to include
- `template` (str): Label template name (e.g., "avery5160", "a4")
- `requested_at` (datetime): Timestamp when request was made

**Validation Rules**:
- `set_ids` must be non-empty list
- Each `set_id` must exist in available sets
- `template` must be valid template name
- Maximum sets per request: 100 (to prevent resource exhaustion)

**State Transitions**:
- Created → Processing → Completed
- Created → Failed (on validation error)
- Processing → Failed (on generation error)

### PerformanceMetrics

Represents performance measurements for optimization validation.

**Fields**:
- `operation` (str): Operation name (e.g., "pdf_generation", "set_fetch")
- `duration_ms` (float): Duration in milliseconds
- `memory_mb` (float): Memory usage in MB
- `cpu_percent` (float): CPU usage percentage
- `timestamp` (datetime): When measurement was taken

**Validation Rules**:
- `operation` must be non-empty
- `duration_ms` must be >= 0
- `memory_mb` must be >= 0
- `cpu_percent` must be 0-100

**State Transitions**: None (append-only metrics)

## Data Flow

### Set Data Flow

1. **Fetch**: Scryfall API → `ScryfallClient.fetch_sets()` → `List[MTGSet]`
2. **Cache**: `List[MTGSet]` → `CachedSetData` → In-memory cache
3. **Filter**: `List[MTGSet]` → `ScryfallClient.filter_sets()` → Filtered list
4. **Group**: Filtered list → `ScryfallClient.group_sets()` → Grouped dictionary

### Symbol Cache Flow

1. **Request**: `MTGSet.icon_svg_uri` → Check file cache
2. **Hit**: Return cached file path
3. **Miss**: Download from URI → Save to `static/images/` → Return path
4. **Validation**: Check file exists and is valid SVG

### PDF Generation Flow

1. **Request**: `PDFGenerationRequest` → Validate set IDs
2. **Fetch**: Get set data from cache or API
3. **Generate**: `PDFGenerator.generate()` → Stream PDF bytes
4. **Response**: Return `StreamingResponse` with PDF

## Cache Strategy

### In-Memory Cache (Set Data)

- **Storage**: `cachetools.TTLCache`
- **Key**: `"sets"` (single key for all sets)
- **Value**: `CachedSetData`
- **TTL**: 1 hour (3600 seconds)
- **Max Size**: 1 entry (only one set list)
- **Invalidation**: Time-based expiration

### File Cache (Symbols)

- **Storage**: File system (`static/images/`)
- **Key**: `{set_id}.svg`
- **Value**: SVG file content
- **TTL**: None (persistent until manually cleared)
- **Validation**: File existence check, optional checksum
- **Invalidation**: Manual deletion or corruption detection

### HTTP Cache (API Responses)

- **Storage**: In-memory with `cachetools.TTLCache`
- **Key**: API endpoint URL
- **Value**: Response data
- **TTL**: 1 hour
- **Invalidation**: Time-based or error-based

## Validation Rules Summary

- All set IDs must exist before PDF generation
- Cache expiration must be checked before use
- File paths must be validated before access
- PDF generation requests limited to prevent resource exhaustion
- All external data must be validated before use
