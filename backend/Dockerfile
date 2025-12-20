# Dockerfile for MTG Label Generator
# Uses UV for fast dependency management
# Multi-stage build to minimize final image size
#
# NOTE: This Dockerfile should be built from the project root directory:
#   docker build -f backend/Dockerfile .

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

# Set working directory for backend
WORKDIR /app/backend

# Copy dependency files
COPY backend/pyproject.toml backend/uv.lock ./

# Install dependencies (without the project itself)
RUN uv sync --frozen --no-dev --no-install-project

# Copy application code (backend)
COPY backend/ .

# Install the project
RUN uv sync --frozen --no-dev

# Copy frontend directory (needed for templates)
# This is copied to /app/frontend so ../frontend/ paths work from /app/backend
WORKDIR /app
COPY frontend/ frontend/

# ============================================================================
# Runtime stage: Minimal image with only runtime dependencies
# ============================================================================
FROM python:3.13-alpine

# Install only runtime dependencies for cairo (not dev headers)
RUN apk add --no-cache \
    cairo \
    && addgroup -g 1000 -S appgroup \
    && adduser -u 1000 -S appuser -G appgroup

# Set working directory to backend (where the app runs)
WORKDIR /app/backend

# Copy virtual environment from builder stage
COPY --from=builder --chown=appuser:appgroup /app/backend/.venv /app/backend/.venv

# Copy application code (backend)
COPY --chown=appuser:appgroup backend/ .

# Copy frontend directory (needed for templates)
# This is copied to /app/frontend so ../frontend/ paths work from /app/backend
COPY --chown=appuser:appgroup frontend/ /app/frontend/

# Create a non-root user and switch to it
USER appuser

# Expose port
EXPOSE 8080

# Add healthcheck (using Python from venv)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /app/backend/.venv/bin/python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/')" || exit 1

# Run application using Python from virtual environment
CMD ["/app/backend/.venv/bin/uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
