"""Unit tests for ScryfallClient."""

from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest
import requests
from fastapi import HTTPException

from src.cache.cache_manager import CachedSetData, get_cache_manager
from src.services.scryfall_client import ScryfallClient


class TestScryfallClientFetchSets:
    """Tests for ScryfallClient.fetch_sets() method."""

    def test_fetch_sets_success(self, mock_scryfall_response):
        """Test successful fetch of sets from API."""
        # Clear cache to ensure we get fresh data
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_scryfall_response

        with patch.object(client.session, "get", return_value=mock_response):
            result = client.fetch_sets()

        assert len(result) == 2
        assert result[0]["id"] == "test-set-1"
        assert result[1]["id"] == "test-set-2"

    def test_fetch_sets_uses_cache(self, mock_scryfall_response):
        """Test that fetch_sets uses cached data on second call."""
        # Clear cache to ensure we start fresh
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_scryfall_response

        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            # First call
            result1 = client.fetch_sets()
            # Second call should use cache
            result2 = client.fetch_sets()

        assert result1 == result2
        # Should only call API once
        assert mock_get.call_count == 1

    def test_fetch_sets_network_error(self):
        """Test handling of network errors."""
        # Clear cache to ensure we get fresh data
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()

        with patch.object(
            client.session, "get", side_effect=requests.RequestException("Network error")
        ):
            with pytest.raises(HTTPException) as exc_info:
                client.fetch_sets()

            assert exc_info.value.status_code == 500
            assert "Error fetching sets" in exc_info.value.detail

    def test_fetch_sets_api_error(self):
        """Test handling of API errors (non-200 status)."""
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
            assert "Error fetching sets" in exc_info.value.detail

    def test_fetch_sets_uses_legacy_cache_format(self, mock_scryfall_response):
        """Test that fetch_sets handles legacy cache format (list)."""
        # Clear cache to ensure we start fresh
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_scryfall_response

        # Set legacy cache format (list instead of CachedSetData)
        sets_data = mock_scryfall_response["data"]
        cache_manager.set("sets", sets_data)

        # Should use cached data without making API call
        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            result = client.fetch_sets()

        assert len(result) == 2
        assert result[0]["id"] == "test-set-1"
        # Should not call API when using cache
        assert mock_get.call_count == 0

    def test_fetch_sets_all_retries_fail(self):
        """Test handling when all retry attempts fail."""
        # Clear cache to ensure we get fresh data
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()

        # Mock session.get to always raise RequestException
        with patch.object(
            client.session, "get", side_effect=requests.RequestException("Network error")
        ):
            with patch("src.services.scryfall_client.SCRYFALL_API_RETRY_ATTEMPTS", 1):
                with pytest.raises(HTTPException) as exc_info:
                    client.fetch_sets()

                assert exc_info.value.status_code == 500
                assert "Error fetching sets" in exc_info.value.detail

    def test_fetch_sets_expired_cache(self, mock_scryfall_response):
        """Test that expired cache triggers fresh fetch."""
        # Clear cache to ensure we start fresh
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_scryfall_response

        # Create expired cache entry
        expired_sets = mock_scryfall_response["data"]
        expired_cache = CachedSetData(
            sets=expired_sets,
            cached_at=datetime.now() - timedelta(days=2),
            expires_at=datetime.now() - timedelta(days=1),  # Expired yesterday
        )
        # Set expired cache
        cache_manager.set("sets", expired_cache)

        # Mock get() to return expired cache on first call (for is_expired check),
        # then None on second call (so get_or_fetch calls fetch_from_api)
        call_count = {"count": 0}

        def mock_get(key: str):
            call_count["count"] += 1
            if key == "sets" and call_count["count"] == 1:
                return expired_cache
            # Return None on subsequent calls so get_or_fetch triggers fetch
            return None

        # Should fetch fresh data instead of using expired cache
        with patch.object(cache_manager, "get", side_effect=mock_get):
            with patch.object(client.session, "get", return_value=mock_response) as mock_get_api:
                result = client.fetch_sets()

        assert isinstance(result, list)
        assert len(result) == 2
        assert result[0]["id"] == "test-set-1"
        # Should have called API to fetch fresh data
        assert mock_get_api.call_count == 1

    def test_fetch_sets_zero_retries(self):
        """Test handling when retry attempts is 0 (edge case)."""
        # Clear cache to ensure we get fresh data
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()

        # Patch retry attempts to 0 to test unreachable code path
        with patch("src.services.scryfall_client.SCRYFALL_API_RETRY_ATTEMPTS", 0):
            with pytest.raises(HTTPException) as exc_info:
                client.fetch_sets()

            assert exc_info.value.status_code == 500
            assert "Network error fetching sets from Scryfall" in exc_info.value.detail


