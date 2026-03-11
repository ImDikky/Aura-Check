import sys
from pathlib import Path

# Add the project root to the Python path
sys.path.append(str(Path(__file__).resolve().parent.parent))

try:
    # Intenta cargar la aplicación principal
    from api.main import app
except Exception as e:
    # Si colapsa el módulo (ej. un Import o archivo que falla al ser requerido por Vercel)
    import traceback
    from fastapi import FastAPI
    from fastapi.responses import PlainTextResponse

    app = FastAPI(title="Error Handler")
    
    error_trace = traceback.format_exc()

    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def catch_all(path_name: str):
        return PlainTextResponse(content=f"CRITICAL APP LOAD ERROR:\n\n{error_trace}\n\nPath: {path_name}", status_code=500)
