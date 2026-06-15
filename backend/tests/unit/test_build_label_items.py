"""Unit tests for _build_label_items letter expansion."""

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
