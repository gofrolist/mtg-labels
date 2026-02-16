"""Scryfall API client for fetching and processing MTG set data."""

import time

import requests
from fastapi import HTTPException
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from src.cache.cache_manager import get_cache_manager
from src.config import (
    IGNORED_SETS,
    MINIMUM_SET_SIZE,
    SCRYFALL_API_BASE_URL,
    SCRYFALL_API_RATE_LIMIT_DELAY,
    SCRYFALL_API_RETRY_ATTEMPTS,
    SCRYFALL_API_TIMEOUT,
    SET_TYPES,
    logger,
)


class ScryfallClient:
    """
    Client to fetch and process Scryfall set data.

    Uses caching and session reuse for improved performance.
    Includes improved error handling with retries and timeouts.
    """

    BASE_URL = SCRYFALL_API_BASE_URL

    def __init__(self) -> None:
        """Initialize ScryfallClient with optimized session and cache."""
        self.session = requests.Session()

        # Configure connection pooling for better performance
        retry_strategy = Retry(
            total=SCRYFALL_API_RETRY_ATTEMPTS,
            backoff_factor=0.3,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"],
        )

        adapter = HTTPAdapter(
            pool_connections=10,  # Number of connection pools to cache
            pool_maxsize=20,  # Maximum number of connections to save in the pool
            max_retries=retry_strategy,
        )

        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        # Set default headers for better connection reuse
        # User-Agent and Accept headers are required by Scryfall API
        self.session.headers.update(
            {
                "User-Agent": "MTG-Label-Generator/1.0",
                "Accept": "application/json",
                "Connection": "keep-alive",
            }
        )

        # Track last request time for rate limiting
        self._last_request_time: float | None = None

        self.cache_manager = get_cache_manager()
        self.logger = logger
        self._card_types_cache: list[str] | None = None

    def fetch_sets(self) -> list[dict]:
        """
        Fetch all sets from Scryfall API with caching.

        Returns:
            List of set dictionaries from Scryfall API

        Raises:
            HTTPException: If API request fails or returns error status
        """
        cache_key = "sets"

        def fetch_from_api() -> list[dict]:
            self._apply_rate_limit()
            try:
                response = self.session.get(self.BASE_URL, timeout=SCRYFALL_API_TIMEOUT)
            except requests.RequestException as e:
                self.logger.error(f"Network error while fetching sets: {e}")
                raise HTTPException(status_code=500, detail="Error fetching sets from Scryfall.")

            if response.status_code != 200:
                self.logger.error(f"Failed to fetch sets, status code: {response.status_code}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Error fetching sets from Scryfall. Status: {response.status_code}",
                )

            data = response.json()
            sets = data.get("data", [])
            self.logger.info(f"Fetched {len(sets)} sets")
            return sets

        try:
            return self.cache_manager.get_or_fetch(cache_key, fetch_from_api)
        except HTTPException:
            self.cache_manager.invalidate_on_error(cache_key)
            raise
        except Exception as e:
            self.cache_manager.invalidate_on_error(cache_key)
            self.logger.error(f"Unexpected error fetching sets: {e}")
            raise HTTPException(status_code=500, detail="Error fetching sets from Scryfall.")

    @staticmethod
    def filter_sets(sets: list[dict]) -> list[dict]:
        """
        Filter sets based on configuration criteria.

        Args:
            sets: List of set dictionaries to filter

        Returns:
            Filtered list of sets that meet criteria
        """
        filtered: list[dict] = []
        for s in sets:
            set_type = s.get("set_type", "").lower()
            card_count = s.get("card_count", 0)
            code = s.get("code", "").lower()
            digital = s.get("digital", False)

            if set_type not in SET_TYPES:
                logger.debug(f"Excluding set '{s.get('name')}' due to set_type '{set_type}'")
                continue
            if card_count < MINIMUM_SET_SIZE:
                logger.debug(f"Excluding set '{s.get('name')}' due to card_count {card_count}")
                continue
            if code in IGNORED_SETS:
                logger.debug(f"Excluding set '{s.get('name')}' due to ignored code '{code}'")
                continue
            if digital:
                logger.debug(f"Excluding set '{s.get('name')}' due to digital-only release")
                continue
            filtered.append(s)

        logger.info(f"Filtered sets count: {len(filtered)}")
        return filtered

    def get_card_types_by_color(self) -> dict[str, list[str]]:
        """
        Get card types organized by color for label generation.

        Returns a structure where each color has a list of card types
        that can be used for labels. Each type is a selectable item.

        Returns:
            Dictionary: {color: [type1, type2, ...]}
        """
        # Card types to exclude (special/niche types not commonly used for organization)
        excluded_types = {
            "Conspiracy",
            "Dungeon",
            "Emblem",
            "Hero",
            "Phenomenon",
            "Plane",
            "Scheme",
            "Vanguard",
        }

        # Fetch card types catalog
        try:
            card_types_catalog = self.fetch_card_types_catalog()
        except Exception as e:
            logger.warning(f"Failed to fetch card types catalog, using fallback: {e}")
            # Fallback to common types
            card_types_catalog = [
                "Creature",
                "Instant",
                "Sorcery",
                "Enchantment",
                "Artifact",
                "Planeswalker",
                "Land",
                "Battle",
            ]

        # Filter out excluded types
        filtered_types = [t for t in card_types_catalog if t not in excluded_types]

        # Organize types by color
        # Each color gets all types (since any type can appear in any color)
        color_order = ["White", "Blue", "Black", "Red", "Green", "Multicolor", "Colorless"]

        # Prioritize common types, then use catalog order
        common_types = [
            "Creature",
            "Instant",
            "Sorcery",
            "Enchantment",
            "Artifact",
            "Planeswalker",
            "Land",
        ]
        type_order = common_types + [t for t in filtered_types if t not in common_types]

        # Create structure: each color gets all types
        result: dict[str, list[str]] = {}
        for color in color_order:
            result[color] = type_order.copy()

        logger.info(
            f"Organized {len(type_order)} card types across {len(color_order)} colors "
            f"(excluded {len(excluded_types)} types)"
        )
        return result

    def fetch_card_types_catalog(self) -> list[str]:
        """
        Fetch the card types catalog from Scryfall API with caching.

        Returns:
            List of card type strings from Scryfall catalog

        Raises:
            HTTPException: If API request fails or returns error status
        """
        if self._card_types_cache is not None:
            return self._card_types_cache

        cache_key = "card_types_catalog"

        def fetch_from_api() -> list[str]:
            self._apply_rate_limit()
            url = "https://api.scryfall.com/catalog/card-types"

            try:
                response = self.session.get(url, timeout=SCRYFALL_API_TIMEOUT)
            except requests.RequestException as e:
                self.logger.error(f"Network error while fetching card types catalog: {e}")
                raise HTTPException(
                    status_code=500,
                    detail="Error fetching card types catalog from Scryfall.",
                )

            if response.status_code != 200:
                self.logger.error(
                    f"Failed to fetch card types catalog, status code: {response.status_code}"
                )
                raise HTTPException(
                    status_code=500,
                    detail=(
                        f"Error fetching card types catalog from Scryfall. "
                        f"Status: {response.status_code}"
                    ),
                )

            data = response.json()
            if data.get("object") != "catalog" or "data" not in data:
                self.logger.error("Unexpected response format from card types catalog")
                raise HTTPException(
                    status_code=500,
                    detail="Unexpected response format from Scryfall catalog.",
                )

            card_types = data["data"]
            self.logger.info(f"Fetched {len(card_types)} card types from catalog")
            return card_types

        try:
            card_types = self.cache_manager.get_or_fetch(cache_key, fetch_from_api)
            self._card_types_cache = card_types
            return card_types
        except HTTPException:
            self.cache_manager.invalidate_on_error(cache_key)
            raise
        except Exception as e:
            self.cache_manager.invalidate_on_error(cache_key)
            self.logger.error(f"Unexpected error fetching card types catalog: {e}")
            raise HTTPException(
                status_code=500, detail="Error fetching card types catalog from Scryfall."
            )

    def _apply_rate_limit(self) -> None:
        """
        Apply rate limiting delay between requests.

        Scryfall API guidelines recommend 50-100ms delay between requests
        (approximately 10 requests per second).
        """
        if self._last_request_time is not None:
            elapsed = time.time() - self._last_request_time
            if elapsed < SCRYFALL_API_RATE_LIMIT_DELAY:
                sleep_time = SCRYFALL_API_RATE_LIMIT_DELAY - elapsed
                time.sleep(sleep_time)

        self._last_request_time = time.time()
