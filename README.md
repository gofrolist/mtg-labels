# MTG Label Generator

A Magic: The Gathering Printable Label Generator using FastAPI, ReportLab, and Bootstrap 5.

## Features

- Generate printable labels for MTG sets
- Filter and group sets by type
- Fast PDF generation with optimized performance
- Intelligent caching for improved response times
- Modern Python package management with UV

## Requirements

- Python 3.13+
- UV package manager

## Installation

### Install UV

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Or via pip
pip install uv
```

### Setup Project

```bash
# Clone the repository
git clone <repository-url>
cd mtg-label-generator

# Install dependencies
uv sync

# Activate virtual environment (created automatically by UV)
source .venv/bin/activate  # On macOS/Linux
# or
.venv\Scripts\activate  # On Windows
```

## Usage

### Running the Application

```bash
# Development server with auto-reload
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8080

# Or using UV's run command directly
uv run uvicorn main:app --reload
```

Access the application at: `http://localhost:8080`

### Running Tests

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=src --cov-report=html --cov-report=term-missing

# Run specific test file
uv run pytest tests/unit/test_scryfall_client.py -v

# Run tests by marker
uv run pytest -m unit
uv run pytest -m integration
uv run pytest -m performance
```

### Code Quality

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
│   ├── api/               # FastAPI routes and dependencies
│   ├── services/          # Business logic (ScryfallClient, PDFGenerator)
│   ├── models/            # Data models (MTGSet)
│   ├── cache/             # Caching logic (CacheManager)
│   └── config.py          # Configuration management
├── tests/                 # Test suite
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── contract/         # Contract tests
├── static/               # Static files (images, etc.)
├── templates/            # HTML templates
├── fonts/                # Font files
├── pyproject.toml        # Project configuration (PEP 621)
├── uv.lock              # Dependency lock file
└── README.md            # This file
```

## Development

### Adding Dependencies

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

### Environment Variables

Create a `.env` file for local development (not committed to git):

```bash
# Cache configuration
CACHE_TTL_SECONDS=3600
CACHE_MAX_SIZE=100

# Logging
LOG_LEVEL=INFO
DEBUG=false

# Scryfall API
SCRYFALL_API_BASE_URL=https://api.scryfall.com/sets
SCRYFALL_API_TIMEOUT=30
SCRYFALL_API_RETRY_ATTEMPTS=3

# Symbol cache
SYMBOL_CACHE_DIR=static/images
```

## Performance

The application is optimized for:
- PDF generation <10s for 30 sets (SC-002)
- Memory usage stability (SC-003)
- CPU usage <80% during PDF generation (SC-009)
- Support for 10+ concurrent requests (SC-007)
- Cache hit rate >60% for frequently accessed data (SC-008)
- Cached requests 50% faster than uncached (SC-004)

### Performance Verification

Run performance tests to verify targets:
```bash
# Run all performance tests
uv run pytest tests/integration/test_performance.py -v

# Run cache performance tests
uv run pytest tests/integration/test_cache_performance.py -v

# Run package management speed tests
uv run pytest tests/integration/test_package_management.py -v
```

## Caching

The application uses multi-layer caching:
- **In-memory cache**: TTL-based cache for set data (1 hour default)
- **File cache**: Persistent cache for SVG symbols
- **Cache monitoring**: Hit rate tracking and statistics

## API Endpoints

- `GET /` - Main page with set selection interface
- `GET /api/sets` - Get filtered sets (JSON)
- `POST /generate-pdf` - Generate PDF labels for selected sets

## Testing

The project follows Test-Driven Development (TDD) approach with comprehensive test coverage:
- Unit tests for all core functionality
- Integration tests for API endpoints
- Contract tests for external API interactions
- Performance tests for optimization validation

Run tests with:
```bash
uv run pytest
```

## Deployment

### Automated Deployment (GitHub Actions)

The project includes automated deployment to Fly.io via GitHub Actions. Deployments are triggered automatically on push to the `main` branch.

#### Setup GitHub Secrets

Configure the following secrets in your GitHub repository settings (`Settings` → `Secrets and variables` → `Actions`):

1. **FLY_API_TOKEN**: Fly.io API token
   - Get your token: `flyctl auth token`
   - Or create one at: https://fly.io/user/personal_access_tokens

2. **FLY_APP_NAME** (optional): Fly.io app name
   - Defaults to `mtg-label-generator` if not set
   - Set this if your Fly.io app has a different name

3. **SLACK_WEBHOOK_URL** (optional): Slack webhook for deployment notifications
   - Only needed if you want Slack notifications on deployment failures

#### Deployment Process

1. Push code to `main` branch
2. GitHub Actions automatically:
   - Runs tests
   - Runs code quality checks (linting, type checking)
   - Deploys to Fly.io if all checks pass
   - Verifies deployment health
   - Rolls back on failure

#### Manual Deployment

See [quickstart.md](specs/001-optimize-project/quickstart.md) for manual deployment instructions.

## Troubleshooting

### Build Issues

#### Package Structure Error
If you see `Error: Expected a Python module at: src/mtg_label_generator/__init__.py`:
- ✅ This has been fixed by creating the required package structure
- The package is now properly configured for `uv_build`

#### pycairo Build Failures
If `uv sync` fails while building `pycairo`:
- `pycairo` is a dependency of `cairosvg` (which may not be actively used)
- Install system dependencies:
  - **macOS**: `brew install cairo pkg-config`
  - **Linux (Debian/Ubuntu)**: `sudo apt-get install libcairo2-dev pkg-config`
  - **Linux (Fedora/RHEL)**: `sudo dnf install cairo-devel pkg-config`
- Alternatively, you can remove `cairosvg` from dependencies if not needed

### UV Installation Issues

```bash
# Update UV
uv self update

# Verify installation
which uv
uv --version
```

## License

MIT

## Contributing

1. Follow PEP 8 style guidelines
2. Write tests for all new functionality
3. Ensure all tests pass before submitting
4. Run code quality checks (`ruff check .` and `pyright`)

## Resources

- [UV Documentation](https://github.com/astral-sh/uv)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [ReportLab Documentation](https://www.reportlab.com/docs/reportlab-userguide.pdf)
- [Scryfall API Documentation](https://scryfall.com/docs/api)
