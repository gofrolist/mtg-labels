# Implementation Plan: React Frontend Rewrite & Vercel Deployment

**Branch**: `003-react-frontend-vercel` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-react-frontend-vercel/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Rewrite the MTG Label Generator frontend from HTML/Bootstrap to React, deploy it separately to Vercel, and ensure complete backend independence. The React frontend will communicate with the backend API via HTTP requests, maintaining all existing functionality while providing a modern, maintainable codebase. The backend will be refactored to remove all frontend dependencies (templates, static files) and serve only JSON API endpoints.

## Technical Context

**Language/Version**:
- Frontend: JavaScript/TypeScript, React 18+, Node.js 18+ (LTS)
- Backend: Python 3.13+ (existing)

**Primary Dependencies**:
- Frontend: React, React Router (if needed), Fetch API for API calls, Tailwind CSS for styling
- Backend: FastAPI (existing), no changes to core dependencies

**Storage**:
- Frontend: Browser localStorage for theme preference and selected sets
- Backend: No changes (existing file-based cache for SVG symbols)

**Testing**:
- Frontend: Vitest, React Testing Library
- Backend: Existing pytest suite (no changes needed)

**Target Platform**:
- Frontend: Vercel (serverless functions, edge network)
- Backend: Existing deployment (Fly.io or similar)

**Project Type**: Web application (separated frontend and backend)

**Performance Goals**:
- Frontend loads and displays sets within 2 seconds
- Search filters sets in real-time (under 50ms delay)
- Theme switching completes instantly (under 100ms)
- PDF generation request completes within 15 seconds for typical workloads
- Application works on mobile devices (320px+ screen width)

**Constraints**:
- Must maintain all existing functionality from HTML/Bootstrap frontend
- Backend must remain completely independent (no frontend files in Dockerfile)
- Frontend must work with existing backend API endpoints
- Must support CORS for cross-origin requests (frontend on Vercel, backend elsewhere)
- Must handle API errors gracefully
- Must preserve user experience (theme, selections) across page reloads

**Scale/Scope**:
- Single-page React application
- ~300+ MTG sets to display and filter
- Support for desktop, tablet, and mobile devices
- Light and dark theme support
- Automated deployment to Vercel via CI/CD

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Validation

✅ **Test-First Development**: React frontend will include comprehensive test coverage using Jest/React Testing Library. All components and user flows will be tested. Backend changes (removing HTML routes) will be covered by existing tests.

✅ **Performance Optimization**: React application will be optimized for fast initial load, efficient rendering, and responsive interactions. Code splitting and lazy loading will be used where appropriate. Performance targets align with constitution requirements.

✅ **Intelligent Caching**: Frontend will use browser localStorage for user preferences and selections. Backend caching remains unchanged. API responses can be cached at CDN level (Vercel edge network).

✅ **Modern Tooling**: React frontend will use modern build tools (Vite or Create React App), npm/yarn/pnpm for package management. Backend continues using UV as per constitution.

✅ **Code Quality Standards**: Frontend will use ESLint, Prettier, and TypeScript (optional but recommended) for code quality. All code will follow React best practices and maintainability standards.

✅ **Automated Deployment**: Frontend will have automated deployment to Vercel via GitHub Actions. Deployment will include testing and verification steps before going live.

### Post-Design Validation

*To be completed after Phase 1 design phase*

## Project Structure

### Documentation (this feature)

```text
specs/003-react-frontend-vercel/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api-contracts.md # API contract definitions
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── routes.py          # API endpoints (remove HTML route)
│   │   └── dependencies.py    # Existing dependencies
│   ├── services/               # Existing services
│   ├── models/                 # Existing models
│   └── config.py               # Existing config
├── Dockerfile                   # Remove frontend directory copying
└── tests/                      # Existing tests

frontend/
├── src/
│   ├── components/             # React components
│   │   ├── SetList/
│   │   ├── SetItem/
│   │   ├── SearchBar/
│   │   ├── TemplateSelector/
│   │   ├── SelectionCounter/
│   │   ├── ThemeToggle/
│   │   └── PDFGenerator/
│   ├── pages/                  # Page components (if using routing)
│   │   └── Home.tsx            # Main page
│   ├── services/               # API service layer
│   │   └── api.ts              # Backend API client
│   ├── hooks/                   # Custom React hooks
│   │   ├── useSets.ts
│   │   ├── useSelection.ts
│   │   └── useTheme.ts
│   ├── utils/                  # Utility functions
│   │   ├── localStorage.ts
│   │   └── grouping.ts
│   ├── types/                   # TypeScript types (if using TS)
│   │   └── index.ts
│   ├── App.tsx                  # Root component
│   └── main.tsx                 # Entry point
├── public/                     # Static assets
│   ├── favicon.ico
│   └── favicon.svg
├── package.json                 # Dependencies
├── vite.config.ts              # Vite config (or similar)
├── tsconfig.json                # TypeScript config (if using TS)
├── .eslintrc.js                 # ESLint config
├── .prettierrc                  # Prettier config
└── vercel.json                  # Vercel deployment config

.github/workflows/
└── frontend-deploy.yml          # Update for React build
```

**Structure Decision**: Web application with separated frontend and backend. Frontend is a React single-page application deployed to Vercel. Backend remains a FastAPI application serving only JSON API endpoints. Complete decoupling ensures independent deployment and scaling.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | No violations | All requirements align with constitution principles |
