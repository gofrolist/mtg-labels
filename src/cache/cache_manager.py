"""Cache manager for MTG Label Generator.

Provides multi-layer caching:
- In-memory cache for set data (TTL-based)
- File-based cache for SVG symbols
- Cache hit rate monitoring
"""

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from cachetools import TTLCache

from src.config import CACHE_MAX_SIZE, CACHE_TTL_SECONDS, SYMBOL_CACHE_DIR, logger


@dataclass
class CachedSetData:
    """Represents cached set list data with metadata for cache management."""

    sets: list[dict]
    cached_at: datetime = field(default_factory=datetime.now)
    expires_at: datetime | None = field(default=None)
    source: str = "scryfall_api"

    def __post_init__(self) -> None:
        """Set expires_at if not provided."""
        if self.expires_at is None:
            self.expires_at = self.cached_at + timedelta(seconds=CACHE_TTL_SECONDS)

    def is_expired(self) -> bool:
        """Check if cache entry is expired."""
        if self.expires_at is None:
            return True
        return datetime.now() > self.expires_at

    def is_stale(self, max_age_seconds: int = CACHE_TTL_SECONDS) -> bool:
        """Check if cache entry is stale (older than max_age)."""
        age = (datetime.now() - self.cached_at).total_seconds()
        return age > max_age_seconds


