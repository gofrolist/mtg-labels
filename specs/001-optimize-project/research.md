# Research: Project Optimization & Modernization

**Date**: 2025-11-25
**Feature**: Project Optimization & Modernization
**Phase**: Phase 0 - Research

## Technology Choices & Best Practices

### 1. UV Package Manager Migration

**Decision**: Migrate from Poetry to UV for package management.

**Rationale**:
- UV provides 10-100x faster dependency resolution compared to Poetry
- Written in Rust, offering superior performance
- Compatible with existing `pyproject.toml` format (PEP 621)
- Better integration with modern Python tooling
- Supports virtual environment management
- Lock file format is faster to parse and more reliable

**Alternatives Considered**:
- **Poetry**: Current tool, slower dependency resolution, more complex
- **pip + pip-tools**: Lower-level, requires more manual management
- **pipenv**: Slower, less actively maintained

**Migration Strategy**:
- Convert `pyproject.toml` from Poetry format to PEP 621 standard
- Use `uv pip compile` to generate `requirements.txt` or maintain `pyproject.toml` with UV
- Replace `poetry.lock` with `uv.lock`
- Update CI/CD and local development workflows

**References**:
- UV documentation: https://github.com/astral-sh/uv
- PEP 621: Python project metadata standard

### 2. Caching Strategy

**Decision**: Implement multi-layer caching strategy:
1. **In-memory cache** (functools.lru_cache or cachetools) for set data
2. **File-based cache** for SVG symbols (already exists, enhance with TTL)
3. **HTTP response cache** for Scryfall API responses

**Rationale**:
- In-memory cache provides fastest access for frequently used data
- File-based cache persists across restarts for symbols
- HTTP caching reduces external API calls and improves response times
- Multi-layer approach balances performance and persistence

**Alternatives Considered**:
- **Redis**: Overkill for single-instance deployment, adds complexity
- **SQLite**: Unnecessary overhead for simple key-value caching
- **Pure file cache**: Slower than in-memory for hot data

**Implementation Details**:
- Use `cachetools.TTLCache` for time-based expiration (1 hour for set data)
- File cache with modification time checks for symbols
- Cache invalidation on API errors or stale data detection
- Cache size limits to prevent memory exhaustion

**References**:
- cachetools library: https://github.com/tkem/cachetools
- FastAPI caching patterns: https://fastapi.tiangolo.com/advanced/caching/

### 3. Performance Optimization for PDF Generation

**Decision**: Optimize PDF generation through:
1. **Lazy loading** of SVG symbols
2. **Streaming PDF generation** where possible
3. **Resource pooling** for ReportLab canvas objects
4. **Memory-efficient image handling**

**Rationale**:
- Lazy loading reduces initial memory footprint
- Streaming prevents loading entire PDF into memory
- Resource pooling reduces object creation overhead
- Efficient image handling prevents memory bloat

**Alternatives Considered**:
- **Pre-rendering**: Not feasible due to dynamic set selection
- **Background job queue**: Adds complexity, not needed for current scale
- **CDN for symbols**: Overkill, file cache sufficient

**Optimization Techniques**:
- Use `io.BytesIO` efficiently (already in use, optimize buffer management)
- Cache parsed SVG drawings to avoid re-parsing
- Batch symbol downloads with connection pooling
- Use ReportLab's built-in optimizations (compression, object reuse)

**References**:
- ReportLab optimization guide: https://www.reportlab.com/docs/reportlab-userguide.pdf
- Python memory profiling: memory_profiler, py-spy

### 4. Test Structure & TDD Practices

**Decision**: Implement comprehensive test suite with:
1. **Unit tests** for individual components (80%+ coverage target)
2. **Integration tests** for API endpoints and PDF generation
3. **Contract tests** for Scryfall API interactions
4. **Performance tests** for optimization validation

**Rationale**:
- Unit tests ensure individual components work correctly
- Integration tests verify end-to-end functionality
- Contract tests protect against external API changes
- Performance tests validate optimization goals

**Test Framework Choices**:
- **pytest**: Industry standard, excellent fixtures and plugins
- **pytest-cov**: Code coverage reporting
- **pytest-asyncio**: Async test support for FastAPI
- **httpx**: Async HTTP client for testing FastAPI endpoints
- **pytest-mock**: Mocking external dependencies

**TDD Approach**:
- Write tests before implementing new features
- Use fixtures for common test data (mock Scryfall responses)
- Mock external API calls in unit tests
- Use real API calls sparingly in integration tests (with rate limiting)

**Test Organization**:
```
tests/
├── unit/          # Fast, isolated component tests
├── integration/   # End-to-end API and PDF tests
└── contract/      # External API contract tests
```

**References**:
- pytest best practices: https://docs.pytest.org/
- FastAPI testing guide: https://fastapi.tiangolo.com/tutorial/testing/

### 5. GitHub Actions + Fly.io Deployment

**Decision**: Automated deployment pipeline:
1. **GitHub Actions** for CI/CD
2. **Fly.io** for hosting
3. **Automated testing** before deployment
4. **Zero-downtime deployment** strategy

**Rationale**:
- GitHub Actions integrates seamlessly with GitHub repositories
- Fly.io provides simple deployment, good performance, reasonable pricing
- Automated testing prevents broken deployments
- Zero-downtime ensures user experience

**Deployment Strategy**:
- Trigger on push to `main` branch
- Run test suite before deployment
- Build Docker image (or use Fly.io buildpacks)
- Deploy to Fly.io with health checks
- Rollback on deployment failure

**Alternatives Considered**:
- **Heroku**: More expensive, less modern
- **AWS/GCP**: More complex setup, overkill for current scale
- **Railway**: Similar to Fly.io, Fly.io chosen for simplicity

**Configuration Requirements**:
- GitHub Secrets for Fly.io API token
- Environment variables for application config
- Health check endpoint for deployment validation
- Build caching for faster CI/CD runs

**References**:
- Fly.io deployment guide: https://fly.io/docs/getting-started/
- GitHub Actions: https://docs.github.com/en/actions

### 6. Code Organization & Python Best Practices

**Decision**: Refactor to modular structure:
1. **Separation of concerns**: API routes, services, models, cache
2. **Type hints**: Full type coverage for better IDE support
3. **Configuration management**: Centralized config with environment variable support
4. **Error handling**: Consistent error handling patterns

**Rationale**:
- Modular structure improves testability and maintainability
- Type hints catch errors early and improve developer experience
- Centralized config simplifies deployment and testing
- Consistent error handling improves reliability

**Structure Principles**:
- Single Responsibility Principle for each module
- Dependency Injection for testability
- Interface abstractions for external dependencies
- Clear module boundaries and interfaces

**References**:
- PEP 8: Python style guide
- PEP 484: Type hints
- Clean Architecture principles

## Summary

All technology choices align with project goals:
- **UV**: Faster dependency management
- **Multi-layer caching**: Improved performance
- **PDF optimizations**: Better resource usage
- **Comprehensive testing**: Reliability and confidence
- **Automated deployment**: Operational efficiency
- **Modular code**: Maintainability and testability

No blocking issues identified. Ready to proceed to Phase 1 design.
