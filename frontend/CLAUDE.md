# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the frontend.

## Overview

React 19 + Vite + TypeScript + Tailwind CSS 4 frontend for the MTG Label Generator. Deployed on Vercel.

## Architecture

Custom hooks pattern (`hooks/`) for data fetching and state. API layer in `services/api.ts`. Component-per-folder structure in `components/`.

## Commands

```bash
npm install                      # Install dependencies
npm run dev                      # Dev server (port 5173)
npm run build                    # Production build (tsc && vite build)
npm test                         # Run tests (Vitest, watch mode)
npm run lint                     # ESLint
npm run test:coverage            # Tests with coverage
```

## Environment

- Node 22 (`.nvmrc`)
- Copy `.env.example` to `.env` and set `VITE_API_BASE_URL=http://localhost:8080` for local dev

## Code Style

ESLint + Prettier. Single quotes, no semicolons, tab width 2, print width 100, trailing commas ES5, arrow parens avoid. Unused vars must start with `_`. Strict TypeScript (`tsconfig.json`).

## Testing

Vitest + React Testing Library + jsdom. Tests co-located in `src/__tests__/`. Setup in `src/test/setup.ts`.
