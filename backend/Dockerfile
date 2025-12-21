# Dockerfile for MTG Label Generator
# Uses UV for fast dependency management
# Multi-stage build to minimize final image size

# ============================================================================
# Build stage: Install dependencies and build packages
# ============================================================================
FROM python:3.13-alpine AS builder

# Install UV
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install build dependencies for pycairo and other C extensions
RUN apk add --no-cache \
    gcc \
    g++ \
    musl-dev \
    pkgconfig \
    cairo-dev

# Set working directory
WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies (without the project itself)
RUN uv sync --frozen --no-dev --no-install-project

# Copy application code
COPY . .

# Install the project
RUN uv sync --frozen --no-dev

# ============================================================================
# Runtime stage: Minimal image with only runtime dependencies
# ============================================================================
FROM python:3.13-alpine

# Install only runtime dependencies for cairo (not dev headers)
RUN apk add --no-cache \
    cairo \
    && addgroup -g 1000 -S appgroup \
    && adduser -u 1000 -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder --chown=appuser:appgroup /app/.venv /app/.venv

# Copy application code
COPY --chown=appuser:appgroup . .

# Create a non-root user and switch to it
USER appuser

# Expose port
EXPOSE 8080

# Add healthcheck (using Python from venv)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /app/.venv/bin/python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/')" || exit 1

# Run application using Python from virtual environment
CMD ["/app/.venv/bin/uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
