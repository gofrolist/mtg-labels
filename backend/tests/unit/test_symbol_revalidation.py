"""Unit tests for conditional revalidation of cached set symbols.

Scryfall rolls the icon version query for every set at once, so a roll must be
settled with a conditional request rather than a re-download of ~1000 unchanged
icons.
"""

import hashlib
import json
from unittest.mock import Mock, patch

import pytest

from src.cache.cache_manager import CacheManager
from src.services.helpers import fetch_symbol

SVG = b'<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>'
URL_NEW = "https://svgs.scryfall.io/sets/xyz.svg?1786334400"


def response(status: int, content: bytes = b"", headers: dict | None = None) -> Mock:
    """Build a stub requests.Response."""
    resp = Mock()
    resp.status_code = status
    resp.content = content
    resp.headers = headers or {}
    return resp


@pytest.fixture
def cache(tmp_path, monkeypatch):
    """A CacheManager on tmp_path, wired into the helpers module."""
    manager = CacheManager(symbol_cache_dir=tmp_path)
    monkeypatch.setattr("src.services.helpers.get_cache_manager", lambda: manager)
    monkeypatch.setattr("src.services.helpers.SCRYFALL_API_RATE_LIMIT_DELAY", 0)
    return manager


class TestRevalidation:
    """Version-roll handling in fetch_symbol()."""

    def test_current_version_is_a_plain_cache_hit(self, cache):
        cache.save_symbol("s", SVG, "1786334400")
        with patch("src.services.helpers.requests.get") as get:
            result = fetch_symbol("s", URL_NEW, "set 'X'")
        assert result.outcome == "cached"
        get.assert_not_called()

    def test_version_roll_revalidates_instead_of_downloading(self, cache):
        cache.save_symbol("s", SVG, "1783915200", '"etag-1"', "Sat, 10 Dec 2022 11:19:24 GMT")

        with patch("src.services.helpers.requests.get", return_value=response(304)) as get:
            result = fetch_symbol("s", URL_NEW, "set 'X'")

        assert result.outcome == "revalidated"
        assert result.path is not None
        headers = get.call_args.kwargs["headers"]
        assert headers["If-None-Match"] == '"etag-1"'
        assert headers["If-Modified-Since"] == "Sat, 10 Dec 2022 11:19:24 GMT"

    def test_revalidation_records_the_new_version(self, cache, tmp_path):
        cache.save_symbol("s", SVG, "1783915200", '"etag-1"')
        with patch("src.services.helpers.requests.get", return_value=response(304)):
            fetch_symbol("s", URL_NEW, "set 'X'")

        # The next lookup at the new version is a hit, so the next boot is quiet.
        assert cache.get_symbol("s", "1786334400") is not None
        manifest = json.loads((tmp_path / "versions.json").read_text())
        assert manifest["s"]["version"] == "1786334400"

    def test_revalidation_stores_validators_from_the_304(self, cache):
        cache.save_symbol("s", SVG, "1783915200", '"etag-1"')
        with patch(
            "src.services.helpers.requests.get",
            return_value=response(304, headers={"ETag": '"etag-2"', "Last-Modified": "later"}),
        ):
            fetch_symbol("s", URL_NEW, "set 'X'")
        assert cache.symbol_validators("s") == ('"etag-2"', "later")

    def test_legacy_entry_without_etag_uses_the_content_hash(self, cache, tmp_path):
        """A manifest written before validators existed is still revalidated."""
        # The committed manifest shape: a bare version string, no validators.
        cache.save_symbol("s", SVG, "1783915200")
        (tmp_path / "versions.json").write_text(json.dumps({"s": "1783915200"}))
        cache._symbol_versions = None  # force a reload of the legacy manifest

        with patch("src.services.helpers.requests.get", return_value=response(304)) as get:
            result = fetch_symbol("s", URL_NEW, "set 'X'")

        assert result.outcome == "revalidated"
        # Scryfall's ETag is the MD5 of the content, so the cached bytes hash to it.
        expected = f'"{hashlib.md5(SVG, usedforsecurity=False).hexdigest()}"'
        assert get.call_args.kwargs["headers"]["If-None-Match"] == expected

    def test_changed_artwork_is_still_downloaded(self, cache):
        """A 200 means the icon really changed; the new bytes replace the cache."""
        cache.save_symbol("s", SVG, "1783915200", '"etag-1"')
        new_svg = b"<svg>new</svg>"
        with patch(
            "src.services.helpers.requests.get",
            return_value=response(200, new_svg, {"ETag": '"etag-2"'}),
        ):
            result = fetch_symbol("s", URL_NEW, "set 'X'")

        assert result.outcome == "downloaded"
        assert result.path is not None
        with open(result.path, "rb") as f:
            assert f.read() == new_svg
        assert cache.symbol_validators("s")[0] == '"etag-2"'

    def test_uncached_symbol_is_downloaded_unconditionally(self, cache):
        with patch("src.services.helpers.requests.get", return_value=response(200, SVG)) as get:
            result = fetch_symbol("s", URL_NEW, "set 'X'")

        assert result.outcome == "downloaded"
        assert get.call_args.kwargs["headers"] == {}

    def test_304_without_a_cached_file_is_a_failure(self, cache):
        """A 304 we cannot serve from disk must not be reported as success."""
        with patch("src.services.helpers.requests.get", return_value=response(304)):
            result = fetch_symbol("s", URL_NEW, "set 'X'")
        assert result == (None, "failed")

    def test_non_scryfall_url_is_rejected_before_any_request(self, cache):
        with patch("src.services.helpers.requests.get") as get:
            result = fetch_symbol("s", "https://evil.example.com/x.svg", "set 'X'")
        assert result.outcome == "failed"
        get.assert_not_called()

    def test_network_error_reports_failure(self, cache):
        import requests

        cache.save_symbol("s", SVG, "1783915200", '"etag-1"')
        with patch(
            "src.services.helpers.requests.get",
            side_effect=requests.RequestException("boom"),
        ):
            result = fetch_symbol("s", URL_NEW, "set 'X'")
        assert result == (None, "failed")


