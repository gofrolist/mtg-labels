"""Unit tests for error handling scenarios."""

from unittest.mock import Mock, patch

import pytest
import requests
from fastapi import HTTPException

from src.cache.cache_manager import get_cache_manager
from src.services.helpers import get_symbol_file
from src.services.scryfall_client import ScryfallClient


class TestErrorHandling:
    """Tests for error handling in various scenarios."""

    def test_scryfall_client_network_error(self):
        """Test handling of network errors in ScryfallClient."""
        # Clear cache to ensure we get fresh data
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()

        with patch.object(
            client.session, "get", side_effect=requests.RequestException("Connection error")
        ):
            with pytest.raises(HTTPException) as exc_info:
                client.fetch_sets()

            assert exc_info.value.status_code == 500
            assert "Error fetching sets" in exc_info.value.detail

    def test_scryfall_client_timeout(self):
        """Test handling of timeout errors."""
        # Clear cache to ensure we get fresh data
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()

        with patch.object(client.session, "get", side_effect=requests.Timeout("Request timeout")):
            with pytest.raises(HTTPException) as exc_info:
                client.fetch_sets()

            assert exc_info.value.status_code == 500

    def test_scryfall_client_api_error_500(self):
        """Test handling of 500 error from API."""
        # Clear cache to ensure we get fresh data
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()
        mock_response = Mock()
        mock_response.status_code = 500

        with patch.object(client.session, "get", return_value=mock_response):
            with pytest.raises(HTTPException) as exc_info:
                client.fetch_sets()

            assert exc_info.value.status_code == 500

    def test_scryfall_client_api_error_404(self):
        """Test handling of 404 error from API."""
        # Clear cache to ensure we get fresh data
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()
        mock_response = Mock()
        mock_response.status_code = 404

        with patch.object(client.session, "get", return_value=mock_response):
            with pytest.raises(HTTPException) as exc_info:
                client.fetch_sets()

            assert exc_info.value.status_code == 500

    def test_get_symbol_file_network_error(self):
        """Test handling of network errors in get_symbol_file."""
        # Mock cache manager - no cached file
        mock_cache_manager = Mock()
        mock_cache_manager.get_symbol.return_value = None  # Not cached

        set_data = {
            "id": "test-1",
            "name": "Test Set",
            "icon_svg_uri": "https://example.com/symbol.svg",
        }

        with patch("src.services.helpers.get_cache_manager", return_value=mock_cache_manager):
            with patch(
                "src.services.helpers.requests.get",
                side_effect=requests.RequestException("Network error"),
            ):
                result = get_symbol_file(set_data)
                assert result is None

    def test_get_symbol_file_http_error(self):
        """Test handling of HTTP errors in get_symbol_file."""
        # Mock cache manager - no cached file
        mock_cache_manager = Mock()
        mock_cache_manager.get_symbol.return_value = None  # Not cached

        set_data = {
            "id": "test-1",
            "name": "Test Set",
            "icon_svg_uri": "https://example.com/symbol.svg",
        }

        mock_response = Mock()
        mock_response.status_code = 404

        with patch("src.services.helpers.get_cache_manager", return_value=mock_cache_manager):
            with patch("src.services.helpers.requests.get", return_value=mock_response):
                result = get_symbol_file(set_data)
                assert result is None

    def test_get_symbol_file_file_write_error(self, tmp_path, monkeypatch):
        """Test handling of file write errors."""
        # Mock cache manager - no cached file, but save_symbol fails
        mock_cache_manager = Mock()
        mock_cache_manager.get_symbol.return_value = None  # Not cached
        mock_cache_manager.save_symbol.return_value = None  # Save fails

        set_data = {
            "id": "test-1",
            "name": "Test Set",
            "icon_svg_uri": "https://example.com/symbol.svg",
        }

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = b"<svg></svg>"

        with patch("src.services.helpers.get_cache_manager", return_value=mock_cache_manager):
            with patch("src.services.helpers.requests.get", return_value=mock_response):
                result = get_symbol_file(set_data)
                assert result is None
