"""Unit tests for _parse_letters in the PDF generation route."""

import pytest
from fastapi import HTTPException

from src.api.routes import _parse_letters


class TestParseLetters:
    """Tests for _parse_letters()."""

    def test_none_returns_empty(self):
        assert _parse_letters(None) == []

    def test_empty_string_returns_empty(self):
        assert _parse_letters("") == []

    def test_parses_and_uppercases(self):
        assert _parse_letters("a,b,c") == ["A", "B", "C"]

    def test_dedupes_preserving_order(self):
        assert _parse_letters("A,A,B") == ["A", "B"]

    def test_skips_empty_tokens(self):
        assert _parse_letters("A,,B,") == ["A", "B"]

    def test_strips_whitespace(self):
        assert _parse_letters(" A , B ") == ["A", "B"]

    def test_rejects_multichar_token(self):
        with pytest.raises(HTTPException) as exc:
            _parse_letters("AB")
        assert exc.value.status_code == 400

    def test_rejects_non_letter(self):
        with pytest.raises(HTTPException) as exc:
            _parse_letters("1")
        assert exc.value.status_code == 400

    def test_rejects_too_long(self):
        with pytest.raises(HTTPException) as exc:
            _parse_letters("A," * 200)
        assert exc.value.status_code == 400