class CacheManager:
    """
    Multi-layer cache manager for MTG Label Generator.

    Provides:
    - In-memory TTL cache for set data
    - File-based cache for SVG symbols
    - Cache hit rate monitoring
    - Cache invalidation on errors
    """

    def __init__(
        self,
        ttl: int = CACHE_TTL_SECONDS,
        max_size: int = CACHE_MAX_SIZE,
        symbol_cache_dir: Path | None = None,
    ) -> None:
        """
        Initialize CacheManager.

        Args:
            ttl: Time-to-live for cache entries in seconds
            max_size: Maximum number of cache entries
            symbol_cache_dir: Directory for symbol file cache
        """
        self.ttl = ttl
        self.max_size = max_size
        self.symbol_cache_dir = Path(symbol_cache_dir) if symbol_cache_dir else SYMBOL_CACHE_DIR

        # In-memory cache using TTLCache
        self._memory_cache: TTLCache[str, Any] = TTLCache(maxsize=max_size, ttl=ttl)

        # Cache statistics
        self._hits = 0
        self._misses = 0
        self._errors = 0

        # Ensure symbol cache directory exists
        self.symbol_cache_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"CacheManager initialized: TTL={ttl}s, max_size={max_size}")

    def get(self, key: str) -> Any | None:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/expired
        """
        try:
            value = self._memory_cache.get(key)
            if value is not None:
                self._hits += 1
                logger.debug(f"Cache hit for key: {key}")
                return value
            else:
                self._misses += 1
                logger.debug(f"Cache miss for key: {key}")
                return None
        except Exception as e:
            self._errors += 1
            logger.error(f"Error getting cache key {key}: {e}")
            return None

    def set(self, key: str, value: Any) -> None:
        """
        Set value in cache.

        Args:
            key: Cache key
            value: Value to cache
        """
        try:
            self._memory_cache[key] = value
            logger.debug(f"Cached value for key: {key}")
        except Exception as e:
            self._errors += 1
            logger.error(f"Error setting cache key {key}: {e}")

    def invalidate(self, key: str) -> None:
        """
        Invalidate a specific cache key.

        Args:
            key: Cache key to invalidate
        """
        try:
            if key in self._memory_cache:
                del self._memory_cache[key]
                logger.debug(f"Invalidated cache key: {key}")
        except Exception as e:
            logger.error(f"Error invalidating cache key {key}: {e}")

    def invalidate_on_error(self, key: str) -> None:
        """
        Invalidate cache entry on error (for stale data detection).

        Args:
            key: Cache key to invalidate
        """
        self.invalidate(key)
        self._errors += 1
        logger.warning(f"Cache invalidated due to error for key: {key}")

    def clear(self) -> None:
        """Clear all cache entries."""
        self._memory_cache.clear()
        self._hits = 0
        self._misses = 0
        self._errors = 0
        logger.info("Cache cleared")

    def is_valid(self, key: str) -> bool:
        """
        Check if cache entry is valid (exists and not expired).

        Args:
            key: Cache key to check

        Returns:
            True if valid, False otherwise
        """
        return key in self._memory_cache

    def refresh(self, key: str, value: Any) -> None:
        """
        Refresh cache entry with new value.

        Args:
            key: Cache key
            value: New value to cache
        """
        self.set(key, value)
        logger.debug(f"Refreshed cache for key: {key}")

    def get_or_fetch(self, key: str, fetch_func: Callable[[], Any]) -> Any:
        """
        Get value from cache or fetch if not cached.

        Args:
            key: Cache key
            fetch_func: Function to fetch value if not cached

        Returns:
            Cached or fetched value
        """
        value = self.get(key)
        if value is not None:
            return value

        # Fetch and cache
        try:
            value = fetch_func()
            self.set(key, value)
            return value
        except Exception as e:
            logger.error(f"Error fetching value for key {key}: {e}")
            raise

    # Symbol cache methods

    def get_symbol(self, set_id: str) -> str | None:
        """
        Get cached symbol file path.

        Args:
            set_id: Set ID

        Returns:
            Path to cached symbol file or None if not cached/invalid
        """
        symbol_file = self.symbol_cache_dir / f"{set_id}.svg"

        if not symbol_file.exists():
            return None

        # Validate file (check if it's not empty and readable)
        try:
            if symbol_file.stat().st_size == 0:
                logger.warning(f"Symbol file {symbol_file} is empty, invalidating")
                symbol_file.unlink()
                return None

            # Basic SVG validation (check if it starts with SVG content)
            # Read only first 100 bytes to avoid loading entire file into memory
            with symbol_file.open("rb") as f:
                header = f.read(100)
            if not header.startswith(b"<svg") and not header.startswith(b"<?xml"):
                logger.warning(f"Symbol file {symbol_file} appears invalid, invalidating")
                symbol_file.unlink()
                return None

            return str(symbol_file)
        except Exception as e:
            logger.error(f"Error validating symbol file {symbol_file}: {e}")
            return None

    def save_symbol(self, set_id: str, content: bytes) -> str | None:
        """
        Save symbol to file cache.

        Args:
            set_id: Set ID
            content: SVG file content

        Returns:
            Path to saved file or None on error
        """
        symbol_file = self.symbol_cache_dir / f"{set_id}.svg"

        try:
            symbol_file.write_bytes(content)
            logger.debug(f"Saved symbol to cache: {symbol_file}")
            return str(symbol_file)
        except Exception as e:
            logger.error(f"Error saving symbol to cache {symbol_file}: {e}")
            return None

    def invalidate_symbol(self, set_id: str) -> None:
        """
        Invalidate cached symbol file.

        Args:
            set_id: Set ID
        """
        symbol_file = self.symbol_cache_dir / f"{set_id}.svg"
        try:
            if symbol_file.exists():
                symbol_file.unlink()
                logger.debug(f"Invalidated symbol cache: {symbol_file}")
        except Exception as e:
            logger.error(f"Error invalidating symbol cache {symbol_file}: {e}")

    # Statistics and monitoring

    def get_hit_rate(self) -> float:
        """
        Get cache hit rate.

        Returns:
            Hit rate as float between 0 and 1, or 0.0 if no requests
        """
        total = self._hits + self._misses
        if total == 0:
            return 0.0
        return self._hits / total

    def get_stats(self) -> dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dictionary with cache statistics
        """
        total = self._hits + self._misses
        return {
            "hits": self._hits,
            "misses": self._misses,
            "errors": self._errors,
            "total_requests": total,
            "hit_rate": self.get_hit_rate(),
            "cache_size": len(self._memory_cache),
            "max_size": self.max_size,
        }

    def reset_stats(self) -> None:
        """Reset cache statistics."""
        self._hits = 0
        self._misses = 0
        self._errors = 0
        logger.debug("Cache statistics reset")


# Global cache manager instance
_cache_manager: CacheManager | None = None


def get_cache_manager() -> CacheManager:
    """
    Get global cache manager instance (singleton pattern).

    Returns:
        CacheManager instance
    """
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager()
    return _cache_manager
