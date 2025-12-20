"""Unit tests for MTGSet data model."""

import pytest

from src.models.set_data import MTGSet


class TestMTGSet:
    """Tests for MTGSet data model."""

    def test_mtgset_creation(self):
        """Test basic MTGSet creation."""
        set_data = MTGSet(
            id="test-id",
            name="Test Set",
            code="TST",
            set_type="expansion",
            card_count=100,
            released_at="2023-01-01",
            icon_svg_uri="https://example.com/symbol.svg",
            scryfall_uri="https://api.scryfall.com/sets/test-id",
        )
        assert set_data.id == "test-id"
        assert set_data.name == "Test Set"
        assert set_data.code == "TST"
        assert set_data.card_count == 100

    def test_mtgset_validation_empty_id(self):
        """Test that empty ID raises ValueError."""
        with pytest.raises(ValueError, match="Set ID must be non-empty"):
            MTGSet(id="", name="Test Set", code="TST", set_type="expansion", card_count=100)

    def test_mtgset_validation_empty_name(self):
        """Test that empty name raises ValueError."""
        with pytest.raises(ValueError, match="Set name must be non-empty"):
            MTGSet(id="test-id", name="", code="TST", set_type="expansion", card_count=100)

    def test_mtgset_validation_empty_code(self):
        """Test that empty code raises ValueError."""
        with pytest.raises(ValueError, match="Set code must be non-empty"):
            MTGSet(id="test-id", name="Test Set", code="", set_type="expansion", card_count=100)

    def test_mtgset_validation_code_too_short(self):
        """Test that code too short raises ValueError."""
        with pytest.raises(ValueError, match="Set code must be 2-5 characters"):
            MTGSet(id="test-id", name="Test Set", code="T", set_type="expansion", card_count=100)

    def test_mtgset_validation_code_too_long(self):
        """Test that code too long raises ValueError."""
        with pytest.raises(ValueError, match="Set code must be 2-5 characters"):
            MTGSet(
                id="test-id", name="Test Set", code="TOOLONG", set_type="expansion", card_count=100
            )

    def test_mtgset_validation_negative_card_count(self):
        """Test that negative card count raises ValueError."""
        with pytest.raises(ValueError, match="Card count must be >= 0"):
            MTGSet(id="test-id", name="Test Set", code="TST", set_type="expansion", card_count=-1)

    def test_mtgset_validation_invalid_date_format(self):
        """Test that invalid date format raises ValueError."""
        with pytest.raises(ValueError, match="Invalid date format"):
            MTGSet(
                id="test-id",
                name="Test Set",
                code="TST",
                set_type="expansion",
                card_count=100,
                released_at="invalid-date",
            )

    def test_mtgset_from_dict(self):
        """Test creating MTGSet from dictionary."""
        data = {
            "id": "test-id",
            "name": "Test Set",
            "code": "TST",
            "set_type": "expansion",
            "card_count": 100,
            "released_at": "2023-01-01",
            "icon_svg_uri": "https://example.com/symbol.svg",
            "scryfall_uri": "https://api.scryfall.com/sets/test-id",
        }
        set_data = MTGSet.from_dict(data)
        assert set_data.id == "test-id"
        assert set_data.name == "Test Set"
        assert set_data.code == "TST"
        assert set_data.card_count == 100
        assert set_data.released_at == "2023-01-01"

    def test_mtgset_from_dict_missing_fields(self):
        """Test creating MTGSet from dictionary with missing fields."""
        data = {
            "id": "test-id",
            "name": "Test Set",
            "code": "TST",
            "set_type": "expansion",
            "card_count": 100,
        }
        set_data = MTGSet.from_dict(data)
        assert set_data.id == "test-id"
        assert set_data.released_at is None
        assert set_data.icon_svg_uri is None

    def test_mtgset_to_dict(self):
        """Test converting MTGSet to dictionary."""
        set_data = MTGSet(
            id="test-id",
            name="Test Set",
            code="TST",
            set_type="expansion",
            card_count=100,
            released_at="2023-01-01",
            icon_svg_uri="https://example.com/symbol.svg",
        )
        result = set_data.to_dict()
        assert result["id"] == "test-id"
        assert result["name"] == "Test Set"
        assert result["code"] == "TST"
        assert result["card_count"] == 100
        assert result["released_at"] == "2023-01-01"
        assert result["icon_svg_uri"] == "https://example.com/symbol.svg"
