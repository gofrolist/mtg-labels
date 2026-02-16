# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MTG Label Generator — a web app for generating printable Avery label sheets for Magic: The Gathering sets. Monorepo with a Python/FastAPI backend and a React/TypeScript frontend.

## Subdirectory Docs

- `backend/CLAUDE.md` — backend commands, architecture, code style, testing, domain details
- `frontend/CLAUDE.md` — frontend commands, architecture, code style, testing

## Architecture

**Backend** (`backend/`) — FastAPI, ReportLab PDF generation, Scryfall API data source. See `backend/CLAUDE.md`.

**Frontend** (`frontend/`) — React 19 + Vite + TypeScript + Tailwind CSS 4. See `frontend/CLAUDE.md`.

**Deployment** — Backend on Fly.io (Docker), frontend on Vercel. CI/CD via GitHub Actions (CI → Build → Deploy).

## Repo-wide

- Pre-commit hooks: ruff lint, ruff format, pyright, end-of-file-fixer, trailing-whitespace, check-merge-conflict
- Python 3.13+, Node 22
