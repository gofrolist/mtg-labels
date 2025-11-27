"""Unit tests for helper functions."""

from io import BytesIO
from unittest.mock import Mock, patch

import requests
from reportlab.pdfgen import canvas

from src.config import ABBREVIATION_MAP, MAX_SET_NAME_LENGTH
from src.services.helpers import (
    abbreviate_set_name,
    fit_text_to_width,
    get_svg_intrinsic_dimensions,
    get_symbol_file,
)


class TestAbbreviateSetName:
    """Tests for abbreviate_set_name() function."""

    def test_abbreviate_set_name_in_map(self):
        """Test that names in abbreviation map are abbreviated."""
        test_name = "Adventures in the Forgotten Realms"
        result = abbreviate_set_name(test_name)
        assert result == ABBREVIATION_MAP[test_name]

    def test_abbreviate_set_name_too_long(self):
        """Test that names longer than max length are truncated."""
        long_name = "A" * (MAX_SET_NAME_LENGTH + 10)
        result = abbreviate_set_name(long_name)
        assert len(result) <= MAX_SET_NAME_LENGTH
        assert result.endswith("...")

    def test_abbreviate_set_name_normal(self):
        """Test that normal length names are returned unchanged."""
        normal_name = "Test Set Name"
        result = abbreviate_set_name(normal_name)
        assert result == normal_name

    def test_abbreviate_set_name_exact_max_length(self):
        """Test that names exactly at max length are returned unchanged."""
        exact_name = "A" * MAX_SET_NAME_LENGTH
        result = abbreviate_set_name(exact_name)
        assert result == exact_name


class TestFitTextToWidth:
    """Tests for fit_text_to_width() function."""

    def test_fit_text_to_width_fits(self):
        """Test that text that fits is returned unchanged."""
        buffer = BytesIO()
        c = canvas.Canvas(buffer)
        text = "Short Text"
        result = fit_text_to_width(text, "Helvetica", 12, 200, c)
        assert result == text

    def test_fit_text_to_width_truncates(self):
        """Test that text that doesn't fit is truncated."""
        buffer = BytesIO()
        c = canvas.Canvas(buffer)
        text = "Very Long Text That Will Not Fit"
        result = fit_text_to_width(text, "Helvetica", 12, 50, c)
        assert result != text
        assert result.endswith("...")
        assert len(result) < len(text)

    def test_fit_text_to_width_empty_string(self):
        """Test handling of empty string."""
        buffer = BytesIO()
        c = canvas.Canvas(buffer)
        result = fit_text_to_width("", "Helvetica", 12, 50, c)
        assert result == ""

    def test_fit_text_to_width_very_small_width(self):
        """Test handling of very small max width."""
        buffer = BytesIO()
        c = canvas.Canvas(buffer)
        text = "Test"
        result = fit_text_to_width(text, "Helvetica", 12, 1, c)
        assert result.endswith("...")


class TestGetSymbolFile:
    """Tests for get_symbol_file() function."""

    def test_get_symbol_file_no_url(self):
        """Test that None is returned when no icon_svg_uri."""
        set_data = {"id": "test-1", "name": "Test Set"}
        result = get_symbol_file(set_data)
        assert result is None

    def test_get_symbol_file_cached(self, tmp_path, monkeypatch):
        """Test that cached file is returned if it exists."""
        # Create temp directory structure
        images_dir = tmp_path / "static" / "images"
        images_dir.mkdir(parents=True)

        # Create cached file
        cached_file = images_dir / "test-set-id.svg"
        cached_file.write_text("<svg></svg>")

        # Mock cache manager to return cached file
        mock_cache_manager = Mock()
        mock_cache_manager.get_symbol.return_value = str(cached_file)
        monkeypatch.setattr("src.services.helpers.get_cache_manager", lambda: mock_cache_manager)

        set_data = {
            "id": "test-set-id",
            "name": "Test Set",
            "icon_svg_uri": "https://example.com/symbol.svg",
        }
        result = get_symbol_file(set_data)
        assert result is not None
        assert "test-set-id.svg" in result
        mock_cache_manager.get_symbol.assert_called_once_with("test-set-id")

    def test_get_symbol_file_downloads(self, tmp_path, monkeypatch):
        """Test that symbol is downloaded if not cached."""
        # Create temp directory structure
        images_dir = tmp_path / "static" / "images"
        images_dir.mkdir(parents=True)
        cached_file = images_dir / "test-set-id.svg"

        # Mock cache manager - no cached file, but save_symbol succeeds
        mock_cache_manager = Mock()
        mock_cache_manager.get_symbol.return_value = None  # Not cached
        mock_cache_manager.save_symbol.return_value = str(cached_file)  # Save succeeds

        monkeypatch.setattr("src.services.helpers.get_cache_manager", lambda: mock_cache_manager)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = b"<svg></svg>"

        set_data = {
            "id": "test-set-id",
            "name": "Test Set",
            "icon_svg_uri": "https://example.com/symbol.svg",
        }

        with patch("src.services.helpers.requests.get", return_value=mock_response):
            result = get_symbol_file(set_data)
            # Should attempt to download
            assert result is not None
            assert result == str(cached_file)
            mock_cache_manager.get_symbol.assert_called_once_with("test-set-id")
            mock_cache_manager.save_symbol.assert_called_once_with("test-set-id", b"<svg></svg>")

    def test_get_symbol_file_download_error(self, tmp_path, monkeypatch):
        """Test handling of download errors."""
        # Mock cache manager - no cached file
        mock_cache_manager = Mock()
        mock_cache_manager.get_symbol.return_value = None  # Not cached

        monkeypatch.setattr("src.services.helpers.get_cache_manager", lambda: mock_cache_manager)

        set_data = {
            "id": "test-set-id",
            "name": "Test Set",
            "icon_svg_uri": "https://example.com/symbol.svg",
        }

        with patch(
            "src.services.helpers.requests.get",
            side_effect=requests.RequestException("Network error"),
        ):
            result = get_symbol_file(set_data)
            assert result is None
            mock_cache_manager.get_symbol.assert_called_once_with("test-set-id")
            # save_symbol should not be called on error
            mock_cache_manager.save_symbol.assert_not_called()


class TestGetSvgIntrinsicDimensions:
    """Tests for get_svg_intrinsic_dimensions() function."""

    def test_get_svg_intrinsic_dimensions_success(self, tmp_path):
        """Test successful extraction of dimensions from viewBox."""
        svg_content = (
            '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" '
            'viewBox="0 0 100 200"></svg>'
        )
        svg_file = tmp_path / "test.svg"
        svg_file.write_text(svg_content)

        result = get_svg_intrinsic_dimensions(str(svg_file))
        assert result == (100.0, 200.0)

    def test_get_svg_intrinsic_dimensions_no_viewbox(self, tmp_path):
        """Test handling of SVG without viewBox."""
        svg_content = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>'
        svg_file = tmp_path / "test.svg"
        svg_file.write_text(svg_content)

        result = get_svg_intrinsic_dimensions(str(svg_file))
        assert result is None

    def test_get_svg_intrinsic_dimensions_invalid_file(self):
        """Test handling of invalid SVG file."""
        result = get_svg_intrinsic_dimensions("/nonexistent/file.svg")
        assert result is None

    def test_get_svg_intrinsic_dimensions_malformed_viewbox(self, tmp_path):
        """Test handling of malformed viewBox."""
        svg_content = (
            '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="invalid"></svg>'
        )
        svg_file = tmp_path / "test.svg"
        svg_file.write_text(svg_content)

        result = get_svg_intrinsic_dimensions(str(svg_file))
        assert result is None
