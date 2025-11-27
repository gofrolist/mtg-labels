"""Contract tests for Scryfall API interaction.

These tests verify that our code correctly interacts with the Scryfall API
and handles its response format correctly.
"""

from unittest.mock import Mock, patch

import pytest
import requests

from src.services.scryfall_client import ScryfallClient


class TestScryfallAPIContract:
    """Contract tests for Scryfall API."""

    def test_scryfall_api_response_format(self):
        """Test that we handle Scryfall API response format correctly."""
        # Clear cache to ensure we get fresh data
        from src.cache.cache_manager import get_cache_manager

        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()

        # Mock response matching Scryfall API format
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "object": "list",
            "has_more": False,
            "data": [
                {
                    "id": "test-id",
                    "name": "Test Set",
                    "code": "TST",
                    "set_type": "expansion",
                    "card_count": 100,
                    "released_at": "2023-01-01",
                    "icon_svg_uri": "https://example.com/symbol.svg",
                    "scryfall_uri": "https://api.scryfall.com/sets/test-id",
                }
            ],
        }

        with patch.object(client.session, "get", return_value=mock_response):
            result = client.fetch_sets()

        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0]["id"] == "test-id"
        assert result[0]["name"] == "Test Set"

    def test_scryfall_api_handles_missing_fields(self):
        """Test that we handle missing optional fields in API response."""
        # Clear cache to ensure we get fresh data
        from src.cache.cache_manager import get_cache_manager

        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [
                {
                    "id": "test-id",
                    "name": "Test Set",
                    "code": "TST",
                    "set_type": "expansion",
                    "card_count": 100,
                    # Missing optional fields: released_at, icon_svg_uri
                }
            ]
        }

        with patch.object(client.session, "get", return_value=mock_response):
            result = client.fetch_sets()

        assert len(result) == 1
        assert result[0]["id"] == "test-id"
        # Should handle missing fields gracefully - they should not be present
        assert "released_at" not in result[0]
        assert "icon_svg_uri" not in result[0]

    def test_scryfall_api_error_response_format(self):
        """Test that we handle Scryfall API error responses correctly."""
        # Clear cache to ensure we get fresh data
        from src.cache.cache_manager import get_cache_manager

        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()

        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.json.return_value = {
            "object": "error",
            "code": "not_found",
            "status": 404,
            "details": "The requested resource was not found",
        }

        with patch.object(client.session, "get", return_value=mock_response):
            from fastapi import HTTPException

            with pytest.raises(HTTPException) as exc_info:
                client.fetch_sets()

            assert exc_info.value.status_code == 500

    def test_scryfall_api_rate_limit_handling(self):
        """Test handling of rate limit responses (429)."""
        # Clear cache to ensure we get fresh data
        from src.cache.cache_manager import get_cache_manager

        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()

        mock_response = Mock()
        mock_response.status_code = 429
        mock_response.headers = {"Retry-After": "60"}

        with patch.object(client.session, "get", return_value=mock_response):
            from fastapi import HTTPException

            with pytest.raises(HTTPException) as exc_info:
                client.fetch_sets()

            assert exc_info.value.status_code == 500

    @pytest.mark.integration
    def test_scryfall_api_real_connection(self):
        """Integration test: Verify we can connect to real Scryfall API.

        This test is marked as integration and may be skipped in unit test runs.
        """
        client = ScryfallClient()

        try:
            result = client.fetch_sets()
            # Verify response structure
            assert isinstance(result, list)
            if len(result) > 0:
                # Verify set structure
                first_set = result[0]
                assert "id" in first_set
                assert "name" in first_set
                assert "code" in first_set
                assert "set_type" in first_set
        except requests.RequestException:
            pytest.skip("Cannot connect to Scryfall API (may be network issue)")
