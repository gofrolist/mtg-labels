"""Unit tests for mtg_labels package __init__.py."""


def test_package_version():
    """Test that package version is defined."""
    from src.mtg_labels import __version__

    assert __version__ == "0.1.0"
