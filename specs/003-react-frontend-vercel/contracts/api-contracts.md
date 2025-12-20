# API Contracts: React Frontend Rewrite & Vercel Deployment

**Date**: 2025-01-27
**Feature**: React Frontend Rewrite & Vercel Deployment
**Phase**: Phase 1 - Design

## Overview

This document defines the API contracts between the React frontend (deployed on Vercel) and the FastAPI backend. All endpoints return JSON responses (except PDF generation which returns binary).

## Base URL

- **Development**: `http://localhost:8080` (or configured backend URL)
- **Production**: Backend URL (configured via environment variable)

## CORS Configuration

Backend MUST allow requests from:
- Vercel deployment domain (production)
- `localhost:5173` (Vite dev server, development)
- Configured via `CORS_ORIGINS` environment variable

## Endpoints

### GET /api/sets

Get all filtered MTG sets.

**Request**:
```
GET /api/sets
```

**Response**:
- **Status**: `200 OK`
- **Content-Type**: `application/json`
- **Body**:
```json
[
  {
    "id": "string",
    "name": "string",
    "code": "string",
    "set_type": "string",
    "card_count": 0,
    "released_at": "YYYY-MM-DD" | null,
    "icon_svg_uri": "url" | null,
    "scryfall_uri": "url" | null
  }
]
```

**Error Responses**:
- `500 Internal Server Error`: Backend error
- `503 Service Unavailable`: Scryfall API unavailable

**Example**:
```bash
curl -X GET http://localhost:8080/api/sets
```

---

### GET /api/card-types

Get card types organized by color.

**Request**:
```
GET /api/card-types
```

**Response**:
- **Status**: `200 OK`
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "White": ["Creature", "Instant", "Sorcery", ...],
  "Blue": ["Creature", "Instant", "Sorcery", ...],
  "Black": ["Creature", "Instant", "Sorcery", ...],
  "Red": ["Creature", "Instant", "Sorcery", ...],
  "Green": ["Creature", "Instant", "Sorcery", ...],
  "Colorless": ["Artifact", "Creature", ...],
  "Multicolor": ["Creature", "Instant", "Sorcery", ...]
}
```

**Error Responses**:
- `500 Internal Server Error`: Backend error
- `503 Service Unavailable`: Scryfall API unavailable

**Note**: This endpoint needs to be created during backend refactoring (currently only available in HTML route).

**Example**:
```bash
curl -X GET http://localhost:8080/api/card-types
```

---

### POST /generate-pdf

Generate PDF labels for selected sets or card types.

**Request**:
```
POST /generate-pdf
Content-Type: multipart/form-data
```

**Form Data**:
- `set_ids` (string[], optional): Array of set IDs (for "sets" view mode)
- `card_type_ids` (string[], optional): Array of card type IDs in format "color:type" (for "types" view mode)
- `template` (string, required): Label template ID (e.g., "avery5160")
- `placeholders` (number, optional): Number of empty labels at start (default: 0)
- `view_mode` (string, required): "sets" or "types"

**Validation**:
- At least one of `set_ids` or `card_type_ids` must be provided
- `template` must be a valid template ID
- `placeholders` must be >= 0 and < labels_per_page for selected template
- `view_mode` must match which IDs are provided

**Response**:
- **Status**: `200 OK`
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment;filename=mtg_labels.pdf`
- **Body**: PDF file binary data

**Error Responses**:
- `400 Bad Request`: No sets/card types selected or invalid template
  ```json
  {
    "detail": "Please select at least one set before generating the PDF."
  }
  ```
- `500 Internal Server Error`: PDF generation failed
- `503 Service Unavailable`: Backend service unavailable

**Example**:
```bash
curl -X POST http://localhost:8080/generate-pdf \
  -F "set_ids=abc123" \
  -F "set_ids=def456" \
  -F "template=avery5160" \
  -F "placeholders=0" \
  -F "view_mode=sets" \
  --output labels.pdf
```

**JavaScript Example**:
```javascript
const formData = new FormData();
formData.append('set_ids', 'abc123');
formData.append('set_ids', 'def456');
formData.append('template', 'avery5160');
formData.append('placeholders', '0');
formData.append('view_mode', 'sets');

const response = await fetch('http://localhost:8080/generate-pdf', {
  method: 'POST',
  body: formData
});

if (response.ok) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mtg_labels.pdf';
  a.click();
}
```

---

### GET /api/templates (Optional - if needed)

Get available label templates with configuration.

**Request**:
```
GET /api/templates
```

**Response**:
- **Status**: `200 OK`
- **Content-Type**: `application/json`
- **Body**:
```json
[
  {
    "id": "avery5160",
    "name": "Avery 5160/8460",
    "dimensions": "1\" x 2-5/8\"",
    "labels_per_page": 30,
    "labels_per_row": 3,
    "label_rows": 10
  }
]
```

**Note**: This endpoint is optional. Templates can be configured in frontend if they're static.

---

## Error Response Format

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

For validation errors (400 Bad Request):
```json
{
  "detail": "Validation error message"
}
```

## Rate Limiting

Backend should respect Scryfall API rate limits. Frontend should handle rate limit responses gracefully:
- `429 Too Many Requests`: Retry after delay
- Show user-friendly message about rate limiting

## Timeout Handling

- **Request Timeout**: 30 seconds for API calls
- **PDF Generation Timeout**: 60 seconds (longer for large PDFs)
- Frontend should show loading indicators and handle timeouts gracefully

## CORS Headers

Backend MUST include these CORS headers:
```
Access-Control-Allow-Origin: <allowed-origin>
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 3600
```

## Authentication

No authentication required for current implementation. All endpoints are publicly accessible.

## Backend Changes Required

1. **Remove GET "/" route**: Remove HTML template serving route
2. **Add GET /api/card-types**: Create new endpoint for card types (currently only in HTML route)
3. **Configure CORS**: Add CORS middleware with environment variable for allowed origins
4. **Remove frontend dependencies**: Remove Jinja2 templates, frontend directory from Dockerfile
5. **Update error responses**: Ensure all errors return JSON format (not HTML)
