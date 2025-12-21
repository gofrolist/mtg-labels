<!--
Sync Impact Report:
Version change: N/A → 1.0.0 (initial constitution)
Modified principles: N/A (new constitution)
Added sections: Performance Standards, Development Workflow
Removed sections: N/A
Templates requiring updates:
  ✅ plan-template.md - Constitution Check section aligns with principles
  ✅ spec-template.md - User stories align with TDD principle
  ✅ tasks-template.md - Task organization aligns with TDD and testing principles
Follow-up TODOs: None
-->

# MTG Label Generator Constitution

## Core Principles

### I. Test-First Development (NON-NEGOTIABLE)

All functionality MUST be covered by automated tests. Test-Driven Development (TDD) is mandatory: tests are written first, approved by stakeholders, verified to fail, then implementation follows. The Red-Green-Refactor cycle is strictly enforced. All critical paths including set fetching, filtering, grouping, PDF generation, and error handling MUST have test coverage. Code coverage MUST meet or exceed 80% for core modules. Tests MUST be organized by type (unit, integration, contract, performance) and MUST run independently.

**Rationale**: Test coverage ensures reliability, enables safe refactoring, prevents regressions, and provides confidence that the application works as expected. TDD drives better design and catches bugs early.

### II. Performance Optimization

The application MUST be optimized for CPU and memory usage. PDF generation MUST complete within acceptable time limits (under 10 seconds for typical workloads of 30 sets or fewer). Memory usage MUST remain stable during concurrent operations with no memory leaks. CPU usage during PDF generation MUST remain below 80% on standard hosting resources. The system MUST handle at least 10 concurrent PDF generation requests without degradation. Resource usage MUST be predictable and within acceptable bounds during continuous operation.

**Rationale**: Performance directly impacts user experience and operational costs. Efficient resource usage enables better scalability and reduces hosting expenses while maintaining responsiveness.

### III. Intelligent Caching

Frequently accessed data (set lists, set symbols) MUST be cached to improve response times and reduce external API load. Cached requests MUST respond at least 50% faster than uncached requests for the same data. Cache hit rate MUST exceed 60% for frequently accessed set data. Cache MUST validate data freshness and refresh when stale or invalid. Cache MUST be shared efficiently across concurrent requests. Multi-layer caching (in-memory and file-based) MUST be implemented where appropriate.

**Rationale**: Caching reduces external API load, improves response times for repeated operations, reduces bandwidth costs, and enhances user experience for commonly requested sets.

### IV. Modern Tooling & Package Management

The project MUST use modern package management tools that provide fast dependency resolution and reliable builds. UV MUST be used as the package manager for Python dependencies. Dependency installation MUST complete in under 30 seconds for new project setup. Builds MUST be reproducible across different environments. The project MUST follow Python best practices including type hints, PEP 8 style guidelines, and proper code organization.

**Rationale**: Modern tooling improves developer experience, reduces setup time, enables faster development cycles, and ensures consistent builds across environments.

### V. Code Quality Standards

All code MUST pass linting checks using ruff and type checking using pyright before being merged. Code MUST follow PEP 8 style guidelines with line length of 100 characters. Type hints MUST be used throughout the codebase. Code MUST be properly documented with clear purpose and usage. All code changes MUST be reviewed for quality, maintainability, and adherence to project standards.

**Rationale**: Consistent code quality improves maintainability, reduces bugs, enables better IDE support, and makes the codebase easier to understand and modify.

### VI. Automated Deployment

Deployments MUST be automated via CI/CD pipeline. Code changes merged to the main branch MUST trigger automatic deployment to production. Deployments MUST complete successfully within 5 minutes of code merge. Deployment failures MUST trigger appropriate notifications and rollback procedures. The previous version MUST remain available if deployment fails. All deployments MUST include automated testing and verification steps.

**Rationale**: Automated deployment reduces manual errors, ensures consistency, enables rapid iteration, and provides faster access to improvements and bug fixes for users.

## Performance Standards

The application MUST meet the following measurable performance targets:

- **PDF Generation**: Complete in under 10 seconds for typical workloads (30 sets or fewer)
- **Concurrent Requests**: Handle at least 10 concurrent PDF generation requests without degradation
- **Cache Performance**: Cached requests respond at least 50% faster than uncached requests
- **Cache Hit Rate**: Exceed 60% for frequently accessed set data
- **Memory Usage**: Remain stable during concurrent operations with no memory leaks
- **CPU Usage**: Remain below 80% during PDF generation on standard hosting resources
- **Dependency Installation**: Complete in under 30 seconds for new project setup
- **Deployment Time**: Complete within 5 minutes of code merge

Performance tests MUST be included in the test suite to verify these targets are met. Performance regressions MUST be identified and addressed before deployment.

## Development Workflow

### Code Review Requirements

All code changes MUST be reviewed before merging. Reviews MUST verify:
- Test coverage for new functionality
- Adherence to code quality standards (linting, type checking)
- Performance impact assessment
- Constitution compliance

### Testing Gates

Before deployment, the following MUST pass:
- All unit tests
- All integration tests
- All contract tests (if applicable)
- Performance tests verifying targets are met
- Code coverage meets or exceeds 80% for core modules
- Linting checks (ruff check)
- Type checking (pyright)

### Deployment Process

1. Code changes are merged to main branch
2. CI/CD pipeline automatically:
   - Runs full test suite
   - Runs code quality checks (linting, type checking)
   - Builds application
   - Deploys to production
   - Verifies deployment health
3. On failure: Rollback to previous version and notify team

### Error Handling & Observability

The system MUST provide clear error messages and structured logging for debugging and monitoring. External API failures (e.g., Scryfall API) MUST be handled gracefully with appropriate timeouts, retries, and fallbacks. All errors MUST be logged with sufficient context for troubleshooting. Resource cleanup MUST be ensured after operations complete (e.g., PDF generation).

## Governance

This constitution supersedes all other practices and guidelines. All PRs and reviews MUST verify compliance with these principles. Any violations or proposed exceptions MUST be documented and justified in the Complexity Tracking section of implementation plans.

### Amendment Procedure

Amendments to this constitution require:
1. Documentation of the proposed change and rationale
2. Assessment of impact on existing features and templates
3. Update to version number following semantic versioning:
   - **MAJOR**: Backward incompatible governance/principle removals or redefinitions
   - **MINOR**: New principle/section added or materially expanded guidance
   - **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements
4. Propagation of changes to dependent templates and documentation
5. Update of Sync Impact Report in constitution file

### Compliance Review

All feature specifications and implementation plans MUST include a Constitution Check section that validates compliance with these principles. Any complexity or violations MUST be explicitly justified. Regular reviews SHOULD be conducted to ensure ongoing compliance.

**Version**: 1.0.0 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-01-27
