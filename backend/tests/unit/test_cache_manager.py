"""Unit tests for CacheManager."""

import json
import time
from unittest.mock import patch

from src.cache.cache_manager import CacheManager


class TestCacheManagerInMemoryCache:
    """Tests for CacheManager in-memory cache functionality."""

    def test_cache_set_and_get(self):
        """Test that data can be set and retrieved from cache."""
        cache_manager = CacheManager(ttl=60)
        cache_manager.set("test_key", {"data": "test_value"})
        result = cache_manager.get("test_key")
        assert result == {"data": "test_value"}

    def test_cache_miss_returns_none(self):
        """Test that cache miss returns None."""
        cache_manager = CacheManager()
        result = cache_manager.get("nonexistent_key")
        assert result is None

    def test_cache_ttl_expiration(self):
        """Test that cache entries expire after TTL."""
        cache_manager = CacheManager(ttl=1)  # 1 second TTL
        cache_manager.set("test_key", {"data": "test_value"})
        assert cache_manager.get("test_key") == {"data": "test_value"}
        time.sleep(2)
        assert cache_manager.get("test_key") is None

    def test_cache_max_size_limit(self):
        """Test that cache respects max size limit."""
        cache_manager = CacheManager(max_size=2, ttl=60)
        cache_manager.set("key1", "value1")
        cache_manager.set("key2", "value2")
        cache_manager.set("key3", "value3")  # Should evict key1
        assert cache_manager.get("key1") is None
        assert cache_manager.get("key2") == "value2"
        assert cache_manager.get("key3") == "value3"


