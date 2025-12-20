# Implementation Plan: Project Optimization & Modernization

**Branch**: `001-optimize-project` | **Date**: 2025-11-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-optimize-project/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Optimize the MTG Label Generator web application using Python best practices, migrate from Poetry to UV package manager, implement comprehensive test coverage with TDD approach, optimize CPU/memory usage, add intelligent caching, and set up automated deployment via GitHub Actions to Fly.io. The optimization maintains all existing functionality while improving performance, reliability, and developer experience.

## Technical Context

**Language/Version**: Python 3.13+ (upgrade from 3.8+)
**Primary Dependencies**: FastAPI, ReportLab, requests, svglib, Jinja2, uvicorn
**Storage**: File-based (static/images for SVG symbols), in-memory caching (to be enhanced)
**Testing**: pytest, pytest-cov, pytest-asyncio, httpx (for async testing), pytest-mock
**Target Platform**: Linux server (Fly.io), Python 3.13+
**Project Type**: Web application (single FastAPI backend)
**Performance Goals**:
- PDF generation <10s for 30 sets
- Support 10+ concurrent requests
- Cache hit rate >60%
- Memory usage stable (no leaks)
- CPU usage <80% during PDF generation
**Constraints**:
- Must maintain backward compatibility with existing functionality
- Must preserve PDF output quality and formatting
- Must handle Scryfall API rate limits gracefully
- Memory-efficient PDF generation (streaming where possible)
**Scale/Scope**:
- Single web application
- ~300+ MTG sets to process
- File-based symbol cache (~293 SVG files currently)
- Stateless application (suitable for horizontal scaling)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Validation

✅ **External API Reliability**: Current implementation has basic error handling. Optimization will enhance with proper timeouts, retries, and graceful degradation. Caching aligns with constitution requirement.

✅ **PDF Output Quality**: All optimizations will maintain existing PDF quality standards. Tests will verify output correctness.

✅ **User Experience Consistency**: No changes to user-facing functionality. Performance improvements enhance UX.

✅ **Code Quality Standards**: Migration to UV and test coverage directly supports PEP 8 compliance, type hints, and modular organization.

✅ **Data Integrity**: Caching will include validation and refresh mechanisms. Tests will verify data accuracy.

### Post-Design Validation

✅ **External API Reliability**: Design includes proper error handling, timeouts, retries, and graceful degradation. Cache strategy reduces API load. Contract tests ensure API compatibility.

✅ **PDF Output Quality**: Design maintains existing PDF generation logic with optimizations. Tests will verify output correctness and formatting. No changes to PDF output format.

✅ **User Experience Consistency**: API contracts maintain backward compatibility. No breaking changes to user-facing endpoints. Performance improvements enhance UX without changing functionality.

✅ **Code Quality Standards**: Modular structure supports PEP 8 compliance. Type hints will be added throughout. Clear separation of concerns (api/, services/, models/, cache/). Logging integrated into design.

✅ **Data Integrity**: Cache design includes validation and refresh mechanisms. Data models include validation rules. Tests will verify data accuracy and cache behavior.

**All constitutional principles validated and satisfied.**

## Project Structure

### Documentation (this feature)

```text
specs/001-optimize-project/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── api/
│   ├── __init__.py
│   ├── routes.py           # FastAPI route handlers
│   └── dependencies.py     # Dependency injection
├── services/
│   ├── __init__.py
│   ├── scryfall_client.py  # Scryfall API client with caching
│   └── pdf_generator.py    # PDF generation service
├── models/
│   ├── __init__.py
│   └── set_data.py         # Data models for MTG sets
├── cache/
│   ├── __init__.py
│   └── cache_manager.py    # Cache abstraction layer
└── config.py               # Configuration management

tests/
├── __init__.py
├── conftest.py             # pytest fixtures and configuration
├── unit/
│   ├── test_scryfall_client.py
│   ├── test_pdf_generator.py
│   ├── test_cache_manager.py
│   └── test_models.py
├── integration/
│   ├── test_api_endpoints.py
│   └── test_pdf_generation.py
└── contract/
    └── test_scryfall_api.py  # Contract tests for Scryfall API

.github/
└── workflows/
    └── deploy.yml            # GitHub Actions deployment workflow

fly.toml                      # Fly.io configuration
pyproject.toml               # UV-compatible project configuration
uv.lock                      # UV lock file
README.md                    # Updated documentation
```

**Structure Decision**: Single project structure with modular organization. Separated concerns into `api/`, `services/`, `models/`, and `cache/` modules. Tests organized by type (unit, integration, contract). This structure supports testability, maintainability, and follows Python best practices while keeping the codebase organized.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. All optimizations align with constitutional principles.
