"""Cache manager for MTG Label Generator.

Provides multi-layer caching:
- In-memory cache for set data (TTL-based)
- File-based cache for SVG symbols
- Cache hit rate monitoring
"""

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from cachetools import TTLCache

from src.config import CACHE_MAX_SIZE, CACHE_TTL_SECONDS, SYMBOL_CACHE_DIR, logger


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
        self._memory_cache: TTLCache[str, Any] = TTLCache[str, Any](maxsize=max_size, ttl=ttl)

        # Lazily-loaded symbol version manifest ({symbol_id: version}).
        self._symbol_versions: dict[str, str] | None = None

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

    @staticmethod
    def _sanitize_symbol_id(set_id: str) -> str:
        """Sanitize set_id to prevent path traversal.

        Only allows alphanumeric characters, hyphens, and underscores.
        """
        return "".join(c for c in set_id if c.isalnum() or c in "-_")

    @staticmethod
    def symbol_version(symbol_url: str | None) -> str:
        """Extract the icon version from a Scryfall symbol URL.

        Scryfall's icon URLs carry a version query string (e.g.
        ``.../msh.svg?1783915200``) that changes whenever the artwork is
        updated. That version is stored in the manifest alongside the cached
        file so a bumped icon is re-downloaded instead of serving a stale file
        forever (the bug where preview-era placeholder icons never refreshed).

        Returns an empty string when the URL is missing or has no version query.
        """
        if symbol_url:
            return urlparse(symbol_url).query
        return ""

    def _versions_path(self) -> Path:
        """Path to the JSON manifest mapping symbol id -> cached version."""
        return self.symbol_cache_dir / "versions.json"

    def _load_symbol_versions(self) -> dict[str, str]:
        """Load (and memoize) the symbol version manifest.

        Keeping filenames stable (``{id}.svg``) while recording the version in a
        sidecar manifest lets a committed warm cache stay valid across restarts
        — only genuinely bumped icons re-download, rather than the whole set
        being re-fetched on every boot.
        """
        if self._symbol_versions is None:
            path = self._versions_path()
            try:
                if path.exists():
                    data = json.loads(path.read_text(encoding="utf-8"))
                    # Guard against a corrupt/unexpected manifest shape.
                    self._symbol_versions = (
                        {str(k): str(v) for k, v in data.items()} if isinstance(data, dict) else {}
                    )
                else:
                    self._symbol_versions = {}
            except (json.JSONDecodeError, OSError) as e:
                logger.warning(f"Failed to read symbol version manifest: {e}")
                self._symbol_versions = {}
        return self._symbol_versions

    def _save_symbol_versions(self) -> None:
        """Atomically persist the symbol version manifest."""
        if self._symbol_versions is None:
            return
        path = self._versions_path()
        tmp = path.with_name(f"{path.name}.tmp")
        try:
            tmp.write_text(
                json.dumps(self._symbol_versions, sort_keys=True, indent=0) + "\n",
                encoding="utf-8",
            )
            tmp.replace(path)  # atomic on POSIX
        except OSError as e:
            logger.error(f"Error saving symbol version manifest: {e}")

    def get_symbol(self, set_id: str, expected_version: str | None = None) -> str | None:
        """
        Get cached symbol file path.

        Args:
            set_id: Set ID
            expected_version: If given, the cached file is only returned when the
                manifest records this exact version. A mismatch (or missing
                manifest entry) is treated as a cache miss so the caller
                re-downloads the current artwork. Pass ``None`` to ignore
                versioning entirely.

        Returns:
            Path to cached symbol file or None if not cached/invalid/stale
        """
        safe_id = self._sanitize_symbol_id(set_id)
        if not safe_id:
            logger.warning(f"Invalid symbol ID after sanitization: {set_id!r}")
            return None
        symbol_file = self.symbol_cache_dir / f"{safe_id}.svg"

        if not symbol_file.exists():
            return None

        # Version check: a stale/missing manifest entry is a miss, triggering
        # a re-download of the current icon.
        if expected_version is not None:
            if self._load_symbol_versions().get(safe_id) != expected_version:
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

    def save_symbol(self, set_id: str, content: bytes, version: str | None = None) -> str | None:
        """
        Save symbol to file cache.

        Args:
            set_id: Set ID
            content: SVG file content
            version: Icon version to record in the manifest (see
                :meth:`symbol_version`). When provided, subsequent
                :meth:`get_symbol` calls with a different version miss and
                re-download. Pass ``None`` to leave the manifest untouched.

        Returns:
            Path to saved file or None on error
        """
        safe_id = self._sanitize_symbol_id(set_id)
        if not safe_id:
            logger.warning(f"Invalid symbol ID after sanitization: {set_id!r}")
            return None
        symbol_file = self.symbol_cache_dir / f"{safe_id}.svg"

        try:
            symbol_file.write_bytes(content)
            logger.debug(f"Saved symbol to cache: {symbol_file}")
        except Exception as e:
            logger.error(f"Error saving symbol to cache {symbol_file}: {e}")
            return None

        if version is not None:
            self._load_symbol_versions()[safe_id] = version
            self._save_symbol_versions()

        return str(symbol_file)

    def invalidate_symbol(self, set_id: str) -> None:
        """
        Invalidate cached symbol file.

        Args:
            set_id: Set ID
        """
        safe_id = self._sanitize_symbol_id(set_id)
        if not safe_id:
            return
        symbol_file = self.symbol_cache_dir / f"{safe_id}.svg"
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
