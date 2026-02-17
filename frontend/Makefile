.DEFAULT_GOAL := help

.PHONY: help install dev test lint check clean

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	bun install

dev: ## Start Vite dev server
	bun run dev

test: ## Run tests
	bun run test

lint: ## Run ESLint
	bun run lint

check: lint ## Lint + type-check
	bun run build

clean: ## Clean build artifacts
	rm -rf dist node_modules/.vite
