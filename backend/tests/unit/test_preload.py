"""Unit tests for icon cache preload functionality."""

from unittest.mock import patch

import pytest

from src.cache.cache_manager import CacheManager
from src.services.helpers import SymbolFetch


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
        """Preload skips already-cached icons and fetches uncached ones."""
        cm = CacheManager(symbol_cache_dir=tmp_path)
        # Pre-cache set-a: file + manifest entry (its URL has no version, so "").
        cm.save_symbol("set-a", b'<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>', "")

        with (
            patch("src.api.routes.scryfall_client") as mock_client,
            patch("src.api.routes.get_cache_manager", return_value=cm),
            patch("src.api.routes.fetch_symbol") as mock_fetch,
        ):
            mock_fetch.return_value = SymbolFetch("/tmp/x.svg", "downloaded")
            mock_client.fetch_sets.return_value = filtered_sets
            mock_client.filter_non_digital.return_value = filtered_sets

            from src.api.routes import _preload_icon_cache

            _preload_icon_cache()

        # set-a was cached, so only set-b and set-c should be fetched
        assert mock_fetch.call_count == 2
        mock_fetch.assert_any_call("set-b", "https://svgs.scryfall.io/b.svg", "set 'Set B'")
        mock_fetch.assert_any_call("set-c", "https://svgs.scryfall.io/c.svg", "set 'Set C'")

    def _run_preload(self, filtered_sets, tmp_path, outcome):
        """Run the preload with every fetch reporting ``outcome``; return the log."""
        cm = CacheManager(symbol_cache_dir=tmp_path)

        with (
            patch("src.api.routes.scryfall_client") as mock_client,
            patch("src.api.routes.get_cache_manager", return_value=cm),
            patch("src.api.routes.fetch_symbol") as mock_fetch,
            patch("src.api.routes.logger") as mock_logger,
        ):
            mock_fetch.return_value = SymbolFetch("/tmp/x.svg", outcome)
            mock_client.fetch_sets.return_value = filtered_sets
            mock_client.filter_non_digital.return_value = filtered_sets

            from src.api.routes import _preload_icon_cache

            _preload_icon_cache()

        assert mock_fetch.call_count == 3
        mock_logger.error.assert_not_called()
        return mock_logger.info.call_args[0][0]

    def test_counts_revalidations_separately_from_downloads(self, filtered_sets, tmp_path):
        """A revalidated icon is reported as revalidated, not as a download."""
        summary = self._run_preload(filtered_sets, tmp_path, "revalidated")

        assert "3 revalidated" in summary
        assert "0 downloaded" in summary
        assert "0 already cached" in summary
        assert "0 failed" in summary

    def test_counts_downloads(self, filtered_sets, tmp_path):
        """A downloaded icon is reported as a download."""
        summary = self._run_preload(filtered_sets, tmp_path, "downloaded")

        assert "3 downloaded" in summary
        assert "0 revalidated" in summary

    def test_does_not_raise_on_an_unknown_outcome(self, filtered_sets, tmp_path):
        """An outcome absent from the counters is tallied, not a KeyError."""
        # The counters are pre-seeded with the known outcomes, so only an
        # outcome outside that set exercises the `counts.get(outcome, 0)` path.
        summary = self._run_preload(filtered_sets, tmp_path, "skipped-for-some-new-reason")

        # The unknown outcome is counted under its own key, leaving the
        # reported categories at zero rather than inflating one of them.
        assert "0 downloaded" in summary
        assert "0 revalidated" in summary
        assert "0 failed" in summary

    def test_handles_errors_gracefully(self):
        """Preload does not raise when fetch_sets fails."""
        with patch("src.api.routes.scryfall_client") as mock_client:
            mock_client.fetch_sets.side_effect = Exception("Network error")

            from src.api.routes import _preload_icon_cache

            # Should not raise
            _preload_icon_cache()
