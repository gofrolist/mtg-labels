"""Main entry point for MTG Label Generator application."""

from src.api.routes import create_app

app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