class TestScryfallClientFilterSets:
    """Tests for ScryfallClient.filter_sets() static method."""

    def test_filter_sets_includes_valid_sets(self, sample_set_data):
        """Test that valid sets are included."""
        filtered = ScryfallClient.filter_sets(sample_set_data)
        assert len(filtered) == 2
        assert all(s["id"] in ["test-set-1", "test-set-2"] for s in filtered)

    def test_filter_sets_excludes_wrong_type(self):
        """Test that sets with wrong set_type are excluded."""
        sets = [
            {
                "id": "test-1",
                "name": "Test 1",
                "code": "T1",
                "set_type": "expansion",
                "card_count": 100,
            },
            {
                "id": "test-2",
                "name": "Test 2",
                "code": "T2",
                "set_type": "invalid_type",
                "card_count": 100,
            },
        ]
        filtered = ScryfallClient.filter_sets(sets)
        assert len(filtered) == 1
        assert filtered[0]["id"] == "test-1"

    @patch("src.services.scryfall_client.MINIMUM_SET_SIZE", 50)
    def test_filter_sets_excludes_small_sets(self):
        """Test that sets below minimum size are excluded."""
        sets = [
            {
                "id": "test-1",
                "name": "Test 1",
                "code": "T1",
                "set_type": "expansion",
                "card_count": 100,
            },
            {
                "id": "test-2",
                "name": "Test 2",
                "code": "T2",
                "set_type": "expansion",
                "card_count": 30,
            },
        ]
        filtered = ScryfallClient.filter_sets(sets)
        assert len(filtered) == 1
        assert filtered[0]["id"] == "test-1"

    def test_filter_sets_excludes_ignored_sets(self):
        """Test that ignored sets are excluded."""
        sets = [
            {
                "id": "test-1",
                "name": "Test 1",
                "code": "T1",
                "set_type": "expansion",
                "card_count": 100,
            },
            {
                "id": "test-2",
                "name": "Test 2",
                "code": "cmb1",
                "set_type": "expansion",
                "card_count": 100,
            },
        ]
        filtered = ScryfallClient.filter_sets(sets)
        assert len(filtered) == 1
        assert filtered[0]["id"] == "test-1"

    def test_filter_sets_case_insensitive(self):
        """Test that filtering is case-insensitive for set_type and code."""
        sets = [
            {
                "id": "test-1",
                "name": "Test 1",
                "code": "T1",
                "set_type": "EXPANSION",
                "card_count": 100,
            },
            {
                "id": "test-2",
                "name": "Test 2",
                "code": "CMB1",
                "set_type": "expansion",
                "card_count": 100,
            },
        ]
        filtered = ScryfallClient.filter_sets(sets)
        assert len(filtered) == 1
        assert filtered[0]["id"] == "test-1"

    def test_filter_sets_excludes_digital_sets(self):
        """Test that digital-only sets are excluded."""
        sets = [
            {
                "id": "test-1",
                "name": "Test 1",
                "code": "T1",
                "set_type": "expansion",
                "card_count": 100,
                "digital": False,
            },
            {
                "id": "test-2",
                "name": "Test 2",
                "code": "T2",
                "set_type": "expansion",
                "card_count": 100,
                "digital": True,
            },
        ]
        filtered = ScryfallClient.filter_sets(sets)
        assert len(filtered) == 1
        assert filtered[0]["id"] == "test-1"


class TestScryfallClientGroupSets:
    """Tests for ScryfallClient.group_sets() static method."""

    def test_group_sets_by_type(self, sample_set_data):
        """Test that sets are grouped by set_type."""
        grouped = ScryfallClient.group_sets(sample_set_data)
        assert "Expansion" in grouped
        assert "Core" in grouped
        assert len(grouped["Expansion"]) == 1
        assert len(grouped["Core"]) == 1

    def test_group_sets_capitalizes_type(self):
        """Test that set_type is capitalized in group names."""
        sets = [
            {
                "id": "test-1",
                "name": "Test 1",
                "code": "T1",
                "set_type": "expansion",
                "card_count": 100,
            },
        ]
        grouped = ScryfallClient.group_sets(sets)
        assert "Expansion" in grouped
        assert "expansion" not in grouped

    def test_group_sets_handles_missing_type(self):
        """Test that sets without set_type are grouped as 'Other'."""
        sets = [
            {"id": "test-1", "name": "Test 1", "code": "T1", "card_count": 100},
        ]
        grouped = ScryfallClient.group_sets(sets)
        assert "Other" in grouped
        assert len(grouped["Other"]) == 1

    def test_group_sets_empty_list(self):
        """Test grouping empty list returns empty dict."""
        grouped = ScryfallClient.group_sets([])
        assert grouped == {}


