# Quickstart Guide: Project Optimization & Modernization

**Date**: 2025-11-25
**Feature**: Project Optimization & Modernization
**Phase**: Phase 1 - Design

## Prerequisites

- Python 3.13 or higher
- UV package manager installed ([installation guide](https://github.com/astral-sh/uv))
- Git
- Internet connection (for Scryfall API access)

## Initial Setup

### 1. Install UV

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or via pip
pip install uv
```

### 2. Clone and Setup Project

```bash
# Clone repository (if not already cloned)
git clone <repository-url>
cd mtg-label-generator

# Checkout feature branch
git checkout 001-optimize-project

# Install dependencies with UV
uv sync

# Activate virtual environment (created automatically by UV)
source .venv/bin/activate  # On macOS/Linux
# or
.venv\Scripts\activate  # On Windows
```

### 3. Verify Installation

```bash
# Check Python version
python --version  # Should be 3.13+

# Check UV installation
uv --version

# Verify dependencies
uv pip list
```

## Development Workflow

### Running the Application

```bash
# Development server with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or using UV's run command
uv run uvicorn main:app --reload
```

Access the application at: `http://localhost:8000`

### Running Tests

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=src --cov-report=html

# Run specific test file
uv run pytest tests/unit/test_scryfall_client.py

# Run tests in watch mode (requires pytest-watch)
uv run ptw tests/
```

### Code Quality Checks

```bash
# Linting (using ruff)
uv run ruff check .

# Type checking (using pyright)
uv run pyright

# Format code (using ruff)
uv run ruff format .
```

## Project Structure

```
mtg-label-generator/
├── src/                    # Source code
│   ├── api/               # FastAPI routes
│   ├── services/          # Business logic
│   ├── models/           # Data models
│   └── cache/            # Caching logic
├── tests/                 # Test suite
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── contract/        # Contract tests
├── static/               # Static files (images, etc.)
├── templates/            # HTML templates
├── fonts/                # Font files
├── pyproject.toml        # Project configuration (UV-compatible)
├── uv.lock              # Dependency lock file
└── README.md            # Project documentation
```

## Adding Dependencies

```bash
# Add a new dependency
uv add <package-name>

# Add a development dependency
uv add --group dev <package-name>

# Update dependencies
uv sync --upgrade

# Remove a dependency
uv remove <package-name>
```

## Testing Workflow (TDD)

### 1. Write Test First

```python
# tests/unit/test_new_feature.py
def test_new_feature():
    # Arrange
    # Act
    # Assert
    assert result == expected
```

### 2. Run Test (Should Fail)

```bash
uv run pytest tests/unit/test_new_feature.py
```

### 3. Implement Feature

```python
# src/services/new_feature.py
def new_feature():
    # Implementation
    pass
```

### 4. Run Test Again (Should Pass)

```bash
uv run pytest tests/unit/test_new_feature.py
```

### 5. Refactor and Verify

```bash
uv run pytest  # All tests should still pass
```

## Caching Development

### Testing Cache Behavior

```bash
# Run tests with cache disabled
CACHE_DISABLED=true uv run pytest tests/unit/test_cache_manager.py

# Monitor cache hit rates
# Add logging to cache operations
```

### Cache Debugging

```python
# Enable debug logging for cache
import logging
logging.getLogger("cache").setLevel(logging.DEBUG)
```

## Performance Testing

### Measure PDF Generation Performance

```bash
# Run performance tests
uv run pytest tests/integration/test_performance.py

# Profile memory usage
uv run pytest --profile tests/integration/test_pdf_generation.py
```

### Benchmark API Response Times

```bash
# Run API benchmarks
uv run pytest tests/integration/test_api_performance.py -v
```

## Deployment

### Local Testing Before Deployment

```bash
# Run full test suite
uv run pytest

# Check code quality
uv run ruff check .
uv run pyright

# Test production build locally
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

### GitHub Actions (Automatic)

Deployment is automatic on push to `main` branch:
1. Tests run automatically
2. Code quality checks run
3. If all pass, deployment to Fly.io triggers
4. Health checks verify deployment success

### Manual Deployment to Fly.io

```bash
# Install Fly.io CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
fly auth login

# Deploy
fly deploy

# Check deployment status
fly status

# View logs
fly logs
```

## Environment Variables

Create `.env` file for local development:

```bash
# .env (not committed to git)
CACHE_TTL_SECONDS=3600
LOG_LEVEL=DEBUG
SCRYFALL_API_URL=https://api.scryfall.com/sets
```

## Common Tasks

### Clear Cache

```bash
# Clear file cache (symbols)
rm -rf static/images/*.svg

# Clear in-memory cache (restart application)
```

### Update Set Data

```bash
# Force refresh set data (clear cache first)
# Restart application to clear in-memory cache
```

### Debugging

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Run with debugger
uv run python -m pdb -m uvicorn main:app
```

## Troubleshooting

### UV Installation Issues

```bash
# Update UV
uv self update

# Verify installation
which uv
uv --version
```

### Dependency Conflicts

```bash
# Clear UV cache and reinstall
rm -rf .venv
uv sync
```

### Test Failures

```bash
# Run tests with verbose output
uv run pytest -vv

# Run specific failing test
uv run pytest tests/path/to/test.py::test_name -vv
```

### Cache Issues

```bash
# Clear all caches
rm -rf static/images/*.svg
# Restart application
```

## Next Steps

1. Review [spec.md](./spec.md) for feature requirements
2. Review [plan.md](./plan.md) for implementation details
3. Review [research.md](./research.md) for technology decisions
4. Review [data-model.md](./data-model.md) for data structures
5. Review [contracts/api-contracts.md](./contracts/api-contracts.md) for API specifications
6. Proceed to `/speckit.tasks` to generate implementation tasks

## Resources

- [UV Documentation](https://github.com/astral-sh/uv)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [pytest Documentation](https://docs.pytest.org/)
- [Fly.io Documentation](https://fly.io/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
