# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the backend.

## Overview

FastAPI app for generating printable Avery label sheets for Magic: The Gathering sets. PDF generation via ReportLab, data from Scryfall API.

## Architecture

Layered: `src/api/` (routes, dependencies) → `src/services/` (scryfall_client, pdf_generator, helpers) → `src/models/` (set_data). Caching in `src/cache/cache_manager.py` (in-memory TTL + file-based SVG cache). Config centralized in `src/config.py` (env vars with defaults). Entry point: `main.py`.

## Commands

```bash
uv sync                          # Install dependencies
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8080  # Dev server
uv run pytest                    # All tests
uv run pytest tests/unit/ -v     # Unit tests only
uv run pytest tests/unit/test_scryfall_client.py::TestClassName::test_name -v  # Single test
uv run pytest -m unit            # By marker (unit, integration, contract, performance)
uv run pytest --cov=src --cov-report=term-missing  # With coverage
uv run ruff check                # Lint
uv run ruff format .             # Format
uv run pyright                   # Type check
make check                       # Lint + typecheck
make test                        # Run all tests
```

## Environment

- Python 3.13+ (`.python-version`)
- System dependency: `brew install cairo pkg-config` (for cairosvg/pycairo)

## Code Style

Ruff linter+formatter, line length 100, double quotes, Python 3.13 target. Pyright for types (basic mode). Pre-commit hooks configured at repo root.

## Testing

pytest with markers (`@pytest.mark.unit`, `integration`, `contract`, `performance`). Tests in `tests/{unit,integration,contract}/`. 80% minimum coverage target. Coverage config in `pyproject.toml`.

## Domain Details

- Scryfall API (`https://api.scryfall.com/sets`) is the data source for MTG set info and symbols
- Set filtering rules and ignored sets in `src/config.py` (SET_TYPES, IGNORED_SETS, MINIMUM_SET_SIZE)
- Label templates (Avery 5160, L7160, L7157, J8158, 94208, 64x30-R) defined in `config.py` LABEL_TEMPLATES with point-based dimensions
- Long set names have abbreviation mappings in `config.py` ABBREVIATION_MAP
- PDF uses EB Garamond Bold (set name) and Source Sans Pro Regular (set code/date) fonts from `fonts/`
- SVG set symbols cached to `static/images/`
