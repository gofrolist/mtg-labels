"""Unit tests for icon cache preload functionality."""

from unittest.mock import patch

import pytest

from src.cache.cache_manager import CacheManager


@pytest.fixture
def filtered_sets():
    return [
        {"id": "set-a", "name": "Set A", "icon_svg_uri": "https://svgs.scryfall.io/a.svg"},
        {"id": "set-b", "name": "Set B", "icon_svg_uri": "https://svgs.scryfall.io/b.svg"},
        {"id": "set-c", "name": "Set C", "icon_svg_uri": "https://svgs.scryfall.io/c.svg"},
    ]


@pytest.mark.unit
class TestPreloadIconCache:
    """Tests for _preload_icon_cache function."""

    def test_skips_cached_downloads_uncached(self, filtered_sets, tmp_path):
        """Preload skips already-cached icons and downloads uncached ones."""
        cm = CacheManager(symbol_cache_dir=tmp_path)
        # Pre-cache set-a
        (tmp_path / "set-a.svg").write_text(
            '<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>'
        )

        with (
            patch("src.api.routes.scryfall_client") as mock_client,
            patch("src.api.routes.get_cache_manager", return_value=cm),
            patch("src.api.routes.download_and_cache_symbol") as mock_download,
        ):
            mock_client.fetch_sets.return_value = filtered_sets
            mock_client.filter_sets.return_value = filtered_sets

            from src.api.routes import _preload_icon_cache

            _preload_icon_cache()

        # set-a was cached, so only set-b and set-c should be downloaded
        assert mock_download.call_count == 2
        mock_download.assert_any_call("set-b", "https://svgs.scryfall.io/b.svg", "set 'Set B'")
        mock_download.assert_any_call("set-c", "https://svgs.scryfall.io/c.svg", "set 'Set C'")

    def test_handles_errors_gracefully(self):
        """Preload does not raise when fetch_sets fails."""
        with patch("src.api.routes.scryfall_client") as mock_client:
            mock_client.fetch_sets.side_effect = Exception("Network error")

            from src.api.routes import _preload_icon_cache

            # Should not raise
            _preload_icon_cache()
