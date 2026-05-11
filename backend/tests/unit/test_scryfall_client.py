"""Unit tests for ScryfallClient."""

from unittest.mock import Mock, patch

import pytest
import requests
from fastapi import HTTPException

from src.cache.cache_manager import get_cache_manager
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


class TestScryfallClientFilterNonDigital:
    """Tests for ScryfallClient.filter_non_digital() static method."""

    def test_returns_all_non_digital_sets(self):
        """All sets without digital=True are returned."""
        sets = [
            {
                "id": "a",
                "name": "A",
                "code": "a",
                "set_type": "expansion",
                "card_count": 100,
                "digital": False,
            },
            {
                "id": "b",
                "name": "B",
                "code": "b",
                "set_type": "promo",
                "card_count": 5,
                "digital": False,
            },
            {
                "id": "c",
                "name": "C",
                "code": "cmb1",
                "set_type": "funny",
                "card_count": 100,
                "digital": False,
            },
        ]
        result = ScryfallClient.filter_non_digital(sets)
        assert {s["id"] for s in result} == {"a", "b", "c"}

    def test_excludes_digital_sets(self):
        """Sets with digital=True are excluded."""
        sets = [
            {
                "id": "paper",
                "name": "Paper",
                "code": "p",
                "set_type": "expansion",
                "card_count": 100,
                "digital": False,
            },
            {
                "id": "online",
                "name": "Online",
                "code": "o",
                "set_type": "expansion",
                "card_count": 100,
                "digital": True,
            },
        ]
        result = ScryfallClient.filter_non_digital(sets)
        assert len(result) == 1
        assert result[0]["id"] == "paper"

    def test_missing_digital_field_is_included(self):
        """Sets that omit the digital field are treated as non-digital (default False)."""
        sets = [
            {
                "id": "no-field",
                "name": "NoField",
                "code": "n",
                "set_type": "expansion",
                "card_count": 100,
            },
        ]
        result = ScryfallClient.filter_non_digital(sets)
        assert len(result) == 1
        assert result[0]["id"] == "no-field"

    def test_empty_input_returns_empty_list(self):
        result = ScryfallClient.filter_non_digital([])
        assert result == []


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