class TestScryfallClientFetchCardTypesCatalog:
    """Tests for ScryfallClient.fetch_card_types_catalog() method."""

    def test_fetch_card_types_catalog_success(self):
        """Test successful fetch of card types catalog from API."""
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "object": "catalog",
            "uri": "https://api.scryfall.com/catalog/card-types",
            "total_values": 17,
            "data": [
                "Artifact",
                "Battle",
                "Conspiracy",
                "Creature",
                "Dungeon",
                "Emblem",
                "Enchantment",
                "Hero",
                "Instant",
                "Kindred",
                "Land",
                "Phenomenon",
                "Plane",
                "Planeswalker",
                "Scheme",
                "Sorcery",
                "Vanguard",
            ],
        }

        with patch.object(client.session, "get", return_value=mock_response):
            result = client.fetch_card_types_catalog()

        assert isinstance(result, list)
        assert len(result) == 17
        assert "Creature" in result
        assert "Instant" in result
        assert "Sorcery" in result

    def test_fetch_card_types_catalog_uses_cache(self):
        """Test that fetch_card_types_catalog uses cached data on second call."""
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "object": "catalog",
            "data": ["Creature", "Instant", "Sorcery"],
        }

        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            # First call
            result1 = client.fetch_card_types_catalog()
            # Second call should use cache
            result2 = client.fetch_card_types_catalog()

        assert result1 == result2
        # Should only call API once
        assert mock_get.call_count == 1

    def test_fetch_card_types_catalog_uses_instance_cache(self):
        """Test that instance cache is used before API call."""
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()
        # Set instance cache directly
        client._card_types_cache = ["Creature", "Instant", "Sorcery"]

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"object": "catalog", "data": ["Artifact"]}

        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            result = client.fetch_card_types_catalog()

        assert result == ["Creature", "Instant", "Sorcery"]
        # Should not call API when using instance cache
        assert mock_get.call_count == 0

    def test_fetch_card_types_catalog_network_error(self):
        """Test handling of network errors."""
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()

        with patch.object(
            client.session, "get", side_effect=requests.RequestException("Network error")
        ):
            with pytest.raises(HTTPException) as exc_info:
                client.fetch_card_types_catalog()

            assert exc_info.value.status_code == 500
            assert "Error fetching card types catalog" in exc_info.value.detail

    def test_fetch_card_types_catalog_api_error(self):
        """Test handling of API errors (non-200 status)."""
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()
        mock_response = Mock()
        mock_response.status_code = 500

        with patch.object(client.session, "get", return_value=mock_response):
            with pytest.raises(HTTPException) as exc_info:
                client.fetch_card_types_catalog()

            assert exc_info.value.status_code == 500
            assert "Error fetching card types catalog" in exc_info.value.detail

    def test_fetch_card_types_catalog_invalid_response_format(self):
        """Test handling of invalid response format."""
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"object": "not_catalog", "data": []}

        with patch.object(client.session, "get", return_value=mock_response):
            with pytest.raises(HTTPException) as exc_info:
                client.fetch_card_types_catalog()

            assert exc_info.value.status_code == 500
            assert "Unexpected response format" in exc_info.value.detail


