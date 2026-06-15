"""Unit tests for the streaming body-size-limit ASGI middleware.

Drives ``_BodySizeLimitMiddleware`` directly with crafted ASGI scope/receive/
send so every branch (declared-length, streamed count, malformed length,
disconnect, replay) is covered deterministically without a network or server.
"""

import asyncio

from src.api.routes import _BodySizeLimitMiddleware


class _RecordingApp:
    """Inner ASGI app that drains the body and records what it received."""

    def __init__(self) -> None:
        self.called = False
        self.body = b""

    async def __call__(self, scope, receive, send) -> None:
        self.called = True
        while True:
            message = await receive()
            if message["type"] == "http.request":
                self.body += message.get("body", b"")
                if not message.get("more_body", False):
                    break
            elif message["type"] == "http.disconnect":
                break
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})


def _run(middleware, scope, incoming_messages):
    """Drive ``middleware`` with the given receive messages; return sent list."""
    sent: list[dict] = []
    queue = list(incoming_messages)

    async def receive():
        if queue:
            return queue.pop(0)
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        sent.append(message)

    asyncio.run(middleware(scope, receive, send))
    return sent


def _http_scope(headers=None, path="/generate-pdf"):
    return {"type": "http", "path": path, "headers": headers or []}


def _status_of(sent):
    for message in sent:
        if message["type"] == "http.response.start":
            return message["status"]
    return None


def test_under_limit_passes_through_and_replays_body():
    app = _RecordingApp()
    mw = _BodySizeLimitMiddleware(app, max_bytes=1024)
    body = b"a" * 100
    sent = _run(
        mw,
        _http_scope(headers=[(b"content-length", b"100")]),
        [{"type": "http.request", "body": body, "more_body": False}],
    )
    assert app.called is True
    assert app.body == body
    assert _status_of(sent) == 200


def test_declared_oversized_rejected_with_413_before_reading():
    app = _RecordingApp()
    mw = _BodySizeLimitMiddleware(app, max_bytes=128)
    sent = _run(
        mw,
        _http_scope(headers=[(b"content-length", b"999999")]),
        [{"type": "http.request", "body": b"x" * 10, "more_body": False}],
    )
    assert app.called is False
    assert _status_of(sent) == 413


def test_chunked_oversized_rejected_by_streamed_count():
    """No Content-Length header; the running byte count must trip the cap."""
    app = _RecordingApp()
    mw = _BodySizeLimitMiddleware(app, max_bytes=128)
    sent = _run(
        mw,
        _http_scope(headers=[]),  # no content-length -> chunked
        [
            {"type": "http.request", "body": b"x" * 100, "more_body": True},
            {"type": "http.request", "body": b"x" * 100, "more_body": False},
        ],
    )
    assert app.called is False
    assert _status_of(sent) == 413


def test_malformed_content_length_fails_closed_with_400():
    app = _RecordingApp()
    mw = _BodySizeLimitMiddleware(app, max_bytes=128)
    sent = _run(
        mw,
        _http_scope(headers=[(b"content-length", b"not-a-number")]),
        [{"type": "http.request", "body": b"x", "more_body": False}],
    )
    assert app.called is False
    assert _status_of(sent) == 400


def test_negative_content_length_fails_closed_with_400():
    app = _RecordingApp()
    mw = _BodySizeLimitMiddleware(app, max_bytes=128)
    sent = _run(
        mw,
        _http_scope(headers=[(b"content-length", b"-5")]),
        [{"type": "http.request", "body": b"x", "more_body": False}],
    )
    assert app.called is False
    assert _status_of(sent) == 400


def test_disconnect_is_forwarded_to_inner_app():
    app = _RecordingApp()
    mw = _BodySizeLimitMiddleware(app, max_bytes=128)
    sent = _run(
        mw,
        _http_scope(headers=[]),
        [{"type": "http.disconnect"}],
    )
    # The inner app is invoked with the disconnect surfaced.
    assert app.called is True
    assert _status_of(sent) == 200


def test_non_http_scope_passes_through_untouched():
    app = _RecordingApp()
    mw = _BodySizeLimitMiddleware(app, max_bytes=128)
    sent = _run(mw, {"type": "lifespan"}, [])
    assert app.called is True
    assert _status_of(sent) == 200


def test_multi_chunk_body_under_limit_is_fully_delivered():
    """A body split across several chunks reaches the inner app intact."""
    app = _RecordingApp()
    mw = _BodySizeLimitMiddleware(app, max_bytes=1024)
    sent = _run(
        mw,
        _http_scope(headers=[]),
        [
            {"type": "http.request", "body": b"aaa", "more_body": True},
            {"type": "http.request", "body": b"bbb", "more_body": True},
            {"type": "http.request", "body": b"ccc", "more_body": False},
        ],
    )
    assert app.called is True
    assert app.body == b"aaabbbccc"
    assert _status_of(sent) == 200


def test_unknown_message_type_does_not_hang():
    """A stray non-request/non-disconnect message must not spin the loop.

    Only a finite set of messages is queued; if the loop did not break on the
    unknown type it would call receive() forever and asyncio.run would never
    return. Reaching the assertion proves it terminated.
    """
    app = _RecordingApp()
    mw = _BodySizeLimitMiddleware(app, max_bytes=128)
    sent = _run(
        mw,
        _http_scope(headers=[]),
        [
            {"type": "http.request", "body": b"hi", "more_body": True},
            {"type": "http.weird.extension"},
        ],
    )
    # The middleware stops reading on the unknown type and still hands off.
    assert app.called is True
    assert _status_of(sent) == 200
