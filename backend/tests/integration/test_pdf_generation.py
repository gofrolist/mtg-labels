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

    @patch("src.api.routes.PDFGenerator")
    def test_generate_pdf_types_view_success(self, mock_pdf_gen, client):
        """Test successful PDF generation for types view."""
        # Mock PDF generator - return BytesIO that can be iterated
        mock_generator_instance = Mock()
        mock_buffer = BytesIO(b"%PDF-1.4 fake pdf content")
        mock_generator_instance.generate.return_value = mock_buffer
        mock_pdf_gen.return_value = mock_generator_instance

        response = client.post(
            "/generate-pdf",
            data={
                "card_type_ids": ["White:Creature", "Blue:Instant"],
                "view_mode": "types",
            },
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert "attachment" in response.headers["content-disposition"]
        # Verify PDFGenerator was called with correct data
        mock_pdf_gen.assert_called_once()
        call_args = mock_pdf_gen.call_args
        assert call_args[1]["view_mode"] == "types"
        # Check that card type data was passed
        items_data = call_args[0][0]
        assert len(items_data) >= 2  # At least 2 items (the selected types)
        # Find the actual type items (skip placeholders)
        type_items = [item for item in items_data if not item.get("__placeholder__")]
        assert len(type_items) == 2
        assert type_items[0]["type"] == "Creature"
        assert type_items[0]["color"] == "White"
        assert type_items[1]["type"] == "Instant"
        assert type_items[1]["color"] == "Blue"

    def test_generate_pdf_types_view_empty_card_type_ids(self, client):
        """Test PDF generation with empty card_type_ids for types view."""
        response = client.post(
            "/generate-pdf",
            data={"card_type_ids": [], "view_mode": "types"},
        )

        assert response.status_code == 400
        response_json = response.json()
        assert "Please select at least one card type" in response_json["error"]["detail"]

    @patch("src.api.routes.PDFGenerator")
    def test_generate_pdf_types_view_with_placeholders(self, mock_pdf_gen, client):
        """Test PDF generation for types view with placeholders."""
        mock_generator_instance = Mock()
        mock_buffer = BytesIO(b"%PDF-1.4 fake pdf content")
        mock_generator_instance.generate.return_value = mock_buffer
        mock_pdf_gen.return_value = mock_generator_instance

        response = client.post(
            "/generate-pdf",
            data={
                "card_type_ids": ["White:Creature"],
                "view_mode": "types",
                "placeholders": "3",
            },
        )

        assert response.status_code == 200
        # Verify placeholders were added
        call_args = mock_pdf_gen.call_args
        items_data = call_args[0][0]
        # Should have 3 placeholders + 1 type item
        placeholder_count = sum(1 for item in items_data if item.get("__placeholder__"))
        assert placeholder_count == 3

    @patch("src.api.routes.PDFGenerator")
    @patch("src.api.routes.scryfall_client.filter_sets")
    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_generate_pdf_sets_view_no_valid_sets(
        self, mock_fetch, mock_filter, mock_pdf_gen, client, sample_set_data
    ):
        """Test PDF generation with sets view when no valid sets are selected."""
        mock_fetch.return_value = sample_set_data
        mock_filter.return_value = sample_set_data

        response = client.post(
            "/generate-pdf",
            data={"set_ids": ["nonexistent-set"], "view_mode": "sets"},
        )

        assert response.status_code == 400
        response_json = response.json()
        assert "No valid sets selected" in response_json["error"]["detail"]

    @patch("src.api.routes.PDFGenerator")
    @patch("src.api.routes.scryfall_client.filter_sets")
    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_generate_pdf_sets_view_success(
        self, mock_fetch, mock_filter, mock_pdf_gen, client, sample_set_data
    ):
        """Test successful PDF generation for sets view."""
        mock_fetch.return_value = sample_set_data
        mock_filter.return_value = sample_set_data

        mock_generator_instance = Mock()
        mock_buffer = BytesIO(b"%PDF-1.4 fake pdf content")
        mock_generator_instance.generate.return_value = mock_buffer
        mock_pdf_gen.return_value = mock_generator_instance

        response = client.post(
            "/generate-pdf",
            data={"set_ids": ["test-set-1"], "view_mode": "sets"},
        )

        assert response.status_code == 200
        # Verify PDFGenerator was called with sets view
        call_args = mock_pdf_gen.call_args
        assert call_args[1]["view_mode"] == "sets"

    @patch("src.api.routes.PDFGenerator")
    def test_generate_pdf_invalid_template(self, mock_pdf_gen, client):
        """Test PDF generation with invalid template name."""
        mock_generator_instance = Mock()
        mock_buffer = BytesIO(b"%PDF-1.4 fake pdf content")
        mock_generator_instance.generate.return_value = mock_buffer
        mock_pdf_gen.return_value = mock_generator_instance

        response = client.post(
            "/generate-pdf",
            data={
                "card_type_ids": ["White:Creature"],
                "view_mode": "types",
                "template": "invalid_template_name",
            },
        )

        # Should still succeed, using default template
        assert response.status_code == 200

    @patch("src.api.routes.PDFGenerator")
    def test_generate_pdf_template_debug_disabled(self, mock_pdf_gen, client):
        """Test PDF generation when template debug is disabled."""
        mock_generator_instance = Mock()
        mock_buffer = BytesIO(b"%PDF-1.4 fake pdf content")
        mock_generator_instance.generate.return_value = mock_buffer
        mock_pdf_gen.return_value = mock_generator_instance

        with patch("src.api.routes.ENABLE_TEMPLATE_DEBUG", False):
            response = client.post(
                "/generate-pdf",
                data={
                    "card_type_ids": ["White:Creature"],
                    "view_mode": "types",
                    "use_template": "on",
                },
            )

        # Should still succeed, but template should be ignored
        assert response.status_code == 200

    @patch("src.api.routes.PDFGenerator")
    @patch("src.api.routes.ENABLE_TEMPLATE_DEBUG", True)
    def test_generate_pdf_template_exists(self, mock_pdf_gen, client, tmp_path):
        """Test PDF generation when template file exists."""

        # Create a real template file
        template_file = tmp_path / "avery-5160.pdf"
        template_file.write_bytes(b"%PDF-1.4\nfake template\n%%EOF")

        # Patch TEMPLATE_PDF_FILES to point to our test file
        with patch("src.api.routes.TEMPLATE_PDF_FILES", {"avery5160": str(template_file)}):
            mock_generator_instance = Mock()
            mock_buffer = BytesIO(b"%PDF-1.4 fake pdf content")
            mock_generator_instance.generate.return_value = mock_buffer
            mock_pdf_gen.return_value = mock_generator_instance

            response = client.post(
                "/generate-pdf",
                data={
                    "card_type_ids": ["White:Creature"],
                    "view_mode": "types",
                    "use_template": "on",
                    "template": "avery5160",
                },
            )

            # Should succeed with template
            assert response.status_code == 200
            # Verify PDFGenerator was called with template_path
            call_args = mock_pdf_gen.call_args
            assert call_args[1]["template_path"] == str(template_file)

    @patch("src.api.routes.PDFGenerator")
    @patch("src.api.routes.ENABLE_TEMPLATE_DEBUG", True)
    def test_generate_pdf_template_not_found(self, mock_pdf_gen, client):
        """Test PDF generation when template file doesn't exist."""
        # Patch TEMPLATE_PDF_FILES to point to nonexistent file
        with patch("src.api.routes.TEMPLATE_PDF_FILES", {"avery5160": "/nonexistent/template.pdf"}):
            mock_generator_instance = Mock()
            mock_buffer = BytesIO(b"%PDF-1.4 fake pdf content")
            mock_generator_instance.generate.return_value = mock_buffer
            mock_pdf_gen.return_value = mock_generator_instance

            response = client.post(
                "/generate-pdf",
                data={
                    "card_type_ids": ["White:Creature"],
                    "view_mode": "types",
                    "use_template": "on",
                    "template": "avery5160",
                },
            )

            # Should still succeed without template
            assert response.status_code == 200
            # Verify PDFGenerator was called without template_path (None)
            call_args = mock_pdf_gen.call_args
            assert call_args[1]["template_path"] is None

    @patch("src.api.routes.PDFGenerator")
    @patch("src.api.routes.ENABLE_TEMPLATE_DEBUG", True)
    def test_generate_pdf_no_template_mapping(self, mock_pdf_gen, client):
        """Test PDF generation when no template mapping exists."""
        # Patch TEMPLATE_PDF_FILES to not have the nonexistent template
        with patch("src.api.routes.TEMPLATE_PDF_FILES", {}):
            mock_generator_instance = Mock()
            mock_buffer = BytesIO(b"%PDF-1.4 fake pdf content")
            mock_generator_instance.generate.return_value = mock_buffer
            mock_pdf_gen.return_value = mock_generator_instance

            response = client.post(
                "/generate-pdf",
                data={
                    "card_type_ids": ["White:Creature"],
                    "view_mode": "types",
                    "use_template": "on",
                    "template": "nonexistent_template",
                },
            )

            # Should still succeed, but without template_path (None)
            assert response.status_code == 200
            # Verify PDFGenerator was called without template_path (None)
            call_args = mock_pdf_gen.call_args
            assert call_args[1]["template_path"] is None