class TestScryfallClientGetCardTypesByColor:
    """Tests for ScryfallClient.get_card_types_by_color() method."""

    @patch("src.services.scryfall_client.ScryfallClient.fetch_card_types_catalog")
    def test_get_card_types_by_color_success(self, mock_fetch_catalog):
        """Test successful organization of card types by color."""
        cache_manager = get_cache_manager()
        cache_manager.clear()

        mock_fetch_catalog.return_value = [
            "Artifact",
            "Battle",
            "Conspiracy",
            "Creature",
            "Dungeon",
            "Emblem",
            "Enchantment",
            "Hero",
            "Instant",
            "Kindred",
            "Land",
            "Phenomenon",
            "Plane",
            "Planeswalker",
            "Scheme",
            "Sorcery",
            "Vanguard",
        ]

        client = ScryfallClient()
        result = client.get_card_types_by_color()

        # Should have all 7 colors
        assert len(result) == 7
        assert "White" in result
        assert "Blue" in result
        assert "Black" in result
        assert "Red" in result
        assert "Green" in result
        assert "Multicolor" in result
        assert "Colorless" in result

        # Should exclude the excluded types
        for color in result:
            assert "Conspiracy" not in result[color]
            assert "Dungeon" not in result[color]
            assert "Emblem" not in result[color]
            assert "Hero" not in result[color]
            assert "Phenomenon" not in result[color]
            assert "Plane" not in result[color]
            assert "Scheme" not in result[color]
            assert "Vanguard" not in result[color]

        # Should include common types
        assert "Creature" in result["White"]
        assert "Instant" in result["White"]
        assert "Sorcery" in result["White"]
        assert "Enchantment" in result["White"]
        assert "Artifact" in result["White"]
        assert "Planeswalker" in result["White"]
        assert "Land" in result["White"]
        assert "Battle" in result["White"]
        assert "Kindred" in result["White"]

        # All colors should have the same types
        white_types = result["White"]
        for color in ["Blue", "Black", "Red", "Green", "Multicolor", "Colorless"]:
            assert result[color] == white_types

    @patch("src.services.scryfall_client.ScryfallClient.fetch_card_types_catalog")
    def test_get_card_types_by_color_fallback_on_error(self, mock_fetch_catalog):
        """Test that fallback types are used when catalog fetch fails."""
        cache_manager = get_cache_manager()
        cache_manager.clear()

        mock_fetch_catalog.side_effect = HTTPException(status_code=500, detail="API Error")

        client = ScryfallClient()
        result = client.get_card_types_by_color()

        # Should still return structure with fallback types
        assert len(result) == 7
        assert "White" in result
        # Should have fallback types
        assert "Creature" in result["White"]
        assert "Instant" in result["White"]
        assert "Battle" in result["White"]

    @patch("src.services.scryfall_client.ScryfallClient.fetch_card_types_catalog")
    def test_get_card_types_by_color_prioritizes_common_types(self, mock_fetch_catalog):
        """Test that common types appear first in the list."""
        mock_fetch_catalog.return_value = [
            "Artifact",
            "Battle",
            "Creature",
            "Enchantment",
            "Instant",
            "Kindred",
            "Land",
            "Planeswalker",
            "Sorcery",
        ]

        client = ScryfallClient()
        result = client.get_card_types_by_color()

        # Common types should appear first
        white_types = result["White"]
        assert white_types[0] == "Creature"
        assert white_types[1] == "Instant"
        assert white_types[2] == "Sorcery"
        assert white_types[3] == "Enchantment"
        assert white_types[4] == "Artifact"
        assert white_types[5] == "Planeswalker"
        assert white_types[6] == "Land"
        # Then other types
        assert "Battle" in white_types
        assert "Kindred" in white_types

    def test_fetch_card_types_catalog_uses_list_cache(self):
        """Test that list cache format is handled correctly."""
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()
        # Set cache as a list (not CachedSetData)
        cached_list = ["Creature", "Instant", "Sorcery"]
        cache_manager.set("card_types_catalog", cached_list)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"object": "catalog", "data": ["Artifact"]}

        with patch.object(client.session, "get", return_value=mock_response) as mock_get:
            result = client.fetch_card_types_catalog()

        assert result == cached_list
        # Should not call API when using list cache
        assert mock_get.call_count == 0

    def test_fetch_card_types_catalog_timeout_retry(self):
        """Test that timeout errors are retried."""
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"object": "catalog", "data": ["Creature"]}

        # First call times out, second succeeds
        with patch.object(
            client.session,
            "get",
            side_effect=[
                requests.Timeout("Timeout error"),
                mock_response,
            ],
        ):
            result = client.fetch_card_types_catalog()

        assert result == ["Creature"]

    def test_fetch_card_types_catalog_all_retries_fail_timeout(self):
        """Test handling when all retry attempts fail with timeout."""
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()

        with patch.object(client.session, "get", side_effect=requests.Timeout("Timeout error")):
            with patch("src.services.scryfall_client.SCRYFALL_API_RETRY_ATTEMPTS", 2):
                with pytest.raises(HTTPException) as exc_info:
                    client.fetch_card_types_catalog()

                assert exc_info.value.status_code == 500
                assert "Error fetching card types catalog" in exc_info.value.detail

    def test_fetch_card_types_catalog_all_retries_fail_request_exception(self):
        """Test handling when all retry attempts fail with RequestException."""
        cache_manager = get_cache_manager()
        cache_manager.clear()

        client = ScryfallClient()

        with patch.object(
            client.session,
            "get",
            side_effect=requests.RequestException("Network error"),
        ):
            with patch("src.services.scryfall_client.SCRYFALL_API_RETRY_ATTEMPTS", 2):
                with pytest.raises(HTTPException) as exc_info:
                    client.fetch_card_types_catalog()

                assert exc_info.value.status_code == 500
                # The error detail can be either message depending on which exception path is taken
                assert (
                    "Error fetching card types catalog" in exc_info.value.detail
                    or "Network error fetching card types catalog" in exc_info.value.detail
                )
