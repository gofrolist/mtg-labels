---
description: "Task list for Project Optimization & Modernization feature implementation"
---

# Tasks: Project Optimization & Modernization

**Input**: Design documents from `/specs/001-optimize-project/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED - TDD approach specified in FR-002. All tests must be written before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths follow plan.md structure: `src/api/`, `src/services/`, `src/models/`, `src/cache/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure per implementation plan (src/api/, src/services/, src/models/, src/cache/, tests/unit/, tests/integration/, tests/contract/)
- [x] T002 [P] Migrate pyproject.toml from Poetry to UV format (PEP 621 standard)
- [x] T003 [P] Create uv.lock file by running `uv lock`
- [x] T004 [P] Update .gitignore to include .venv/, uv.lock, __pycache__/, *.pyc
- [x] T005 [P] Create pytest configuration in pyproject.toml (test paths, coverage settings)
- [x] T006 [P] Create conftest.py in tests/ with common fixtures and test configuration

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create src/config.py with centralized configuration management (environment variables, settings)
- [x] T008 Create src/models/__init__.py and src/models/set_data.py with MTGSet model (from data-model.md)
- [x] T009 [P] Create src/api/__init__.py and src/api/dependencies.py for dependency injection
- [x] T010 [P] Create src/api/routes.py with FastAPI app setup and route structure
- [x] T011 [P] Setup logging infrastructure in src/config.py (structured logging, log levels)
- [x] T012 [P] Create error handling middleware in src/api/dependencies.py (HTTPException handlers, error responses)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Comprehensive Test Coverage (Priority: P1) 🎯 MVP

**Goal**: Implement comprehensive test coverage for all existing functionality using TDD approach. All critical paths (set fetching, filtering, grouping, PDF generation) have test coverage with at least 80% code coverage for core modules.

**Independent Test**: Run test suite and verify all critical paths have test coverage. All tests pass and provide clear feedback on what functionality is verified.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [P] [US1] Create unit test for ScryfallClient.fetch_sets() in tests/unit/test_scryfall_client.py
- [x] T014 [P] [US1] Create unit test for ScryfallClient.filter_sets() in tests/unit/test_scryfall_client.py
- [x] T015 [P] [US1] Create unit test for ScryfallClient.group_sets() in tests/unit/test_scryfall_client.py
- [x] T016 [P] [US1] Create unit test for PDFGenerator.generate() in tests/unit/test_pdf_generator.py
- [x] T017 [P] [US1] Create unit test for abbreviate_set_name() helper function in tests/unit/test_helpers.py
- [x] T018 [P] [US1] Create unit test for fit_text_to_width() helper function in tests/unit/test_helpers.py
- [x] T019 [P] [US1] Create unit test for get_symbol_file() helper function in tests/unit/test_helpers.py
- [x] T020 [P] [US1] Create unit test for get_svg_intrinsic_dimensions() helper function in tests/unit/test_helpers.py
- [x] T021 [P] [US1] Create integration test for GET / endpoint in tests/integration/test_api_endpoints.py
- [x] T022 [P] [US1] Create integration test for GET /api/sets endpoint in tests/integration/test_api_endpoints.py
- [x] T023 [P] [US1] Create integration test for POST /generate-pdf endpoint in tests/integration/test_pdf_generation.py
- [x] T024 [P] [US1] Create contract test for Scryfall API interaction in tests/contract/test_scryfall_api.py
- [x] T025 [P] [US1] Create unit test for error handling scenarios (API failures, network errors) in tests/unit/test_error_handling.py
- [x] T026 [P] [US1] Create unit test for PDF output quality validation in tests/unit/test_pdf_quality.py

### Implementation for User Story 1

- [x] T027 [US1] Refactor ScryfallClient from main.py to src/services/scryfall_client.py with improved error handling
- [x] T028 [US1] Refactor PDFGenerator from main.py to src/services/pdf_generator.py with type hints
- [x] T029 [US1] Refactor helper functions from main.py to src/services/helpers.py with type hints
- [x] T030 [US1] Refactor API routes from main.py to src/api/routes.py with proper request validation
- [x] T031 [US1] Update main.py to import from new module structure and maintain backward compatibility
- [x] T032 [US1] Add type hints to all functions and classes (FR-012)
- [x] T033 [US1] Ensure all tests pass and achieve 80%+ code coverage for core modules (SC-001)
- [x] T034 [US1] Add pytest-cov configuration and generate coverage report

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. All existing functionality has test coverage.

---

## Phase 4: User Story 2 - Performance Optimization (Priority: P2)

**Goal**: Optimize PDF generation for CPU and memory usage. PDF generation completes in under 10 seconds for 30 sets, memory usage remains stable during concurrent requests, and CPU usage stays below 80%.