class TestFileBasedSymbolCache:
    """Tests for file-based symbol cache."""

    def test_symbol_cache_get_existing_file(self, tmp_path):
        """Test retrieving cached symbol file."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)

        # Create a cached file
        symbol_file = cache_dir / "test-id.svg"
        symbol_file.write_text("<svg></svg>")

        result = cache_manager.get_symbol("test-id")
        assert result == str(symbol_file)

    def test_symbol_cache_miss_returns_none(self, tmp_path):
        """Test that missing symbol file returns None."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)

        result = cache_manager.get_symbol("nonexistent-id")
        assert result is None

    def test_symbol_cache_save_file(self, tmp_path):
        """Test saving symbol to cache."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)

        cache_manager.save_symbol("test-id", b"<svg></svg>")

        symbol_file = cache_dir / "test-id.svg"
        assert symbol_file.exists()
        assert symbol_file.read_bytes() == b"<svg></svg>"

    def test_symbol_cache_validation(self, tmp_path):
        """Test symbol cache file validation."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)

        # Create invalid file (empty)
        symbol_file = cache_dir / "test-id.svg"
        symbol_file.write_bytes(b"")

        result = cache_manager.get_symbol("test-id")
        assert result is None  # Should return None for invalid file

    def test_symbol_cache_validation_invalid_content(self, tmp_path):
        """Test symbol cache validation with invalid SVG content."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)

        # Create file with invalid content (not SVG)
        symbol_file = cache_dir / "test-id.svg"
        symbol_file.write_bytes(b"not an svg file")

        result = cache_manager.get_symbol("test-id")
        assert result is None  # Should return None for invalid content
        # File should be deleted
        assert not symbol_file.exists()

    def test_symbol_cache_save_exception_handling(self, tmp_path, monkeypatch):
        """Test exception handling in save_symbol."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)

        # Mock write_bytes to raise an exception
        def mock_write_bytes(self, data):
            raise OSError("Permission denied")

        monkeypatch.setattr("pathlib.Path.write_bytes", mock_write_bytes)

        result = cache_manager.save_symbol("test-id", b"<svg></svg>")
        assert result is None  # Should return None on error

    def test_symbol_cache_invalidate_exception_handling(self, tmp_path, monkeypatch):
        """Test exception handling in invalidate_symbol."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)

        # Create a file
        symbol_file = cache_dir / "test-id.svg"
        symbol_file.write_bytes(b"<svg></svg>")

        # Mock unlink to raise an exception
        def mock_unlink(self):
            raise OSError("Permission denied")

        monkeypatch.setattr("pathlib.Path.unlink", mock_unlink)

        # Should not raise, just log error
        cache_manager.invalidate_symbol("test-id")
        # File should still exist due to error
        assert symbol_file.exists()


class TestVersionAwareSymbolCache:
    """Tests for version-aware symbol caching via the version manifest."""

    def test_symbol_version_extracts_query(self):
        """The version is the URL query string."""
        assert (
            CacheManager.symbol_version("https://svgs.scryfall.io/sets/msh.svg?1783915200")
            == "1783915200"
        )

    def test_symbol_version_no_query(self):
        """A URL without a query yields an empty version."""
        assert CacheManager.symbol_version("https://svgs.scryfall.io/sets/msh.svg") == ""

    def test_symbol_version_none_url(self):
        """A missing URL yields an empty version."""
        assert CacheManager.symbol_version(None) == ""

    def test_save_records_version_and_get_hits_on_match(self, tmp_path):
        """save_symbol writes the manifest; get_symbol hits on a matching version."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)

        cache_manager.save_symbol("set-id", b"<svg></svg>", "1783915200")

        # Manifest persisted to disk.
        manifest = json.loads((cache_dir / "versions.json").read_text())
        assert manifest == {"set-id": {"version": "1783915200"}}
        # Matching version is a hit.
        assert cache_manager.get_symbol("set-id", "1783915200") == str(cache_dir / "set-id.svg")

    def test_get_misses_on_version_mismatch(self, tmp_path):
        """A file present but with a different recorded version is a cache miss."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)
        cache_manager.save_symbol("set-id", b"<svg></svg>", "111")

        # Same file on disk, but the current icon version differs -> miss.
        assert cache_manager.get_symbol("set-id", "222") is None

    def test_get_misses_when_no_manifest_entry(self, tmp_path):
        """A committed file with no manifest entry misses when a version is expected."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)
        # Legacy file present, no manifest.
        (cache_dir / "set-id.svg").write_bytes(b"<svg></svg>")

        assert cache_manager.get_symbol("set-id", "111") is None

    def test_get_ignores_version_when_none(self, tmp_path):
        """expected_version=None returns the file regardless of the manifest."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)
        (cache_dir / "set-id.svg").write_bytes(b"<svg></svg>")

        assert cache_manager.get_symbol("set-id") == str(cache_dir / "set-id.svg")

    def test_save_without_version_leaves_manifest_untouched(self, tmp_path):
        """Passing version=None does not create a manifest."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)

        cache_manager.save_symbol("set-id", b"<svg></svg>")

        assert not (cache_dir / "versions.json").exists()

    def test_updated_version_overwrites_file_and_manifest(self, tmp_path):
        """Re-saving with a new version overwrites content and the manifest entry."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)
        cache_manager.save_symbol("set-id", b"<svg>old</svg>", "111")
        cache_manager.save_symbol("set-id", b"<svg>new</svg>", "222")

        assert (cache_dir / "set-id.svg").read_bytes() == b"<svg>new</svg>"
        assert cache_manager.get_symbol("set-id", "222") is not None
        assert cache_manager.get_symbol("set-id", "111") is None

    def test_manifest_survives_new_manager_instance(self, tmp_path):
        """A fresh manager reads the persisted manifest (warm-cache across restart)."""
        cache_dir = tmp_path / "cache"
        CacheManager(symbol_cache_dir=cache_dir).save_symbol("set-id", b"<svg></svg>", "111")

        fresh = CacheManager(symbol_cache_dir=cache_dir)
        assert fresh.get_symbol("set-id", "111") == str(cache_dir / "set-id.svg")

    def test_batch_defers_manifest_write_to_single_flush(self, tmp_path):
        """Inside a batch, saves update memory (hits work) but the file is
        written once, on exit."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)

        with cache_manager.batch_symbol_writes():
            cache_manager.save_symbol("a", b"<svg></svg>", "1")
            cache_manager.save_symbol("b", b"<svg></svg>", "2")
            # In-memory lookup hits immediately...
            assert cache_manager.get_symbol("a", "1") is not None
            # ...but the manifest file has not been written yet.
            assert not (cache_dir / "versions.json").exists()

        # A single flush persisted both entries.
        manifest = json.loads((cache_dir / "versions.json").read_text())
        assert manifest == {"a": {"version": "1"}, "b": {"version": "2"}}

    def test_nested_batch_flushes_once_at_outermost_exit(self, tmp_path):
        """Only the outermost batch flushes; the inner exit does not."""
        cache_dir = tmp_path / "cache"
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)

        with cache_manager.batch_symbol_writes():
            with cache_manager.batch_symbol_writes():
                cache_manager.save_symbol("a", b"<svg></svg>", "1")
            # Inner block exited but outer batch is still active.
            assert not (cache_dir / "versions.json").exists()

        assert (cache_dir / "versions.json").exists()

    def test_corrupt_manifest_is_tolerated(self, tmp_path):
        """A corrupt manifest is treated as empty rather than raising."""
        cache_dir = tmp_path / "cache"
        cache_dir.mkdir()
        (cache_dir / "versions.json").write_text("{ not json")
        (cache_dir / "set-id.svg").write_bytes(b"<svg></svg>")
        cache_manager = CacheManager(symbol_cache_dir=cache_dir)

        # No entry -> versioned lookup misses, but the manager still works.
        assert cache_manager.get_symbol("set-id", "111") is None
        assert cache_manager.get_symbol("set-id") == str(cache_dir / "set-id.svg")


