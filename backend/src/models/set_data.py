"""Data models for Magic: The Gathering sets."""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class MTGSet:
    """Represents a Magic: The Gathering set with all metadata needed for label generation.

    Attributes:
        id: Unique identifier from Scryfall API
        name: Full set name
        code: Set code (e.g., "MH2", "CMM")
        set_type: Type of set (core, expansion, commander, etc.)
        card_count: Number of cards in the set
        released_at: Release date in ISO format (YYYY-MM-DD)
        icon_svg_uri: URL to set symbol SVG (optional)
        scryfall_uri: Scryfall API URI for the set (optional)
    """

    id: str
    name: str
    code: str
    set_type: str
    card_count: int
    released_at: str | None = None
    icon_svg_uri: str | None = None
    scryfall_uri: str | None = None

    def __post_init__(self) -> None:
        """Validate the MTGSet instance after initialization."""
        if not self.id:
            raise ValueError("Set ID must be non-empty")
        if not self.name:
            raise ValueError("Set name must be non-empty")
        if not self.code:
            raise ValueError("Set code must be non-empty")
        if len(self.code) < 2 or len(self.code) > 5:
            raise ValueError(f"Set code must be 2-5 characters, got: {self.code}")
        if self.card_count < 0:
            raise ValueError(f"Card count must be >= 0, got: {self.card_count}")

        # Validate released_at format if provided
        if self.released_at:
            try:
                datetime.strptime(self.released_at, "%Y-%m-%d")
            except ValueError as e:
                raise ValueError(f"Invalid date format for released_at: {self.released_at}") from e

    @classmethod
    def from_dict(cls, data: dict) -> "MTGSet":
        """Create an MTGSet instance from a dictionary (e.g., from Scryfall API).

        Args:
            data: Dictionary containing set data from Scryfall API

        Returns:
            MTGSet instance

        Raises:
            ValueError: If required fields are missing or invalid
        """
        return cls(
            id=data.get("id", ""),
            name=data.get("name", ""),
            code=data.get("code", ""),
            set_type=data.get("set_type", ""),
            card_count=data.get("card_count", 0),
            released_at=data.get("released_at"),
            icon_svg_uri=data.get("icon_svg_uri"),
            scryfall_uri=data.get("scryfall_uri"),
        )

    def to_dict(self) -> dict:
        """Convert MTGSet instance to dictionary.

        Returns:
            Dictionary representation of the set
        """
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "set_type": self.set_type,
            "card_count": self.card_count,
            "released_at": self.released_at,
            "icon_svg_uri": self.icon_svg_uri,
            "scryfall_uri": self.scryfall_uri,
        }
