"""Unit tests for _build_label_items divider expansion."""

from unittest.mock import patch

from src.api.routes import _build_label_items

SAMPLE_SETS = [
    {"id": "s1", "name": "Set One", "code": "S1", "released_at": "2021-06-01"},
    {"id": "s2", "name": "Set Two", "code": "S2", "released_at": "2022-02-01"},
]


class TestBuildLabelItemsLetters:
    """Tests for letter expansion in _build_label_items()."""

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_expands_each_set_per_letter(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_SETS
        items = _build_label_items("sets", ["s1", "s2"], None, 0, ["A", "B", "C"])
        assert [(i["id"], i["letter"]) for i in items] == [
            ("s1", "A"),
            ("s1", "B"),
            ("s1", "C"),
            ("s2", "A"),
            ("s2", "B"),
            ("s2", "C"),
        ]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_no_letters_one_item_per_set(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_SETS
        items = _build_label_items("sets", ["s1", "s2"], None, 0, None)
        assert len(items) == 2
        assert "letter" not in items[0]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_does_not_mutate_source_set(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_SETS
        _build_label_items("sets", ["s1"], None, 0, ["A"])
        assert "letter" not in SAMPLE_SETS[0]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_letters_keep_leading_placeholders(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_SETS
        items = _build_label_items("sets", ["s1"], None, 2, ["A", "B"])
        assert items[0] == {"__placeholder__": True}
        assert items[1] == {"__placeholder__": True}
        assert [i["letter"] for i in items[2:]] == ["A", "B"]

    def test_types_view_ignores_letters(self):
        items = _build_label_items("types", None, ["White:Creature"], 0, ["A", "B"])
        assert len(items) == 1
        assert "letter" not in items[0]


class TestBuildLabelItemsDividerTypes:
    """Tests for type-divider expansion in _build_label_items()."""

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_expands_each_set_per_divider_type(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_SETS
        items = _build_label_items(
            "sets", ["s1", "s2"], None, 0, None, [("White", "Creature"), ("Blue", "Instant")]
        )
        assert [(i["id"], i["divider_color"], i["divider_type"]) for i in items] == [
            ("s1", "White", "Creature"),
            ("s1", "Blue", "Instant"),
            ("s2", "White", "Creature"),
            ("s2", "Blue", "Instant"),
        ]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_crosses_letters_with_divider_types(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_SETS
        items = _build_label_items(
            "sets", ["s1"], None, 0, ["A", "B"], [("White", "Creature"), ("Blue", "Instant")]
        )
        assert [(i["letter"], i["divider_type"]) for i in items] == [
            ("A", "Creature"),
            ("A", "Instant"),
            ("B", "Creature"),
            ("B", "Instant"),
        ]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_no_dividers_one_item_per_set(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_SETS
        items = _build_label_items("sets", ["s1", "s2"], None, 0, None, None)
        assert len(items) == 2
        assert "divider_type" not in items[0]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_letters_only_carry_no_divider_type(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_SETS
        items = _build_label_items("sets", ["s1"], None, 0, ["A"], None)
        assert items[0]["letter"] == "A"
        assert "divider_type" not in items[0]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_does_not_mutate_source_set(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_SETS
        _build_label_items("sets", ["s1"], None, 0, None, [("White", "Creature")])
        assert "divider_type" not in SAMPLE_SETS[0]

    def test_types_view_ignores_divider_types(self):
        items = _build_label_items(
            "types", None, ["White:Creature"], 0, None, [("Blue", "Instant")]
        )
        assert len(items) == 1
        assert "divider_type" not in items[0]
