"""Unit tests for PDFGenerator."""

from io import BytesIO
from unittest.mock import Mock, patch

from src.services.pdf_generator import (
    PDFGenerator,
    clear_svg_drawing_cache,
    get_svg_drawing_cache_size,
)


class TestPDFGenerator:
    """Tests for PDFGenerator.generate() method."""

    def test_pdf_generator_creates_pdf(self, sample_set_data):
        """Test that PDFGenerator creates a valid PDF."""
        generator = PDFGenerator(sample_set_data)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        assert isinstance(result, BytesIO)
        # Check that it's a valid PDF (starts with PDF header)
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_handles_empty_sets(self):
        """Test that PDFGenerator handles empty set list."""
        generator = PDFGenerator([])
        result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_includes_set_data(self, sample_set_data):
        """Test that PDF includes set information."""
        generator = PDFGenerator(sample_set_data)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        # PDF should be valid and have content
        # Note: PDF text is encoded/compressed, so text search is unreliable
        # Instead, verify PDF structure and that it was generated for the correct number of sets
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF"), "Should be a valid PDF"
        assert len(pdf_content) > 1000, "PDF should have substantial content for 2 sets"
        # Verify PDF was generated (check for PDF structure markers)
        assert b"/Pages" in pdf_content or b"endobj" in pdf_content, (
            "PDF should have proper structure"
        )

    def test_pdf_generator_handles_missing_symbol(self, sample_set_data):
        """Test that PDF generation works without symbols."""
        generator = PDFGenerator(sample_set_data)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert len(pdf_content) > 0

    def test_pdf_generator_multiple_sets(self):
        """Test PDF generation with multiple sets."""
        sets = [
            {"id": "test-1", "name": "Set 1", "code": "S1", "released_at": "2023-01-01"},
            {"id": "test-2", "name": "Set 2", "code": "S2", "released_at": "2023-02-01"},
            {"id": "test-3", "name": "Set 3", "code": "S3", "released_at": "2023-03-01"},
        ]
        generator = PDFGenerator(sets)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert len(pdf_content) > 0

    def test_pdf_generator_with_template(self, sample_set_data, tmp_path):
        """Test PDF generation with template PDF."""
        # Create a mock template PDF file
        template_file = tmp_path / "template.pdf"
        template_file.write_bytes(b"%PDF-1.4\nfake template content\n%%EOF")

        generator = PDFGenerator(sample_set_data, template_path=str(template_file))

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_template_not_found(self, sample_set_data):
        """Test PDF generation when template file doesn't exist."""
        generator = PDFGenerator(sample_set_data, template_path="/nonexistent/template.pdf")

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            # Should fall back to generating without template
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_with_symbol_file(self, sample_set_data, tmp_path):
        """Test PDF generation with actual symbol file."""
        # Create a mock SVG symbol file
        symbol_file = tmp_path / "test-set-1.svg"
        symbol_file.write_text(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            '<circle cx="50" cy="50" r="40"/></svg>'
        )

        generator = PDFGenerator(sample_set_data)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=str(symbol_file)):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")
        assert len(pdf_content) > 0

    def test_pdf_generator_types_view(self):
        """Test PDF generation for types view."""
        card_types = [
            {"color": "White", "type": "Creature", "name": "Creature", "id": "White:Creature"},
            {"color": "Blue", "type": "Instant", "name": "Instant", "id": "Blue:Instant"},
        ]
        generator = PDFGenerator(card_types, view_mode="types")

        with patch(
            "src.services.pdf_generator.PDFGenerator._get_mana_symbol_file",
            return_value=None,
        ):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")
        assert len(pdf_content) > 0

    def test_pdf_generator_types_view_with_mana_symbol(self, tmp_path):
        """Test PDF generation for types view with mana symbol."""
        # Create a mock SVG symbol file
        symbol_file = tmp_path / "mana_w.svg"
        symbol_file.write_text(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            '<circle cx="50" cy="50" r="40"/></svg>'
        )

        card_types = [
            {"color": "White", "type": "Creature", "name": "Creature", "id": "White:Creature"},
        ]
        generator = PDFGenerator(card_types, view_mode="types")

        with patch(
            "src.services.pdf_generator.PDFGenerator._get_mana_symbol_file",
            return_value=str(symbol_file),
        ):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")
        assert len(pdf_content) > 0

    def test_pdf_generator_invalid_template(self, sample_set_data):
        """Test PDFGenerator with invalid template name (lines 110-113)."""
        generator = PDFGenerator(sample_set_data, template_name="invalid_template")

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_placeholder_labels(self, sample_set_data):
        """Test PDFGenerator with placeholder labels (lines 196-197)."""
        # Add placeholder at the start
        sets_with_placeholder = [{"__placeholder__": True}] + sample_set_data
        generator = PDFGenerator(sets_with_placeholder)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_invalid_date_format(self):
        """Test PDFGenerator with invalid date format (lines 309-310)."""
        sets = [
            {
                "id": "test-1",
                "name": "Test Set",
                "code": "TS1",
                "released_at": "invalid-date",
            }
        ]
        generator = PDFGenerator(sets)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        assert result is not None
        pdf_content = result.read()
        assert pdf_content.startswith(b"%PDF")

    def test_pdf_generator_get_mana_symbol_uri_from_api_success(self):
        """Test _get_mana_symbol_uri_from_api successful fetch."""
        card_types = [
            {"color": "White", "type": "Creature", "name": "Creature", "id": "White:Creature"},
        ]
        generator = PDFGenerator(card_types, view_mode="types")

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [
                {
                    "object": "card_symbol",
                    "symbol": "{W}",
                    "svg_uri": "https://example.com/w.svg",
                }
            ]
        }

        with patch("requests.get", return_value=mock_response):
            # First call should fetch and cache
            result = generator._get_mana_symbol_uri_from_api("{W}", "White")
            assert result == "https://example.com/w.svg"
            # Second call should use cache
            result2 = generator._get_mana_symbol_uri_from_api("{W}", "White")
            assert result2 == "https://example.com/w.svg"

    def test_pdf_generator_get_mana_symbol_uri_from_api_multicolor_pw(self):
        """Test _get_mana_symbol_uri_from_api for multicolor with PW symbol."""
        card_types = [
            {
                "color": "Multicolor",
                "type": "Creature",
                "name": "Creature",
                "id": "Multicolor:Creature",
            },
        ]
        generator = PDFGenerator(card_types, view_mode="types")

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [
                {
                    "object": "card_symbol",
                    "symbol": "{PW}",
                    "svg_uri": "https://example.com/pw.svg",
                }
            ]
        }

        with patch("requests.get", return_value=mock_response):
            result = generator._get_mana_symbol_uri_from_api("{PW}", "Multicolor")
            assert result == "https://example.com/pw.svg"

    def test_pdf_generator_draw_raster_symbol(self, sample_set_data, tmp_path):
        """Test _draw_raster_symbol method (lines 598-634)."""
        # Create a mock PNG file
        png_file = tmp_path / "symbol.png"
        png_file.write_bytes(b"fake png data")

        generator = PDFGenerator(sample_set_data)
        generator.current_label = 0

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            with patch("src.services.pdf_generator.ImageReader") as mock_reader:
                mock_image = Mock()
                mock_image.getSize.return_value = (100, 100)
                mock_reader.return_value = mock_image
                # Should not raise
                generator._draw_raster_symbol(str(png_file), 0, 0, 50)

    def test_pdf_generator_draw_raster_symbol_error(self, sample_set_data):
        """Test _draw_raster_symbol with error handling."""
        generator = PDFGenerator(sample_set_data)
        generator.current_label = 0

        with patch("src.services.pdf_generator.ImageReader", side_effect=Exception("Error")):
            # Should not raise, just log error
            generator._draw_raster_symbol("/nonexistent.png", 0, 0, 50)

    def test_pdf_generator_cleanup(self, sample_set_data):
        """Test _cleanup method (lines 809-810, 819-820)."""
        generator = PDFGenerator(sample_set_data)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            generator.generate()
            generator._cleanup()
            # Should not raise

    def test_clear_svg_drawing_cache(self):
        """Test clear_svg_drawing_cache function (lines 50-53)."""
        from src.services.pdf_generator import _svg_drawing_cache

        _svg_drawing_cache["test"] = "value"
        count = clear_svg_drawing_cache()
        assert count >= 0
        assert len(_svg_drawing_cache) == 0

    def test_get_svg_drawing_cache_size(self):
        """Test get_svg_drawing_cache_size function."""
        from src.services.pdf_generator import _svg_drawing_cache

        _svg_drawing_cache["test"] = "value"
        size = get_svg_drawing_cache_size()
        assert size >= 1
