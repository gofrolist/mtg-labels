"""Unit tests for CacheManager."""

import time

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


class TestCacheValidationAndRefresh:
    """Tests for cache validation and refresh."""

    def test_cache_is_valid(self):
        """Test checking if cache entry is valid."""
        cache_manager = CacheManager(ttl=1)
        cache_manager.set("key", "value")
        assert cache_manager.is_valid("key") is True

        # After expiration
        time.sleep(2)
        assert cache_manager.is_valid("key") is False

    def test_cache_refresh(self):
        """Test refreshing cache entry."""
        cache_manager = CacheManager(ttl=60)
        cache_manager.set("key", "value1")

        # Refresh with new value
        cache_manager.refresh("key", "value2")
        assert cache_manager.get("key") == "value2"

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