**Independent Test**: Measure PDF generation time, memory usage, and CPU utilization under various loads. Verify faster response times and lower resource consumption.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T035 [P] [US2] Create performance test for PDF generation time (<10s for 30 sets) in tests/integration/test_performance.py
- [x] T036 [P] [US2] Create performance test for memory usage stability in tests/integration/test_performance.py
- [x] T037 [P] [US2] Create performance test for CPU usage (<80%) in tests/integration/test_performance.py
- [x] T038 [P] [US2] Create performance test for concurrent request handling (10+ requests) in tests/integration/test_performance.py
- [x] T039 [P] [US2] Create unit test for memory leak detection in tests/unit/test_memory_leaks.py

### Implementation for User Story 2

- [x] T040 [US2] Optimize PDFGenerator.generate() for memory efficiency (streaming, buffer management) in src/services/pdf_generator.py
- [x] T041 [US2] Implement lazy loading for SVG symbols in src/services/pdf_generator.py
- [x] T042 [US2] Optimize ReportLab canvas object reuse and resource pooling in src/services/pdf_generator.py
- [x] T043 [US2] Add memory-efficient image handling (streaming, compression) in src/services/pdf_generator.py
- [x] T044 [US2] Implement resource cleanup and memory release after PDF generation in src/services/pdf_generator.py (FR-011)
- [x] T045 [US2] Add performance monitoring and metrics collection in src/services/pdf_generator.py
- [x] T046 [US2] Optimize ScryfallClient for connection pooling and request efficiency in src/services/scryfall_client.py
- [x] T047 [US2] Verify performance targets met (SC-002, SC-003, SC-007, SC-009)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Performance optimizations are complete and verified.

---

## Phase 5: User Story 3 - Intelligent Caching (Priority: P3)

**Goal**: Implement multi-layer caching for set data and symbols. Cached requests respond at least 50% faster than uncached requests, and cache hit rate exceeds 60% for frequently accessed set data.

**Independent Test**: Measure response times for cached vs uncached requests and verify cache hit rates. Verify faster response times for repeated operations.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T048 [P] [US3] Create unit test for CacheManager in-memory cache in tests/unit/test_cache_manager.py
- [x] T049 [P] [US3] Create unit test for file-based symbol cache in tests/unit/test_cache_manager.py
- [x] T050 [P] [US3] Create unit test for cache expiration and invalidation in tests/unit/test_cache_manager.py
- [x] T051 [P] [US3] Create unit test for cache validation and refresh in tests/unit/test_cache_manager.py
- [x] T052 [P] [US3] Create integration test for cache hit rate measurement in tests/integration/test_cache_performance.py
- [x] T053 [P] [US3] Create integration test for cached vs uncached response time comparison in tests/integration/test_cache_performance.py

### Implementation for User Story 3

- [x] T054 [US3] Create src/cache/__init__.py and src/cache/cache_manager.py with cache abstraction layer
- [x] T055 [US3] Implement in-memory cache using cachetools.TTLCache for set data in src/cache/cache_manager.py
- [x] T056 [US3] Implement file-based cache for SVG symbols with validation in src/cache/cache_manager.py
- [x] T057 [US3] Integrate cache into ScryfallClient.fetch_sets() in src/services/scryfall_client.py (FR-004)
- [x] T058 [US3] Integrate cache into get_symbol_file() helper function in src/services/helpers.py
- [x] T059 [US3] Add cache hit rate monitoring and metrics in src/cache/cache_manager.py
- [x] T060 [US3] Implement cache invalidation on errors and stale data detection in src/cache/cache_manager.py (FR-010)
- [x] T061 [US3] Verify cache performance targets met (SC-004, SC-008)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. Caching is implemented and verified.

---

## Phase 6: User Story 4 - Modern Package Management (Priority: P4)

**Goal**: Migrate from Poetry to UV package manager. Dependency installation completes in under 30 seconds for new project setup, and builds are fast and reproducible.

**Independent Test**: Verify dependency installation speed, build reproducibility, and developer workflow efficiency. Verify faster development setup and more reliable builds.

### Tests for User Story 4 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T062 [P] [US4] Create test for UV dependency installation speed (<30s) in tests/integration/test_package_management.py
- [x] T063 [P] [US4] Create test for build reproducibility across environments in tests/integration/test_package_management.py

### Implementation for User Story 4

- [x] T064 [US4] Convert pyproject.toml from Poetry format to PEP 621 standard format (FR-005)
- [x] T065 [US4] Generate uv.lock file by running `uv lock` and commit to repository
- [x] T066 [US4] Update README.md with UV installation and usage instructions
- [x] T067 [US4] Update quickstart.md with UV-specific setup steps
- [x] T068 [US4] Remove poetry.lock and Poetry-related files (.python-version if Poetry-specific)
- [x] T069 [US4] Verify dependency installation speed meets target (SC-005)

**Checkpoint**: At this point, User Stories 1-4 should all work independently. UV migration is complete and verified.

---

## Phase 7: User Story 5 - Automated Deployment (Priority: P5)

