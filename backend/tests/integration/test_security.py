"""Integration tests for security hardening behaviors.

Covers:
- Security response headers on every response
- CORS configured without credentials
- OpenAPI schema / docs disabled in production (DEBUG=false)
- Custom-template dimension bounds (resource-exhaustion / DoS guard)
- Per-IP rate limiting on expensive and API endpoints
- Request body size cap (413 on oversized bodies)
- Per-item input length validation (set_ids / card_type_ids)
"""

import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from src.api.rate_limit import RateLimiter
from src.api.routes import create_app

app = create_app()


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


def _build_strict_app(
    *,
    pdf_max: int = 2,
    api_max: int = 3,
    max_body_bytes: int | None = None,
):
    """Build an isolated app with tight limits so tests can trip them quickly."""
    return create_app(
        pdf_limiter=RateLimiter(max_requests=pdf_max, window_seconds=60),
        api_limiter=RateLimiter(max_requests=api_max, window_seconds=60),
        max_body_bytes=max_body_bytes,
    )


class TestSecurityHeaders:
    """Security response headers should be present on all responses."""

    def test_security_headers_present(self, client):
        """Core hardening headers are set on a normal response."""
        response = client.get("/", follow_redirects=False)
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
        assert "Permissions-Policy" in response.headers
        assert response.headers["Cross-Origin-Opener-Policy"] == "same-origin"
        assert "default-src 'none'" in response.headers["Content-Security-Policy"]

    def test_hsts_present_when_not_debug(self, client):
        """HSTS is emitted in production (DEBUG is false by default in tests)."""
        response = client.get("/", follow_redirects=False)
        assert "Strict-Transport-Security" in response.headers
        assert "max-age=31536000" in response.headers["Strict-Transport-Security"]


class TestSchemaExposure:
    """Interactive docs and the OpenAPI schema must be off in production."""

    def test_openapi_schema_disabled(self, client):
        """/openapi.json is not served when DEBUG is false."""
        response = client.get("/openapi.json")
        assert response.status_code == 404

    def test_docs_disabled(self, client):
        """/docs is not served when DEBUG is false."""
        response = client.get("/docs")
        assert response.status_code == 404


class TestCorsConfiguration:
    """CORS should reflect allowed origins without credentials."""

    def test_cors_allows_known_origin_without_credentials(self, client):
        """A known origin is allowed but credentials are not enabled."""
        response = client.get(
            "/",
            headers={"Origin": "https://mtg-labels.vercel.app"},
            follow_redirects=False,
        )
        assert (
            response.headers.get("access-control-allow-origin") == "https://mtg-labels.vercel.app"
        )
        # allow_credentials=False -> header must be absent
        assert "access-control-allow-credentials" not in response.headers


