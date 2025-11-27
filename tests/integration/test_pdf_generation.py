"""Integration tests for PDF generation endpoint."""

from io import BytesIO
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from src.api.routes import create_app

app = create_app()


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


class TestGeneratePdfEndpoint:
    """Tests for POST /generate-pdf endpoint."""

    @patch("src.api.routes.PDFGenerator")
    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_generate_pdf_success(self, mock_fetch, mock_pdf_gen, client, sample_set_data):
        """Test successful PDF generation."""
        mock_fetch.return_value = sample_set_data

        # Mock PDF generator - return BytesIO that can be iterated
        mock_generator_instance = Mock()
        mock_buffer = BytesIO(b"%PDF-1.4 fake pdf content")
        mock_generator_instance.generate.return_value = mock_buffer
        mock_pdf_gen.return_value = mock_generator_instance

        response = client.post("/generate-pdf", data={"set_ids": ["test-set-1", "test-set-2"]})

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert "attachment" in response.headers["content-disposition"]
        assert "mtg_labels.pdf" in response.headers["content-disposition"]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_generate_pdf_no_valid_sets(self, mock_fetch, client, sample_set_data):
        """Test PDF generation with no valid sets."""
        mock_fetch.return_value = sample_set_data

        response = client.post("/generate-pdf", data={"set_ids": ["nonexistent-set"]})

        assert response.status_code == 400
        response_json = response.json()
        # Error handler returns nested structure: {"error": {"detail": ...}}
        assert "No valid sets selected" in response_json["error"]["detail"]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_generate_pdf_empty_set_ids(self, mock_fetch, client):
        """Test PDF generation with empty set_ids."""
        mock_fetch.return_value = []

        response = client.post("/generate-pdf", data={"set_ids": []})

        # Should return 400 or handle gracefully
        assert response.status_code in [400, 422]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_generate_pdf_api_error(self, mock_fetch, client):
        """Test PDF generation when API fails."""
        from fastapi import HTTPException

        mock_fetch.side_effect = HTTPException(status_code=500, detail="API Error")

        response = client.post("/generate-pdf", data={"set_ids": ["test-set-1"]})

        assert response.status_code == 500
