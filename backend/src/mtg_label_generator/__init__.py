"""MTG Label Generator package.

This package provides the MTG Label Generator application.
The actual implementation is in the parent src/ directory modules.
"""

from pathlib import Path
from tomllib import load

# Read version from pyproject.toml
_pyproject_path = Path(__file__).parent.parent.parent / "pyproject.toml"
if _pyproject_path.exists():
    with _pyproject_path.open("rb") as f:
        _pyproject_data = load(f)
        __version__ = _pyproject_data["project"]["version"]
else:
    # Fallback if pyproject.toml is not found (shouldn't happen in normal usage)
    __version__ = "0.0.0"
