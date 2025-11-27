"""Integration tests for cache performance."""

import time

import pytest
from fastapi.testclient import TestClient

from src.api.routes import create_app
from src.cache.cache_manager import CacheManager


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(create_app())


class TestCacheHitRate:
    """Tests for cache hit rate measurement."""

    def test_cache_hit_rate_measurement(self):
        """Test that cache hit rate can be measured."""
        # Use a fresh cache manager instance to test hit rate tracking
        cache_manager = CacheManager()

        # Make requests directly to cache manager
        cache_manager.get("key1")  # Miss
        cache_manager.set("key1", "value1")
        cache_manager.get("key1")  # Hit
        cache_manager.get("key1")  # Hit
        cache_manager.get("key2")  # Miss
        cache_manager.set("key2", "value2")
        cache_manager.get("key2")  # Hit
        cache_manager.get("key3")  # Miss

        # Check cache hit rate - should be 3 hits / 6 total = 0.5
        hit_rate = cache_manager.get_hit_rate()
        assert hit_rate == 0.5  # 3 hits out of 6 requests

    def test_cache_hit_rate_tracking(self):
        """Test that cache hit rate is tracked correctly."""
        cache_manager = CacheManager()

        # Make requests
        cache_manager.get("key1")  # Miss
        cache_manager.set("key1", "value1")
        cache_manager.get("key1")  # Hit
        cache_manager.get("key1")  # Hit
        cache_manager.get("key2")  # Miss

        # Hit rate should be 2 hits / 4 total = 0.5
        hit_rate = cache_manager.get_hit_rate()
        assert hit_rate == 0.5


class TestCachedVsUncachedPerformance:
    """Tests for cached vs uncached response time comparison."""

    def test_cached_response_faster(self):
        """Test that cached responses are faster than uncached using cache manager directly."""
        cache_manager = CacheManager()

        # Simulate slow fetch
        def slow_fetch():
            time.sleep(0.05)
            return {"data": "value"}

        # First call (uncached) - should be slow
        start1 = time.time()
        result1 = cache_manager.get_or_fetch("key", slow_fetch)
        duration1 = time.time() - start1

        # Second call (cached) - should be faster
        start2 = time.time()
        result2 = cache_manager.get_or_fetch("key", slow_fetch)
        duration2 = time.time() - start2

        # Cached should be much faster (at least 80% faster)
        assert duration2 < duration1 * 0.2, (
            f"Cached ({duration2:.4f}s) should be much faster than uncached ({duration1:.4f}s)"
        )
        assert result1 == result2

    def test_cache_performance_improvement(self):
        """Test that cache provides performance improvement."""
        cache_manager = CacheManager()

        # Simulate slow fetch
        def slow_fetch():
            time.sleep(0.05)
            return {"data": "value"}

        # First call (uncached)
        start1 = time.time()
        result1 = cache_manager.get_or_fetch("key", slow_fetch)
        duration1 = time.time() - start1

        # Second call (cached)
        start2 = time.time()
        result2 = cache_manager.get_or_fetch("key", slow_fetch)
        duration2 = time.time() - start2

        # Cached should be much faster
        assert duration2 < duration1 * 0.1, (
            f"Cached ({duration2:.4f}s) should be much faster than uncached ({duration1:.4f}s)"
        )
        assert result1 == result2
