"""Unit tests for mtg_label_generator package __init__.py."""


def test_package_version():
    """Test that package version is defined."""
    from src.mtg_label_generator import __version__

    assert __version__ == "0.1.0"
