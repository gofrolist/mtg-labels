"""Unit tests for API dependencies and error handlers."""

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from src.api.dependencies import get_logger, setup_error_handlers


class TestErrorHandlers:
    """Tests for error handlers in dependencies.py."""

    def test_http_exception_handler(self):
        """Test HTTP exception handler."""
        app = FastAPI()
        setup_error_handlers(app)

        @app.get("/test")
        async def test_endpoint():
            raise HTTPException(status_code=404, detail="Not found")

        client = TestClient(app)
        response = client.get("/test")

        assert response.status_code == 404
        data = response.json()
        assert data["error"]["type"] == "HTTPException"
        assert data["error"]["status_code"] == 404
        assert data["error"]["detail"] == "Not found"

    def test_validation_exception_handler(self):
        """Test validation exception handler (lines 60-64)."""
        app = FastAPI()
        setup_error_handlers(app)

        @app.get("/test")
        async def test_endpoint(value: int):
            return {"value": value}

        client = TestClient(app)
        response = client.get("/test?value=not_an_int")

        assert response.status_code == 422
        data = response.json()
        assert data["error"]["type"] == "ValidationError"
        assert data["error"]["status_code"] == 422


class TestGetLogger:
    """Tests for get_logger dependency."""

    def test_get_logger_yields_logger(self):
        """Test that get_logger yields logger instance (line 111)."""
        logger_gen = get_logger()
        logger = next(logger_gen)
        assert logger is not None
        # Cleanup
        try:
            next(logger_gen)
        except StopIteration:
            pass
