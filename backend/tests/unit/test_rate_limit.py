"""Unit tests for the per-IP rate limiter and client-IP extraction."""

from unittest.mock import Mock

import pytest

from src.api.rate_limit import RateLimiter, get_client_ip


class TestRateLimiter:
    """RateLimiter counts hits per key within a TTL window."""

    def test_allows_requests_under_limit(self):
        rl = RateLimiter(max_requests=3, window_seconds=60)
        assert rl.hit("1.2.3.4") is True
        assert rl.hit("1.2.3.4") is True
        assert rl.hit("1.2.3.4") is True

    def test_blocks_requests_over_limit(self):
        rl = RateLimiter(max_requests=2, window_seconds=60)
        rl.hit("1.2.3.4")
        rl.hit("1.2.3.4")
        assert rl.hit("1.2.3.4") is False

    def test_counts_are_isolated_per_key(self):
        rl = RateLimiter(max_requests=1, window_seconds=60)
        assert rl.hit("1.2.3.4") is True
        # Different IP should still be allowed independently.
        assert rl.hit("5.6.7.8") is True
        # First IP is now blocked.
        assert rl.hit("1.2.3.4") is False

    def test_handles_unknown_key_without_error(self):
        rl = RateLimiter(max_requests=1, window_seconds=60)
        # Calling hit() with a never-seen key must not raise.
        assert rl.hit("unknown") is True


def _mock_request(headers: dict[str, str] | None = None, client_host: str | None = None) -> Mock:
    """Build a minimal Mock request with FastAPI-style headers/client attributes."""
    request = Mock()
    request.headers = headers or {}
    if client_host is None:
        request.client = None
    else:
        request.client = Mock()
        request.client.host = client_host
    return request


class TestGetClientIP:
    """get_client_ip prefers proxy headers in a documented order."""

    def test_prefers_fly_client_ip(self):
        req = _mock_request(
            headers={"fly-client-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8"},
            client_host="9.9.9.9",
        )
        assert get_client_ip(req) == "1.2.3.4"

    def test_falls_back_to_first_xff_entry(self):
        req = _mock_request(
            headers={"x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.9.9.9"},
            client_host="2.2.2.2",
        )
        assert get_client_ip(req) == "1.2.3.4"

    def test_falls_back_to_request_client_host(self):
        req = _mock_request(headers={}, client_host="1.2.3.4")
        assert get_client_ip(req) == "1.2.3.4"

    def test_returns_unknown_when_nothing_available(self):
        req = _mock_request(headers={}, client_host=None)
        assert get_client_ip(req) == "unknown"

    def test_ignores_blank_header_values(self):
        # Empty strings in proxy headers should not be returned as the IP.
        req = _mock_request(
            headers={"fly-client-ip": "", "x-forwarded-for": "  , 1.2.3.4"},
            client_host="9.9.9.9",
        )
        assert get_client_ip(req) == "1.2.3.4"


class TestRateLimiterValidation:
    """Constructor rejects nonsensical configuration."""

    def test_rejects_non_positive_max_requests(self):
        with pytest.raises(ValueError):
            RateLimiter(max_requests=0, window_seconds=60)

    def test_rejects_non_positive_window(self):
        with pytest.raises(ValueError):
            RateLimiter(max_requests=10, window_seconds=0)
