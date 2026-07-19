"""Unit tests for /api/set-icons endpoint."""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from src.api.routes import create_app
from src.cache.cache_manager import CacheManager


@pytest.fixture
def app():
    """Create a test app without triggering startup preload."""
    with patch("src.api.routes._preload_icon_cache"):
        return create_app()


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture
def cache_with_symbols(tmp_path):
    """Create a cache manager with some pre-cached symbols."""
    cm = CacheManager(symbol_cache_dir=tmp_path)

    # Cache two sets: file + manifest entry (their URLs have no version, so "").
    cm.save_symbol("set-a", b'<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>', "")
    cm.save_symbol("set-b", b'<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>', "")
    return cm


@pytest.fixture
def filtered_sets():
    return [
        {"id": "set-a", "name": "Set A", "icon_svg_uri": "https://svgs.scryfall.io/a.svg"},
        {"id": "set-b", "name": "Set B", "icon_svg_uri": "https://svgs.scryfall.io/b.svg"},
        {"id": "set-c", "name": "Set C", "icon_svg_uri": "https://svgs.scryfall.io/c.svg"},
    ]


@pytest.mark.unit
class TestSetIconsEndpoint:
    """Tests for GET /api/set-icons."""

    def test_returns_cached_icons(self, client, cache_with_symbols, filtered_sets):
        """Endpoint returns SVG content for cached icons, omits uncached."""
        with (
            patch("src.api.routes.scryfall_client") as mock_client,
            patch("src.api.routes.get_cache_manager", return_value=cache_with_symbols),
        ):
            mock_client.fetch_sets.return_value = filtered_sets
            mock_client.filter_non_digital.return_value = filtered_sets

            response = client.get("/api/set-icons")

        assert response.status_code == 200
        data = response.json()

        # set-a and set-b are cached, set-c is not
        assert "set-a" in data
        assert "set-b" in data
        assert "set-c" not in data

        # Values are actual SVG strings
        assert "<circle/>" in data["set-a"]
        assert "<rect/>" in data["set-b"]

    def test_has_cache_control_headers(self, client, cache_with_symbols, filtered_sets):
        """Endpoint sets proper Cache-Control headers."""
        with (
            patch("src.api.routes.scryfall_client") as mock_client,
            patch("src.api.routes.get_cache_manager", return_value=cache_with_symbols),
        ):
            mock_client.fetch_sets.return_value = filtered_sets
            mock_client.filter_non_digital.return_value = filtered_sets

            response = client.get("/api/set-icons")

        assert "max-age=3600" in response.headers["cache-control"]
        assert "stale-while-revalidate=86400" in response.headers["cache-control"]

    def test_empty_when_no_cache(self, client, tmp_path, filtered_sets):
        """Endpoint returns empty dict when nothing is cached."""
        empty_cache = CacheManager(symbol_cache_dir=tmp_path)

        with (
            patch("src.api.routes.scryfall_client") as mock_client,
            patch("src.api.routes.get_cache_manager", return_value=empty_cache),
        ):
            mock_client.fetch_sets.return_value = filtered_sets
            mock_client.filter_non_digital.return_value = filtered_sets

            response = client.get("/api/set-icons")

        assert response.status_code == 200
        assert response.json() == {}
