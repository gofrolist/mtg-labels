.DEFAULT_GOAL := help

.PHONY: help install dev test lint check clean

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

dev: ## Start Vite dev server
	npm run dev

test: ## Run tests
	npm test

lint: ## Run ESLint
	npm run lint

check: lint ## Lint + type-check
	npm run build

clean: ## Clean build artifacts
	rm -rf dist node_modules/.vite
