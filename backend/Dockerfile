# syntax=docker/dockerfile:1.9
# ============================================================================
# MTG Label Generator — multi-stage image
#
#   builder : compiles the pycairo / cairosvg C extensions and resolves the
#             locked dependency set with uv. All compilers and -dev headers
#             live here and are thrown away.
#   runtime : minimal Alpine image carrying only the runtime shared libs, the
#             prebuilt virtualenv, and the application assets. Runs non-root.
#
# Versions live in build args; images are additionally pinned by immutable
# digest for reproducible, supply-chain-safe builds (bumped by Dependabot's
# docker ecosystem — see .github/dependabot.yml). Both stages share the SAME
# base digest so the venv's compiled .so files stay ABI-compatible with the
# runtime interpreter.
# ============================================================================

ARG PYTHON_VERSION=3.13
ARG ALPINE_VERSION=3.21
ARG UV_VERSION=0.11.22

# uv binary as a pinned alias stage. ARG + immutable digest both resolve in a
# FROM (unlike `COPY --from`, which can't combine an ARG with a digest), so we
# get an authoritative, bumpable version AND bit-for-bit reproducibility.
FROM ghcr.io/astral-sh/uv:${UV_VERSION}@sha256:16b63af0e7342dd372da9ca989ea9fa542fc68f4640972d59a8450a5240fe42e AS uvbin

# ---------------------------------------------------------------------------
# Build stage
# ---------------------------------------------------------------------------
FROM python:${PYTHON_VERSION}-alpine${ALPINE_VERSION}@sha256:e77011e08668411a8db356ec6bae7d39cdb0ff531db49bf1de9d5a64d8f75a6a AS builder

# Pinned uv binary — never :latest (see the uvbin alias stage above).
COPY --from=uvbin /uv /usr/local/bin/uv

# uv tuning:
#   UV_COMPILE_BYTECODE  precompile .pyc for installed deps (faster cold starts)
#   UV_LINK_MODE=copy    cache mount is a separate fs; copy avoids hardlink warnings
#   UV_PYTHON_DOWNLOADS  use the base image's interpreter, never fetch a managed one
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Build-only toolchain for the C extensions (discarded with this stage).
RUN apk add --no-cache gcc g++ musl-dev pkgconfig cairo-dev

WORKDIR /app

# 1) Install third-party deps first. This layer is cached and only rebuilds
#    when pyproject.toml / uv.lock change — not on every source edit.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# 2) Copy the source and install the project on top of the cached deps layer.
COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Pre-compile the app source. UV_COMPILE_BYTECODE only compiles installed
# packages, not the modules imported from /app/src at runtime; compileall
# writes .pyc explicitly (unaffected by PYTHONDONTWRITEBYTECODE). The emitted
# __pycache__/ rides along with the `COPY --from=builder /app/src` below, so
# cold starts skip import-time compilation. unchecked-hash keeps .pyc validity
# independent of source mtimes for deterministic rebuilds.
RUN python -m compileall -q --invalidation-mode unchecked-hash /app/src /app/main.py

# ---------------------------------------------------------------------------
# Runtime stage
# ---------------------------------------------------------------------------
FROM python:${PYTHON_VERSION}-alpine${ALPINE_VERSION}@sha256:e77011e08668411a8db356ec6bae7d39cdb0ff531db49bf1de9d5a64d8f75a6a AS runtime

LABEL org.opencontainers.image.title="mtg-labels" \
      org.opencontainers.image.source="https://github.com/gofrolist/mtg-labels" \
      org.opencontainers.image.description="Printable Avery label sheet generator for Magic: The Gathering sets"

# Runtime shared lib for cairosvg/pycairo (the -dev headers stay in builder).
# Create an unprivileged user in the same layer to keep the image lean.
RUN apk add --no-cache cairo \
    && addgroup -g 1000 -S appgroup \
    && adduser -u 1000 -S appuser -G appgroup

# Put the venv on PATH so `python` / `uvicorn` resolve without absolute paths.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:${PATH}"

WORKDIR /app

# Virtualenv first — changes only when dependencies change.
COPY --from=builder --chown=appuser:appgroup /app/.venv ./.venv

# Then only the files actually needed at runtime (no tests, caches, or tooling).
# pyproject.toml is required: src/mtg_labels reads it for __version__.
COPY --from=builder --chown=appuser:appgroup /app/main.py ./main.py
COPY --from=builder --chown=appuser:appgroup /app/pyproject.toml ./pyproject.toml
COPY --from=builder --chown=appuser:appgroup /app/src ./src
COPY --from=builder --chown=appuser:appgroup /app/fonts ./fonts
COPY --from=builder --chown=appuser:appgroup /app/pdf-templates ./pdf-templates
COPY --from=builder --chown=appuser:appgroup /app/static ./static

USER appuser

EXPOSE 8080

# Liveness probe against the LOCAL app. The root route 301-redirects browser
# UAs to Vercel; a User-Agent containing "health" makes routes.py return a
# local 200 with no outbound call. timeout=5 stays below Docker's --timeout=10s.
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request as u; u.urlopen(u.Request('http://localhost:8080/', headers={'User-Agent': 'healthcheck'}), timeout=5)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
