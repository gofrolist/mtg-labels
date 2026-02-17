.DEFAULT_GOAL := help

.PHONY: help install dev test check run clean pre-commit openapi-export

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	uv sync

dev: ## Start dev server with hot reload
	uv run uvicorn main:app --host 0.0.0.0 --port 8080 --reload

test: ## Run all tests
	uv run pytest

check: ## Lint + format + typecheck
	uv run ruff check
	uv run ruff format .
	uv run pyright

run: ## Run the app
	uv run python main.py

clean: ## Clean temporary files
	find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache .ruff_cache htmlcov coverage.xml

pre-commit: ## Run pre-commit hooks
	uv run pre-commit run --all-files

openapi-export: ## Export OpenAPI spec to frontend/openapi.json
	uv run python -c "import json, sys, io; _o = sys.stdout; sys.stdout = io.StringIO(); from main import app; spec = app.openapi(); sys.stdout = _o; print(json.dumps(spec, indent=2))" > ../frontend/openapi.json
