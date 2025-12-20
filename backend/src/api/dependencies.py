"""Dependency injection and error handling for FastAPI application."""

import logging
from collections.abc import Generator

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from src.config import logger


def setup_error_handlers(app: FastAPI) -> None:
    """Configure error handlers for the FastAPI application.

    Args:
        app: FastAPI application instance
    """

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        """Handle HTTP exceptions with structured error responses.

        Args:
            request: FastAPI request object
            exc: HTTPException instance

        Returns:
            JSONResponse with error details
        """
        logger.error(
            f"HTTP {exc.status_code} error: {exc.detail}",
            extra={"path": request.url.path, "method": request.method},
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "type": "HTTPException",
                    "status_code": exc.status_code,
                    "detail": exc.detail,
                    "path": request.url.path,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Handle request validation errors with detailed feedback.

        Args:
            request: FastAPI request object
            exc: RequestValidationError instance

        Returns:
            JSONResponse with validation error details
        """
        logger.warning(
            f"Validation error: {exc.errors()}",
            extra={"path": request.url.path, "method": request.method},
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={
                "error": {
                    "type": "ValidationError",
                    "status_code": status.HTTP_422_UNPROCESSABLE_CONTENT,
                    "detail": "Request validation failed",
                    "errors": exc.errors(),
                    "path": request.url.path,
                }
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Handle unexpected exceptions with safe error responses.

        Args:
            request: FastAPI request object
            exc: Exception instance

        Returns:
            JSONResponse with generic error message
        """
        logger.exception(
            f"Unhandled exception: {type(exc).__name__}: {str(exc)}",
            extra={"path": request.url.path, "method": request.method},
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "type": "InternalServerError",
                    "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                    "detail": "An unexpected error occurred",
                    "path": request.url.path,
                }
            },
        )


def get_logger() -> Generator[logging.Logger]:
    """Dependency to provide logger instance.

    Yields:
        Logger instance
    """
    yield logger
