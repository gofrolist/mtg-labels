"""Per-IP request rate limiting.

This is a small, in-memory rate limiter intended to protect expensive
endpoints from per-source abuse. It is per-instance only — when the app
runs on multiple workers/VMs, each instance enforces its own bucket. That
is acceptable for the current single-VM Fly deploy; revisit if scaled out.

Window semantics: a **fixed window**. The first request from a key opens a
window of ``window_seconds`` and up to ``max_requests`` are allowed inside
it. The window start is tracked explicitly (``time.monotonic``), not derived
from cache-entry expiry, so a slow-but-steady client cannot keep extending
its own window by trickling requests just under the limit. Once the window
elapses, the next request opens a fresh one.

Client-IP resolution (``get_client_ip``) trusts proxy headers. The
``X-Forwarded-For`` fallback is only safe behind a proxy that overwrites it
(Fly.io injects the authoritative ``Fly-Client-IP``). If this app is ever
exposed without that proxy, a client can spoof the header to dodge the
bucket — treat this limiter as an abuse speed-bump, not a hard security
boundary, and gate XFF on a trusted-proxy allowlist before relying on it.
"""

import time
from threading import Lock
from typing import Any, Protocol

from cachetools import TTLCache


class _ClientRequest(Protocol):
    """Structural type for the request attributes ``get_client_ip`` reads.

    Both a real Starlette ``Request`` and test doubles satisfy this; access is
    defensive (``getattr``) so a partially-formed object never raises.
    """

    @property
    def headers(self) -> Any: ...

    @property
    def client(self) -> Any: ...


class RateLimiter:
    """Fixed-window per-key request counter.

    Args:
        max_requests: Maximum allowed hits per key inside one window.
        window_seconds: Width of the fixed window in seconds.
        max_keys: Upper bound on simultaneously tracked keys. Beyond this,
            least-recently-used keys are evicted; an evicted key starts a
            fresh window on its next request. Sized generously so a normal
            IP population never causes eviction.
    """

    def __init__(self, max_requests: int, window_seconds: int, max_keys: int = 100_000) -> None:
        if max_requests <= 0:
            raise ValueError("max_requests must be > 0")
        if window_seconds <= 0:
            raise ValueError("window_seconds must be > 0")
        self._max = max_requests
        self._window = float(window_seconds)
        # TTL eviction only reclaims idle keys; correctness does not depend on
        # it because each entry carries its own window-start timestamp. The TTL
        # is 2x the window so an actively-counting key is never evicted mid-
        # window by the cache itself.
        self._counters: TTLCache[str, tuple[int, float]] = TTLCache(
            maxsize=max_keys, ttl=window_seconds * 2
        )
        self._lock = Lock()

    def hit(self, key: str) -> bool:
        """Record a request from ``key`` and return whether it is allowed.

        Returns:
            True if the request is within the limit for the current window;
            False once ``max_requests`` has been reached before the window
            rolls over.
        """
        now = time.monotonic()
        with self._lock:
            entry = self._counters.get(key)
            if entry is None or now - entry[1] >= self._window:
                # No active window (new key, or the previous window elapsed):
                # open a fresh one anchored at this request.
                self._counters[key] = (1, now)
                return True
            count, window_start = entry
            if count >= self._max:
                return False
            self._counters[key] = (count + 1, window_start)
            return True


def get_client_ip(request: _ClientRequest) -> str:
    """Return the best-effort client IP for rate-limit bucketing.

    Order of preference:
        1. ``Fly-Client-IP`` — Fly.io's authoritative client IP header.
        2. First non-empty entry of ``X-Forwarded-For`` (see module docstring
           for the trust caveat).
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
