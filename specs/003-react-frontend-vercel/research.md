# Research: React Frontend Rewrite & Vercel Deployment

**Date**: 2025-01-27
**Feature**: React Frontend Rewrite & Vercel Deployment
**Phase**: Phase 0 - Research

## Research Questions

### 1. React Framework Selection

**Question**: Which React framework/build tool should be used?

**Options Considered**:
- **Create React App (CRA)**: Traditional, well-established, but slower builds
- **Vite**: Fast builds, excellent DX, modern tooling
- **Next.js**: Full-stack framework, might be overkill for SPA
- **Remix**: Modern framework, but adds complexity

**Decision**: **Vite**
- Fast development server and builds
- Excellent TypeScript support
- Modern tooling (ESM, HMR)
- Simple configuration
- Good for SPAs without SSR needs

**Rationale**: Vite provides the best balance of performance, developer experience, and simplicity for a single-page application that doesn't need server-side rendering.

### 2. State Management

**Question**: How should application state be managed?

**Options Considered**:
- **React Context + useState/useReducer**: Built-in, simple
- **Zustand**: Lightweight, simple API
- **Redux**: Powerful but potentially overkill
- **Jotai/Recoil**: Atomic state management

**Decision**: **React Context + useState/useReducer**
- Sufficient for application scope
- No additional dependencies
- Simple to understand and maintain
- Good for theme, selections, and view mode state

**Rationale**: The application state is relatively simple (selections, theme, view mode). React's built-in state management is sufficient without adding complexity.

### 3. Styling Approach

**Question**: How should components be styled?

**Options Considered**:
- **Tailwind CSS**: Utility-first, fast development
- **CSS Modules**: Scoped styles, traditional
- **styled-components**: CSS-in-JS, component-scoped
- **Plain CSS**: Simple but less maintainable

**Decision**: **Tailwind CSS**
- Fast development with utility classes
- Excellent responsive design support
- Dark mode support built-in
- Small production bundle size (with purging)
- Consistent with modern React practices

**Rationale**: Tailwind CSS provides rapid development, excellent responsive design capabilities, and built-in dark mode support which aligns with the theme requirement.

### 4. API Client Library

**Question**: Which library should be used for API calls?

**Options Considered**:
- **Fetch API**: Native, no dependencies
- **Axios**: Popular, feature-rich
- **SWR**: Data fetching with caching
- **React Query**: Advanced data fetching

**Decision**: **Fetch API with custom wrapper**
- No additional dependencies
- Native browser support
- Sufficient for application needs
- Can add React Query later if needed

**Rationale**: The API calls are straightforward (GET sets, POST PDF generation). Fetch API is sufficient and keeps bundle size small.

### 5. Testing Framework

**Question**: Which testing framework should be used?

**Options Considered**:
- **Jest + React Testing Library**: Industry standard
- **Vitest**: Fast, Vite-native
- **Playwright**: E2E testing

**Decision**: **Vitest + React Testing Library**
- Fast execution (Vite-native)
- Compatible with React Testing Library
- Good TypeScript support
- Can add Playwright for E2E later

**Rationale**: Vitest provides fast test execution and integrates well with Vite. React Testing Library ensures component testing follows best practices.

### 6. TypeScript vs JavaScript

**Question**: Should the project use TypeScript?

**Options Considered**:
- **TypeScript**: Type safety, better IDE support
- **JavaScript**: Simpler, faster initial setup

**Decision**: **TypeScript**
- Type safety catches errors early
- Better IDE autocomplete and refactoring
- Self-documenting code
- Industry standard for React projects

**Rationale**: TypeScript provides significant benefits for maintainability and developer experience with minimal overhead.

### 7. CORS Configuration

**Question**: How should CORS be handled for cross-origin requests?

**Options Considered**:
- **Backend CORS middleware**: Configure FastAPI CORS
- **Vercel proxy**: Proxy requests through Vercel
- **Backend environment variable**: Allow specific origins

**Decision**: **Backend CORS middleware with environment variable**
- FastAPI has built-in CORS support
- Environment variable for allowed origins
- Secure and flexible
- Standard approach

**Rationale**: FastAPI's built-in CORS middleware is the standard solution. Using environment variables allows different origins for development and production.

### 8. Deployment Strategy

**Question**: How should Vercel deployment be configured?

**Options Considered**:
- **Vercel CLI**: Manual deployment
- **GitHub Actions**: Automated CI/CD
- **Vercel Git Integration**: Direct GitHub integration

**Decision**: **GitHub Actions + Vercel CLI**
- Full control over deployment process
- Can run tests before deployment
- Consistent with existing CI/CD patterns
- Can add deployment notifications

**Rationale**: GitHub Actions provides full control and allows running tests before deployment, ensuring quality gates are met.

## Technical Decisions Summary

| Decision Area | Choice | Rationale |
|---------------|--------|-----------|
| Build Tool | Vite | Fast builds, excellent DX |
| State Management | React Context + hooks | Sufficient for scope, no extra deps |
| Styling | Tailwind CSS | Fast development, dark mode support |
| API Client | Fetch API | Native, no dependencies |
| Testing | Vitest + React Testing Library | Fast, Vite-native, best practices |
| Language | TypeScript | Type safety, better DX |
| CORS | FastAPI CORS middleware | Standard, secure, flexible |
| Deployment | GitHub Actions + Vercel CLI | Full control, quality gates |

## Open Questions / Risks

### Risks

1. **CORS Configuration**: Need to ensure backend CORS is properly configured for Vercel domain
   - **Mitigation**: Test CORS early, use environment variables for allowed origins

2. **API Endpoint Changes**: Backend needs new endpoint for card types (currently only in HTML route)
   - **Mitigation**: Add `/api/card-types` endpoint during backend refactoring

3. **PDF Download Handling**: Need to handle binary PDF response correctly
   - **Mitigation**: Use fetch with blob response type, test thoroughly

4. **State Persistence**: localStorage might be disabled or full
   - **Mitigation**: Gracefully degrade, handle errors, provide user feedback

5. **Backend Route Removal**: Removing GET "/" route might break existing bookmarks
   - **Mitigation**: Add redirect or 404 handler, document migration

### Dependencies

- Backend must expose `/api/card-types` endpoint (currently only available in HTML route)
- Backend CORS must be configured to allow Vercel domain
- Backend must remove frontend dependencies from Dockerfile
- Environment variable for backend API URL in frontend

## Next Steps

1. Create API contracts document defining all endpoints
2. Design data models for frontend state
3. Create quickstart guide for development setup
4. Begin implementation planning
