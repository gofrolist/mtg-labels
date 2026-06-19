# syntax=docker/dockerfile:1.9
# ============================================================================
# MTG Label Generator — multi-stage image
#
#   pybase  : the pinned Python/Alpine base, shared by builder and runtime so
#             the venv's compiled .so files stay ABI-compatible with the
#             runtime interpreter (one digest — the two stages can't drift).
#   builder : compiles the pycairo / cairosvg C extensions and resolves the
#             locked dependency set with uv. Compilers and -dev headers live
#             here and are thrown away.
#   runtime : minimal Alpine image carrying only the runtime shared libs, the
#             prebuilt virtualenv, and the application assets. Runs non-root.
#
# Base images are pinned by literal tag + immutable @sha256 digest, so builds
# are reproducible and supply-chain-safe. The tags are LITERAL (not built from
# ARGs) so Dependabot's docker ecosystem can parse them and bump tag+digest
# together — its parser rejects ARG-interpolated tags. See .github/dependabot.yml.
# ============================================================================

# uv binary as a pinned alias stage (copied into the builder below).
FROM ghcr.io/astral-sh/uv:0.11.22@sha256:16b63af0e7342dd372da9ca989ea9fa542fc68f4640972d59a8450a5240fe42e AS uvbin

# Shared, pinned Python base — one digest for both builder and runtime.
FROM python:3.13-alpine3.21@sha256:e77011e08668411a8db356ec6bae7d39cdb0ff531db49bf1de9d5a64d8f75a6a AS pybase

# ---------------------------------------------------------------------------
# Build stage
# ---------------------------------------------------------------------------
FROM pybase AS builder

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

# Pre-compile the app source so cold starts skip import-time compilation.
# UV_COMPILE_BYTECODE only compiles installed packages, not the modules imported
# from /app/src; compileall writes .pyc explicitly (unaffected by
# PYTHONDONTWRITEBYTECODE). The emitted src/**/__pycache__ rides along with the
# `COPY --from=builder /app/src` below. main.py is intentionally excluded — its
# .pyc would land in /app/__pycache__, which the runtime stage doesn't copy, and
# the module is trivial. unchecked-hash keeps .pyc valid regardless of source
# mtimes for deterministic rebuilds.
RUN python -m compileall -q --invalidation-mode unchecked-hash /app/src

# ---------------------------------------------------------------------------
# Runtime stage
# ---------------------------------------------------------------------------
FROM pybase AS runtime

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
