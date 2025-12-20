"""Integration tests for API endpoints."""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from src.api.routes import create_app

app = create_app()


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


class TestIndexEndpoint:
    """Tests for GET / endpoint."""

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_index_endpoint_success(self, mock_fetch, client, sample_set_data):
        """Test successful GET / request."""
        mock_fetch.return_value = sample_set_data

        response = client.get("/")

        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        # Check that set names appear in HTML
        assert "Test Set" in response.text or "TS1" in response.text

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_index_endpoint_api_error(self, mock_fetch, client):
        """Test GET / when API returns error."""
        from fastapi import HTTPException

        mock_fetch.side_effect = HTTPException(status_code=500, detail="API Error")

        response = client.get("/")

        # Should handle error gracefully
        assert response.status_code == 500


class TestApiSetsEndpoint:
    """Tests for GET /api/sets endpoint."""

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_api_sets_endpoint_success(self, mock_fetch, client, sample_set_data):
        """Test successful GET /api/sets request."""
        mock_fetch.return_value = sample_set_data

        response = client.get("/api/sets")

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_api_sets_endpoint_filters_sets(self, mock_fetch, client):
        """Test that /api/sets filters sets correctly."""
        all_sets = [
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
                "set_type": "invalid",
                "card_count": 100,
            },
        ]
        mock_fetch.return_value = all_sets

        response = client.get("/api/sets")

        assert response.status_code == 200
        data = response.json()
        # Should filter out invalid set_type
        assert len(data) == 1
        assert data[0]["id"] == "test-1"

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_api_sets_endpoint_empty_result(self, mock_fetch, client):
        """Test GET /api/sets with no valid sets."""
        mock_fetch.return_value = []

        response = client.get("/api/sets")

        assert response.status_code == 200
        data = response.json()
        assert data == []

    @patch("src.api.routes.scryfall_client.filter_sets")
    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_api_sets_endpoint_returns_dicts(self, mock_fetch, mock_filter, client):
        """Test that /api/sets returns dictionaries."""
        from src.models.set_data import MTGSet

        sets = [
            MTGSet(
                id="test-1",
                name="Test 1",
                code="T1",
                set_type="expansion",
                card_count=100,
                released_at="2023-01-01",
            ),
            {"id": "test-2", "name": "Test 2", "code": "T2", "set_type": "expansion"},
        ]
        mock_fetch.return_value = sets
        mock_filter.return_value = sets

        response = client.get("/api/sets")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # MTGSet should be converted to dict
        assert all(isinstance(item, dict) for item in data)


class TestIndexEndpointTypesView:
    """Tests for GET / endpoint with types view."""

    @patch("src.api.routes.scryfall_client.get_card_types_by_color")
    def test_index_endpoint_types_view_success(self, mock_get_types, client):
        """Test successful GET /?view=types request."""
        mock_get_types.return_value = {
            "White": ["Creature", "Instant", "Sorcery"],
            "Blue": ["Creature", "Instant", "Sorcery"],
            "Multicolor": ["Creature", "Instant", "Sorcery"],
        }

        response = client.get("/?view=types")

        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        # Check that types appear in HTML
        assert "Creature" in response.text
        assert "White" in response.text

    @patch("src.api.routes.scryfall_client.get_card_types_by_color")
    def test_index_endpoint_types_view_api_error(self, mock_get_types, client):
        """Test GET /?view=types when API returns error."""
        from fastapi import HTTPException

        mock_get_types.side_effect = HTTPException(status_code=500, detail="API Error")

        response = client.get("/?view=types")

        # Should handle error gracefully
        assert response.status_code == 500

    @patch("src.api.routes.scryfall_client.group_sets")
    @patch("src.api.routes.scryfall_client.filter_sets")
    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_index_endpoint_sets_view_explicit(
        self, mock_fetch, mock_filter, mock_group, client, sample_set_data
    ):
        """Test GET /?view=sets explicitly sets view mode."""
        mock_fetch.return_value = sample_set_data
        mock_filter.return_value = sample_set_data
        mock_group.return_value = {"Expansion": sample_set_data}

        response = client.get("/?view=sets")

        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
