"""
Pytest configuration and shared fixtures for MTG Label Generator tests.
"""

from unittest.mock import Mock

import pytest


@pytest.fixture
def mock_scryfall_response() -> dict:
    """Mock Scryfall API response for sets."""
    return {
        "data": [
            {
                "id": "test-set-1",
                "name": "Test Set 1",
                "code": "TS1",
                "set_type": "expansion",
                "card_count": 100,
                "released_at": "2023-01-01",
                "icon_svg_uri": "https://example.com/symbol.svg",
                "scryfall_uri": "https://api.scryfall.com/sets/test-set-1",
            },
            {
                "id": "test-set-2",
                "name": "Test Set 2",
                "code": "TS2",
                "set_type": "core",
                "card_count": 200,
                "released_at": "2023-06-01",
                "icon_svg_uri": "https://example.com/symbol2.svg",
                "scryfall_uri": "https://api.scryfall.com/sets/test-set-2",
            },
        ]
    }


@pytest.fixture
def sample_set_data() -> list[dict]:
    """Sample set data for testing."""
    return [
        {
            "id": "test-set-1",
            "name": "Test Set 1",
            "code": "TS1",
            "set_type": "expansion",
            "card_count": 100,
            "released_at": "2023-01-01",
            "icon_svg_uri": "https://example.com/symbol.svg",
        },
        {
            "id": "test-set-2",
            "name": "Test Set 2",
            "code": "TS2",
            "set_type": "core",
            "card_count": 200,
            "released_at": "2023-06-01",
            "icon_svg_uri": "https://example.com/symbol2.svg",
        },
    ]


@pytest.fixture
def mock_requests_session():
    """Mock requests session for API testing."""
    session = Mock()
    session.get = Mock()
    session.post = Mock()
    return session


@pytest.fixture
def temp_image_dir(tmp_path):
    """Temporary directory for test images."""
    image_dir = tmp_path / "static" / "images"
    image_dir.mkdir(parents=True, exist_ok=True)
    return image_dir


@pytest.fixture
def mock_svg_file(tmp_path):
    """Create a mock SVG file for testing."""
    svg_file = tmp_path / "test_symbol.svg"
    svg_content = """<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="blue"/>
</svg>"""
    svg_file.write_text(svg_content)
    return svg_file