**Goal**: Set up automated deployment pipeline using GitHub Actions to Fly.io. Deployments complete successfully within 5 minutes of code merge, and failures trigger notifications with rollback capability.

**Independent Test**: Verify that code changes trigger deployments automatically and deployments complete successfully. Verify reliable, automated release process.

### Tests for User Story 5 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T070 [P] [US5] Create test for deployment pipeline configuration validation in tests/integration/test_deployment.py
- [x] T071 [P] [US5] Create test for deployment time measurement (<5 minutes) in tests/integration/test_deployment.py

### Implementation for User Story 5

- [x] T072 [US5] Create .github/workflows/deploy.yml with GitHub Actions workflow (FR-006)
- [x] T073 [US5] Configure workflow to trigger on push to main branch in .github/workflows/deploy.yml
- [x] T074 [US5] Add test execution step before deployment in .github/workflows/deploy.yml
- [x] T075 [US5] Add code quality checks (linting, type checking) in .github/workflows/deploy.yml
- [x] T076 [US5] Configure Fly.io deployment step with authentication in .github/workflows/deploy.yml
- [x] T077 [US5] Create fly.toml configuration file for Fly.io deployment
- [x] T078 [US5] Add deployment health checks and verification in .github/workflows/deploy.yml
- [x] T079 [US5] Configure deployment failure notifications (email, Slack, etc.) in .github/workflows/deploy.yml
- [x] T080 [US5] Add rollback capability on deployment failure in .github/workflows/deploy.yml
- [x] T081 [US5] Configure GitHub Secrets for Fly.io API token
- [x] T082 [US5] Verify deployment completes within target time (SC-006)

**Checkpoint**: At this point, all user stories should be independently functional. Automated deployment is complete and verified.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T083 [P] Update README.md with project structure, setup instructions, and usage guide
- [x] T084 [P] Add docstrings to all public functions and classes following Google style
- [x] T085 [P] Run ruff check and fix all linting issues in all Python files
- [x] T086 [P] Run pyright type checking and fix all type errors
- [x] T087 [P] Ensure all code follows PEP 8 style guidelines (FR-012)
- [x] T088 [P] Add comprehensive logging throughout application (FR-008)
- [x] T089 [P] Verify all existing functionality continues to work correctly (FR-007, SC-010)
- [x] T090 [P] Run quickstart.md validation and update if needed
- [x] T091 [P] Create CHANGELOG.md documenting all optimizations and improvements
- [x] T092 [P] Update documentation with performance benchmarks and metrics

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed sequentially in priority order (P1 → P2 → P3 → P4 → P5)
  - Some stories can proceed in parallel after dependencies are met (e.g., US4 can run parallel with US2/US3)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May benefit from US1 test infrastructure but independent
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent, but benefits from US1 test infrastructure
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Independent, can run in parallel with US2/US3
- **User Story 5 (P5)**: Can start after Foundational (Phase 2) - Independent, but benefits from all previous stories being complete

### Within Each User Story

- Tests (REQUIRED) MUST be written and FAIL before implementation (TDD approach)
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- All tests for a user story marked [P] can run in parallel
- User Story 4 (UV migration) can run in parallel with User Stories 2-3
- Polish phase tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Create unit test for ScryfallClient.fetch_sets() in tests/unit/test_scryfall_client.py"
Task: "Create unit test for ScryfallClient.filter_sets() in tests/unit/test_scryfall_client.py"
Task: "Create unit test for ScryfallClient.group_sets() in tests/unit/test_scryfall_client.py"
Task: "Create unit test for PDFGenerator.generate() in tests/unit/test_pdf_generator.py"
Task: "Create unit test for abbreviate_set_name() helper function in tests/unit/test_helpers.py"
Task: "Create unit test for fit_text_to_width() helper function in tests/unit/test_helpers.py"
Task: "Create unit test for get_symbol_file() helper function in tests/unit/test_helpers.py"
Task: "Create unit test for get_svg_intrinsic_dimensions() helper function in tests/unit/test_helpers.py"
Task: "Create integration test for GET / endpoint in tests/integration/test_api_endpoints.py"
Task: "Create integration test for GET /api/sets endpoint in tests/integration/test_api_endpoints.py"
Task: "Create integration test for POST /generate-pdf endpoint in tests/integration/test_pdf_generation.py"
Task: "Create contract test for Scryfall API interaction in tests/contract/test_scryfall_api.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Test Coverage)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Test Coverage)
   - Developer B: User Story 2 (Performance) - after US1 tests are in place
   - Developer C: User Story 4 (UV Migration) - can start immediately
3. After US1-2 complete:
   - Developer A: User Story 3 (Caching)
   - Developer B: User Story 5 (Deployment)
   - Developer C: Polish & Documentation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All tests are REQUIRED - TDD approach specified in FR-002
- Maintain backward compatibility throughout (FR-007)
- Follow Python best practices: PEP 8, type hints, documentation (FR-012)
