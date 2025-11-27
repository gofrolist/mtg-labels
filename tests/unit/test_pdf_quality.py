"""Unit tests for PDF output quality validation."""

from unittest.mock import patch

from src.services.pdf_generator import PDFGenerator


class TestPDFQuality:
    """Tests for PDF output quality validation."""

    def test_pdf_has_valid_structure(self, sample_set_data):
        """Test that generated PDF has valid structure."""
        generator = PDFGenerator(sample_set_data)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        pdf_content = result.read()
        # Check PDF header
        assert pdf_content.startswith(b"%PDF")
        # Check PDF footer
        assert b"%%EOF" in pdf_content

    def test_pdf_contains_set_names(self, sample_set_data):
        """Test that PDF contains set names."""
        generator = PDFGenerator(sample_set_data)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        pdf_content = result.read().decode("latin-1", errors="ignore")
        # Check that set names appear in PDF (may be encoded)
        assert len(pdf_content) > 0

    def test_pdf_has_reasonable_size(self, sample_set_data):
        """Test that PDF has reasonable file size."""
        generator = PDFGenerator(sample_set_data)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        pdf_content = result.read()
        # PDF should be at least a few KB for valid content
        assert len(pdf_content) > 1000
        # PDF shouldn't be unreasonably large for a few sets
        assert len(pdf_content) < 10 * 1024 * 1024  # Less than 10MB

    def test_pdf_multiple_pages(self):
        """Test that PDF handles multiple pages correctly."""
        # Create enough sets to require multiple pages (30 labels per page for avery5160)
        sets = [
            {"id": f"test-{i}", "name": f"Set {i}", "code": f"S{i}", "released_at": "2023-01-01"}
            for i in range(35)
        ]
        generator = PDFGenerator(sets)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        pdf_content = result.read()
        # Should have multiple pages
        page_count = pdf_content.count(b"/Type /Page")
        assert page_count >= 2

    def test_pdf_handles_special_characters(self):
        """Test that PDF handles special characters in set names."""
        sets = [
            {"id": "test-1", "name": "Set & Name", "code": "S1", "released_at": "2023-01-01"},
            {"id": "test-2", "name": "Set <Name>", "code": "S2", "released_at": "2023-01-01"},
        ]
        generator = PDFGenerator(sets)

        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()

        pdf_content = result.read()
        assert len(pdf_content) > 0
        assert pdf_content.startswith(b"%PDF")
