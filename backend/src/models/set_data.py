"""Pydantic models for MTG set data."""

from pydantic import BaseModel


class MTGSetResponse(BaseModel):
    """Response model for an MTG set."""

    id: str
    name: str
    code: str
    set_type: str
    card_count: int = 0
    released_at: str | None = None
    icon_svg_uri: str | None = None
    scryfall_uri: str | None = None
