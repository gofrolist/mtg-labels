"""Main entry point for MTG Label Generator application.

This module maintains backward compatibility by importing from the new
module structure and exposing the app instance.
"""

from src.api.routes import create_app

# Create FastAPI application using the new structure
app = create_app()

# Maintain backward compatibility: expose classes and functions from old location


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
