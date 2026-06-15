"""Per-IP request rate limiting.

This is a small, in-memory rate limiter intended to protect expensive
endpoints from per-source abuse. It is per-instance only — when the app
runs on multiple workers/VMs, each instance enforces its own bucket. That
is acceptable for the current single-VM Fly deploy; revisit if scaled out.

The implementation uses ``cachetools.TTLCache`` so entries automatically
expire after the window passes, which gives a simple sliding-bucket
approximation without needing a background cleanup task.
"""

from threading import Lock
from typing import Any

from cachetools import TTLCache


class RateLimiter:
    """Counts hits per key within a TTL window.

    Args:
        max_requests: Maximum allowed hits per key inside the window.
        window_seconds: Width of the sliding window in seconds.
    """

    def __init__(self, max_requests: int, window_seconds: int, max_keys: int = 10_000) -> None:
        if max_requests <= 0:
            raise ValueError("max_requests must be > 0")
        if window_seconds <= 0:
            raise ValueError("window_seconds must be > 0")
        self._max = max_requests
        self._counters: TTLCache[str, int] = TTLCache(maxsize=max_keys, ttl=window_seconds)
        self._lock = Lock()

    def hit(self, key: str) -> bool:
        """Record a request from ``key`` and return whether it is allowed.

        Returns:
            True if the request is within the limit; False once the limit
            for this window has been reached.
        """
        with self._lock:
            current = self._counters.get(key, 0)
            if current >= self._max:
                return False
            self._counters[key] = current + 1
            return True


def get_client_ip(request: Any) -> str:
    """Return the best-effort client IP for rate-limit bucketing.

    Order of preference:
        1. ``Fly-Client-IP`` — Fly.io's authoritative client IP header.
        2. First non-empty entry of ``X-Forwarded-For``.
        3. ``request.client.host`` — the direct peer.
        4. ``"unknown"`` — group anonymous clients into one bucket so a
           missing IP still gets rate-limited (rather than bypassing).
    """
    headers = getattr(request, "headers", {}) or {}

    fly_ip = _first_non_blank(headers.get("fly-client-ip"))
    if fly_ip:
        return fly_ip

    xff_raw = headers.get("x-forwarded-for")
    if xff_raw:
        for part in xff_raw.split(","):
            candidate = part.strip()
            if candidate:
                return candidate

    client = getattr(request, "client", None)
    if client is not None:
        host = getattr(client, "host", None)
        if host:
            return str(host)

    return "unknown"


def _first_non_blank(value: object) -> str | None:
    """Return ``value`` stripped if non-empty, else ``None``."""
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    return stripped or None
