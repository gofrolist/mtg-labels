.DEFAULT_GOAL := help

.PHONY: help install dev test check clean

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	@$(MAKE) -C backend install
	@$(MAKE) -C frontend install

dev: ## Start backend and frontend dev servers
	@$(MAKE) -C backend dev &
	@$(MAKE) -C frontend dev

test: ## Run all tests
	@$(MAKE) -C backend test
	@$(MAKE) -C frontend test

check: ## Lint + typecheck backend and frontend
	@$(MAKE) -C backend check
	@$(MAKE) -C frontend check

clean: ## Clean temporary files
	@$(MAKE) -C backend clean
	@$(MAKE) -C frontend clean