class TestManifestCompatibility:
    """The manifest keeps reading entries written by the previous format."""

    def test_legacy_string_entry_still_matches_its_version(self, tmp_path):
        (tmp_path / "versions.json").write_text(json.dumps({"s": "111"}))
        manager = CacheManager(symbol_cache_dir=tmp_path)
        manager.save_symbol("s", SVG)  # file only, manifest untouched
        assert manager.get_symbol("s", "111") is not None
        assert manager.get_symbol("s", "222") is None

    def test_corrupt_entry_is_ignored(self, tmp_path):
        (tmp_path / "versions.json").write_text(json.dumps({"s": ["nope"]}))
        manager = CacheManager(symbol_cache_dir=tmp_path)
        manager.save_symbol("s", SVG)
        assert manager.get_symbol("s", "111") is None
        assert manager.symbol_validators("s") == (None, None)

    def test_record_keeps_existing_validators(self, tmp_path):
        manager = CacheManager(symbol_cache_dir=tmp_path)
        manager.save_symbol("s", SVG, "111", '"etag-1"', "then")
        manager.record_symbol_version("s", "222")
        assert manager.symbol_validators("s") == ('"etag-1"', "then")

    def test_empty_version_survives_a_reload(self, tmp_path):
        """A URL with no version query has version "" — a value, not a gap.

        Every mana symbol is in this shape, so dropping it on load would miss
        on every boot and revalidate the symbol over the network for nothing.
        """
        manager = CacheManager(symbol_cache_dir=tmp_path)
        manager.save_symbol("mana_white_W", SVG, "", '"etag-1"')
        assert manager.get_symbol("mana_white_W", "") is not None

        reloaded = CacheManager(symbol_cache_dir=tmp_path)
        assert reloaded.get_symbol("mana_white_W", "") is not None
        assert reloaded.symbol_validators("mana_white_W") == ('"etag-1"', None)

    def test_empty_validators_are_not_recorded(self, tmp_path):
        """An empty ETag cannot go in a conditional request, so it is dropped."""
        (tmp_path / "versions.json").write_text(
            json.dumps({"s": {"version": "111", "etag": "", "last_modified": ""}})
        )
        manager = CacheManager(symbol_cache_dir=tmp_path)
        manager.save_symbol("s", SVG)
        assert manager.get_symbol("s", "111") is not None
        assert manager.symbol_validators("s") == (None, None)

    def test_save_records_validators_without_a_version(self, tmp_path):
        """Validators describe the bytes just written, version or not.

        Keeping the previous file's ETag would make the next revalidation send
        a stale If-None-Match and take a needless 200.
        """
        manager = CacheManager(symbol_cache_dir=tmp_path)
        manager.save_symbol("s", SVG, "111", '"etag-1"', "then")
        manager.save_symbol("s", SVG, None, '"etag-2"')
        assert manager.symbol_validators("s") == ('"etag-2"', "then")
        # The version is left alone, not cleared.
        assert manager.get_symbol("s", "111") is not None

    def test_manifest_write_failure_does_not_break_the_save(self, tmp_path):
        """The manifest is an optimization; failing to write it must not raise.

        Serialization runs inside the handler, so an entry that will not encode
        is logged rather than thrown up through save_symbol into fetch_symbol.
        """
        manager = CacheManager(symbol_cache_dir=tmp_path)
        with patch("src.cache.cache_manager.json.dumps", side_effect=TypeError("not serializable")):
            manager.save_symbol("s", SVG, "111")  # must not raise

        # The SVG still landed on disk even though the manifest write failed.
        assert manager.get_symbol("s") is not None