class TestCustomTemplateBounds:
    """Custom template dimensions must be bounded to prevent DoS."""

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_rejects_oversized_label_grid(self, mock_fetch, client, sample_set_data):
        """A huge labels_per_row/label_rows grid is rejected with 400."""
        mock_fetch.return_value = sample_set_data
        custom_template = {
            "page_width": 612,
            "page_height": 792,
            "labels_per_row": 10000,
            "label_rows": 10000,
            "label_width": 100,
            "label_height": 50,
            "left_margin": 10,
            "top_margin": 10,
            "horizontal_gap": 5,
            "vertical_gap": 5,
        }
        import json

        response = client.post(
            "/generate-pdf",
            data={
                "set_ids": ["test-set-1"],
                "custom_template": json.dumps(custom_template),
                "view_mode": "sets",
            },
        )
        assert response.status_code == 400
        assert "exceeds maximum" in response.json()["error"]["detail"]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_rejects_oversized_page_dimension(self, mock_fetch, client, sample_set_data):
        """An absurd page dimension is rejected with 400."""
        mock_fetch.return_value = sample_set_data
        custom_template = {
            "page_width": 99999,
            "page_height": 792,
            "labels_per_row": 3,
            "label_rows": 10,
            "label_width": 100,
            "label_height": 50,
            "left_margin": 10,
            "top_margin": 10,
            "horizontal_gap": 5,
            "vertical_gap": 5,
        }
        import json

        response = client.post(
            "/generate-pdf",
            data={
                "set_ids": ["test-set-1"],
                "custom_template": json.dumps(custom_template),
                "view_mode": "sets",
            },
        )
        assert response.status_code == 400
        assert "exceeds maximum" in response.json()["error"]["detail"]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_accepts_reasonable_custom_template(self, mock_fetch, client, sample_set_data):
        """A normal custom template within bounds still generates a PDF."""
        mock_fetch.return_value = sample_set_data
        custom_template = {
            "page_width": 612,
            "page_height": 792,
            "labels_per_row": 3,
            "label_rows": 10,
            "label_width": 189,
            "label_height": 72,
            "left_margin": 13.5,
            "top_margin": 54,
            "horizontal_gap": 9,
            "vertical_gap": 0,
        }
        import json

        response = client.post(
            "/generate-pdf",
            data={
                "set_ids": ["test-set-1"],
                "custom_template": json.dumps(custom_template),
                "view_mode": "sets",
            },
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"


class TestRateLimiting:
    """Per-IP rate limiter must 429 once the bucket is full."""

    def test_api_endpoint_rate_limited(self, sample_set_data):
        """/api/sets returns 429 after exceeding api_limiter budget."""
        strict_app = _build_strict_app(api_max=2)
        with patch("src.api.routes.scryfall_client.fetch_sets", return_value=sample_set_data):
            with TestClient(strict_app) as strict_client:
                # First two requests must succeed; third one must trip the limiter.
                assert strict_client.get("/api/sets").status_code == 200
                assert strict_client.get("/api/sets").status_code == 200
                blocked = strict_client.get("/api/sets")
                assert blocked.status_code == 429
                # Detail should not leak server internals — generic, brief.
                assert "detail" in blocked.json().get("error", {})

    def test_generate_pdf_rate_limited(self, sample_set_data):
        """/generate-pdf returns 429 after exceeding pdf_limiter budget."""
        strict_app = _build_strict_app(pdf_max=1)
        with patch("src.api.routes.scryfall_client.fetch_sets", return_value=sample_set_data):
            with TestClient(strict_app) as strict_client:
                payload = {"set_ids": ["test-set-1"], "view_mode": "sets"}
                first = strict_client.post("/generate-pdf", data=payload)
                assert first.status_code == 200
                second = strict_client.post("/generate-pdf", data=payload)
                assert second.status_code == 429

    def test_root_redirect_not_rate_limited(self, sample_set_data):
        """Health-check / root path must not consume the limiter."""
        strict_app = _build_strict_app(api_max=1)
        with patch("src.api.routes.scryfall_client.fetch_sets", return_value=sample_set_data):
            with TestClient(strict_app) as strict_client:
                # Hit `/` many times — these should not count toward api_limiter.
                for _ in range(5):
                    resp = strict_client.get("/", follow_redirects=False)
                    assert resp.status_code in (200, 301)
                # And /api/sets still has its budget intact.
                assert strict_client.get("/api/sets").status_code == 200


class TestBodySizeCap:
    """Oversized request bodies must be rejected before they hit handlers."""

    def test_rejects_oversized_body_with_413(self):
        """A request with Content-Length above the cap returns 413."""
        small_cap_app = _build_strict_app(max_body_bytes=128)
        with TestClient(small_cap_app) as strict_client:
            # Build a JSON payload larger than 128 bytes.
            huge_template = json.dumps({"x": "A" * 200})
            response = strict_client.post(
                "/generate-pdf",
                data={
                    "set_ids": ["test-set-1"],
                    "custom_template": huge_template,
                    "view_mode": "sets",
                },
            )
            assert response.status_code == 413


class TestPerItemValidation:
    """Individual set_ids / card_type_ids strings must be length-bounded."""

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_rejects_oversized_set_id(self, mock_fetch, client, sample_set_data):
        """A single 200-char set_id is rejected with 400."""
        mock_fetch.return_value = sample_set_data
        response = client.post(
            "/generate-pdf",
            data={
                "set_ids": ["A" * 200],
                "view_mode": "sets",
            },
        )
        assert response.status_code == 400
        assert "too long" in response.json()["error"]["detail"].lower()

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_rejects_oversized_card_type_id(self, mock_fetch, client, sample_set_data):
        """A single 200-char card_type_id is rejected with 400."""
        mock_fetch.return_value = sample_set_data
        response = client.post(
            "/generate-pdf",
            data={
                "card_type_ids": ["A" * 200],
                "view_mode": "types",
            },
        )
        assert response.status_code == 400
        assert "too long" in response.json()["error"]["detail"].lower()
