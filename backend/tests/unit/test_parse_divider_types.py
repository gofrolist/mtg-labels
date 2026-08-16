"""Unit tests for _parse_divider_types in the PDF generation route."""

import pytest
from fastapi import HTTPException

from src.api.routes import _parse_divider_types


class TestParseDividerTypes:
    """Tests for _parse_divider_types()."""

    def test_none_returns_empty(self):
        assert _parse_divider_types(None) == []

    def test_empty_string_returns_empty(self):
        assert _parse_divider_types("") == []

    def test_parses_color_type_pairs(self):
        assert _parse_divider_types("White:Creature,Blue:Instant") == [
            ("White", "Creature"),
            ("Blue", "Instant"),
        ]

    def test_dedupes_preserving_order(self):
        assert _parse_divider_types("White:Creature,White:Creature,Blue:Instant") == [
            ("White", "Creature"),
            ("Blue", "Instant"),
        ]

    def test_skips_empty_tokens(self):
        assert _parse_divider_types("White:Creature,,Blue:Instant,") == [
            ("White", "Creature"),
            ("Blue", "Instant"),
        ]

    def test_strips_whitespace(self):
        assert _parse_divider_types(" White : Creature ") == [("White", "Creature")]

    def test_keeps_multiword_types(self):
        assert _parse_divider_types("Colorless:Artifact Creature") == [
            ("Colorless", "Artifact Creature")
        ]

    def test_rejects_missing_separator(self):
        with pytest.raises(HTTPException) as exc:
            _parse_divider_types("Creature")
        assert exc.value.status_code == 400

    def test_rejects_missing_color(self):
        with pytest.raises(HTTPException) as exc:
            _parse_divider_types(":Creature")
        assert exc.value.status_code == 400

    def test_rejects_missing_type(self):
        with pytest.raises(HTTPException) as exc:
            _parse_divider_types("White:")
        assert exc.value.status_code == 400

    def test_rejects_over_length_token(self):
        with pytest.raises(HTTPException) as exc:
            _parse_divider_types("White:" + "C" * 500)
        assert exc.value.status_code == 400

    def test_rejects_too_long_value(self):
        with pytest.raises(HTTPException) as exc:
            _parse_divider_types("White:Creature," * 10000)
        assert exc.value.status_code == 400