class TestCacheExpirationAndInvalidation:
    """Tests for cache expiration and invalidation."""

    def test_cache_invalidate_key(self):
        """Test invalidating a specific cache key."""
        cache_manager = CacheManager(ttl=60)
        cache_manager.set("key1", "value1")
        cache_manager.set("key2", "value2")

        cache_manager.invalidate("key1")
        assert cache_manager.get("key1") is None
        assert cache_manager.get("key2") == "value2"

    def test_cache_clear_all(self):
        """Test clearing all cache entries."""
        cache_manager = CacheManager(ttl=60)
        cache_manager.set("key1", "value1")
        cache_manager.set("key2", "value2")

        cache_manager.clear()
        assert cache_manager.get("key1") is None
        assert cache_manager.get("key2") is None

    def test_cache_invalidate_on_error(self):
        """Test that cache is invalidated on error."""
        cache_manager = CacheManager(ttl=60)
        cache_manager.set("sets", [{"id": "test"}])

        # Simulate error
        cache_manager.invalidate_on_error("sets")
        assert cache_manager.get("sets") is None


class TestCacheHitRate:
    """Tests for cache hit rate monitoring."""

    def test_cache_hit_rate_calculation(self):
        """Test cache hit rate calculation."""
        cache_manager = CacheManager(ttl=60)

        # Make requests
        cache_manager.get("key1")  # Miss
        cache_manager.set("key1", "value1")
        cache_manager.get("key1")  # Hit
        cache_manager.get("key1")  # Hit
        cache_manager.get("key2")  # Miss

        # Hit rate should be 2 hits / 4 total = 0.5
        hit_rate = cache_manager.get_hit_rate()
        assert hit_rate == 0.5

    def test_cache_stats(self):
        """Test cache statistics."""
        cache_manager = CacheManager(ttl=60)
        cache_manager.set("key1", "value1")
        cache_manager.get("key1")  # Hit
        cache_manager.get("key2")  # Miss

        stats = cache_manager.get_stats()
        assert stats["hits"] == 1
        assert stats["misses"] == 1
        assert stats["total_requests"] == 2
        assert stats["hit_rate"] == 0.5


class TestCacheGetOrFetch:
    """Tests for cache get_or_fetch and exception handling."""

    def test_cache_get_or_fetch(self):
        """Test get_or_fetch pattern."""
        cache_manager = CacheManager(ttl=60)

        def fetch_func():
            return {"data": "fetched"}

        # First call - should fetch
        result1 = cache_manager.get_or_fetch("key", fetch_func)
        assert result1 == {"data": "fetched"}

        # Second call - should use cache
        call_count = 0

        def fetch_func2():
            nonlocal call_count
            call_count += 1
            return {"data": "fetched"}

        result2 = cache_manager.get_or_fetch("key", fetch_func2)
        assert result2 == {"data": "fetched"}
        assert call_count == 0  # Should not call fetch_func2

    def test_cache_get_exception_handling(self):
        """Test exception handling in cache.get() (lines 108-111)."""
        cache_manager = CacheManager(ttl=60)
        cache_manager.set("key", "value")

        # Mock _memory_cache.get to raise exception
        with patch.object(
            cache_manager._memory_cache, "get", side_effect=Exception("Unexpected error")
        ):
            result = cache_manager.get("key")
            assert result is None

    def test_cache_set_exception_handling(self):
        """Test exception handling in cache.set() (lines 124-126)."""
        cache_manager = CacheManager(ttl=60)

        # Mock _memory_cache operations to raise exception
        with patch.object(
            cache_manager._memory_cache, "__setitem__", side_effect=Exception("Unexpected error")
        ):
            # Should not raise, just log error
            cache_manager.set("key", "value")

    def test_cache_get_hit_rate_zero_total(self):
        """Test get_hit_rate() when total is 0 (line 293)."""
        cache_manager = CacheManager(ttl=60)
        # No requests made yet
        hit_rate = cache_manager.get_hit_rate()
        assert hit_rate == 0.0
