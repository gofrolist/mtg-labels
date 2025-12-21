# API Contracts: Project Optimization & Modernization

**Date**: 2025-11-25
**Feature**: Project Optimization & Modernization
**Phase**: Phase 1 - Design

## API Endpoints

### GET /

**Description**: Render the main page with set selection interface.

**Request**:
- Method: `GET`
- Path: `/`
- Headers: None
- Query Parameters: None

**Response**:
- Status: `200 OK`
- Content-Type: `text/html`
- Body: HTML page with set selection interface

**Error Responses**:
- `500 Internal Server Error`: If set data cannot be fetched

**Caching**: None (dynamic content)

---

### GET /api/sets

**Description**: Get list of available MTG sets (filtered and ready for selection).

**Request**:
- Method: `GET`
- Path: `/api/sets`
- Headers: None
- Query Parameters: None

**Response**:
- Status: `200 OK`
- Content-Type: `application/json`
- Body: Array of set objects

**Response Schema**:
```json
[
  {
    "id": "string",
    "name": "string",
    "code": "string",
    "set_type": "string",
    "card_count": 0,
    "released_at": "YYYY-MM-DD",
    "icon_svg_uri": "string (optional)",
    "scryfall_uri": "string (optional)"
  }
]
```

**Error Responses**:
- `500 Internal Server Error`: If Scryfall API is unavailable
- `503 Service Unavailable`: If cache is stale and API unavailable

**Caching**:
- In-memory cache (1 hour TTL)
- Cache key: `"sets"`

---

### POST /generate-pdf

**Description**: Generate PDF labels for selected MTG sets.

**Request**:
- Method: `POST`
- Path: `/generate-pdf`
- Content-Type: `application/x-www-form-urlencoded`
- Body: Form data with `set_ids` array

**Request Schema**:
```
set_ids: string[] (required, min 1, max 100)
```

**Response**:
- Status: `200 OK`
- Content-Type: `application/pdf`
- Headers:
  - `Content-Disposition: attachment; filename=mtg_labels.pdf`
- Body: PDF file stream

**Error Responses**:
- `400 Bad Request`: If no valid sets selected or invalid set IDs
- `500 Internal Server Error`: If PDF generation fails
- `503 Service Unavailable`: If required set data unavailable

**Performance Requirements**:
- Must complete within 10 seconds for 30 sets
- Must handle concurrent requests (10+)
- Memory usage must remain stable

**Caching**:
- Set data: In-memory cache
- Symbols: File cache

---

## External API Contracts

### Scryfall API: GET /sets

**Description**: Fetch all MTG sets from Scryfall API.

**Request**:
- Method: `GET`
- URL: `https://api.scryfall.com/sets`
- Headers: None

**Response**:
- Status: `200 OK`
- Content-Type: `application/json`
- Body: Scryfall sets response

**Rate Limiting**:
- Scryfall API: ~50-100 requests per second
- Must implement request throttling if needed
- Cache responses to minimize API calls

**Error Handling**:
- `429 Too Many Requests`: Implement exponential backoff
- `500/503`: Retry with backoff, fallback to cached data
- Network errors: Use cached data if available

**Contract Tests**:
- Verify response schema matches expected format
- Verify error handling for rate limits
- Verify caching behavior

---

## Data Contracts

### MTGSet Schema

```python
{
    "id": str,              # Required, non-empty
    "name": str,            # Required, non-empty
    "code": str,            # Required, uppercase, 2-5 chars
    "set_type": str,        # Required, valid set type
    "card_count": int,      # Required, >= 0
    "released_at": str,     # Optional, ISO date format
    "icon_svg_uri": str,    # Optional, valid URL
    "scryfall_uri": str     # Optional, valid URL
}
```

### PDF Generation Request Schema

```python
{
    "set_ids": List[str]    # Required, 1-100 items, all must exist
}
```

---

## Performance Contracts

### Response Time Requirements

- `GET /`: < 500ms (with cached set data)
- `GET /api/sets`: < 200ms (from cache), < 2s (from API)
- `POST /generate-pdf`: < 10s (for 30 sets)

### Resource Usage Requirements

- Memory: Stable during concurrent requests (no leaks)
- CPU: < 80% during PDF generation
- Cache hit rate: > 60% for set data

---

## Error Response Schema

All error responses follow this format:

```json
{
    "detail": "string"  # Human-readable error message
}
```

**Error Codes**:
- `400`: Bad Request (invalid input)
- `500`: Internal Server Error (unexpected error)
- `503`: Service Unavailable (external dependency unavailable)
