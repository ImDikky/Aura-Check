"""
Aura-Check — FastAPI Backend
api/main.py

Estructura profesional con:
- Servicio del frontend (Jinja2 + static files)
- Endpoint /api/verify con análisis de seguridad simulado y Rate Limiting
- Middleware de seguridad y CORS
"""

from __future__ import annotations

import os
import random
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from dotenv import load_dotenv

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Cargar variables de entorno locales (.env) si existe
load_dotenv()

# ──────────────────────────────────────────────
#  App factory & Rate Limiting
# ──────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

# SlowAPI Limiter usando IP
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Aura-Check API",
    description="Sistema de verificación biométrica local. Ningún dato sale del dispositivo.",
    version="1.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Integrar SlowAPI a la app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ──────────────────────────────────────────────
#  CORS — solo origen local en producción
# ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
#  Static files & Templates
# ──────────────────────────────────────────────
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")


# ──────────────────────────────────────────────
#  Frontend route
# ──────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def index(request: Request):
    """Sirve el dashboard principal con el estado del sistema inyectado vía Jinja2."""
    aura_status = os.getenv("AURA_STATUS", "SISTEMA ACTIVO")
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "aura_status": aura_status,
        },
    )


# ──────────────────────────────────────────────
#  Models (sin Pydantic v2 estricto para compatibilidad Vercel)
# ──────────────────────────────────────────────
from pydantic import BaseModel, Field


class VerifyRequest(BaseModel):
    """Payload enviado por el cliente para solicitar un análisis."""
    module: str = Field(
        ...,
        description="Módulo a verificar: 'biometric' | 'camera' | 'audio' | 'system'",
        pattern="^(biometric|camera|audio|system)$",
    )
    session_id: str | None = Field(
        default=None,
        description="ID de sesión del cliente (opcional).",
    )


class ThreatIndicator(BaseModel):
    code: str
    severity: str          # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    description: str
    resolved: bool


class VerifyResponse(BaseModel):
    request_id: str
    module: str
    timestamp: str
    duration_ms: float
    status: str            # "CLEAR" | "WARNING" | "THREAT_DETECTED"
    confidence_score: float
    aura_index: float      # 0.0 – 1.0
    threats: list[ThreatIndicator]
    summary: str


# ──────────────────────────────────────────────
#  Helpers — simulador de análisis por módulo
# ──────────────────────────────────────────────
_MODULE_LABELS = {
    "biometric": "Integridad Biométrica",
    "camera":    "Sensor Óptico",
    "audio":     "Frecuencia Acústica",
    "system":    "Aura del Sistema",
}

_THREAT_POOL: dict[str, list[ThreatIndicator]] = {
    "biometric": [
        ThreatIndicator(code="BIO-001", severity="LOW",    description="Patrón dactilar parcialmente legible.", resolved=True),
        ThreatIndicator(code="BIO-002", severity="MEDIUM", description="Discrepancia facial < 8 %.",            resolved=True),
    ],
    "camera": [
        ThreatIndicator(code="CAM-001", severity="LOW",    description="Baja luminosidad detectada.",           resolved=False),
        ThreatIndicator(code="CAM-002", severity="HIGH",   description="Lente obstruido temporalmente.",        resolved=True),
    ],
    "audio": [
        ThreatIndicator(code="AUD-001", severity="LOW",    description="Ruido de fondo > 30 dB.",              resolved=True),
        ThreatIndicator(code="AUD-002", severity="MEDIUM", description="Eco detectado en canal izquierdo.",    resolved=False),
    ],
    "system": [
        ThreatIndicator(code="SYS-001", severity="LOW",    description="Batería < 20 %.",                      resolved=False),
        ThreatIndicator(code="SYS-002", severity="CRITICAL", description="Módulo de encriptación degradado.", resolved=True),
    ],
}


def _simulate_analysis(module: str) -> VerifyResponse:
    """Simula un análisis de seguridad para el módulo solicitado."""
    t_start = time.perf_counter()

    # Simular latencia de procesamiento (10–80 ms)
    time.sleep(random.uniform(0.01, 0.08))

    threats = random.sample(_THREAT_POOL.get(module, []), k=random.randint(0, 1))
    unresolved = [t for t in threats if not t.resolved]

    confidence = round(random.uniform(0.82, 0.99), 4)
    aura_index = round(random.uniform(0.75, 0.98) if not unresolved else random.uniform(0.5, 0.74), 4)

    if not threats:
        status_val = "CLEAR"
    elif unresolved:
        max_sev = max(t.severity for t in unresolved)
        status_val = "THREAT_DETECTED" if max_sev in ("HIGH", "CRITICAL") else "WARNING"
    else:
        status_val = "WARNING"

    duration_ms = round((time.perf_counter() - t_start) * 1000, 2)

    return VerifyResponse(
        request_id=str(uuid.uuid4()),
        module=module,
        timestamp=datetime.utcnow().isoformat() + "Z",
        duration_ms=duration_ms,
        status=status_val,
        confidence_score=confidence,
        aura_index=aura_index,
        threats=threats,
        summary=(
            f"{_MODULE_LABELS[module]}: {status_val} — "
            f"Confianza {confidence * 100:.1f}% · Aura {aura_index * 100:.1f}%"
        ),
    )


# ──────────────────────────────────────────────
#  API Endpoints
# ──────────────────────────────────────────────
@app.post(
    "/api/verify",
    response_model=VerifyResponse,
    summary="Ejecuta un análisis de seguridad simulado (Máx 20/minuto)",
    tags=["Verificación"],
)
@limiter.limit("20/minute")
async def verify(request: Request, payload: VerifyRequest) -> VerifyResponse:
    """
    Recibe el módulo a analizar y devuelve un informe de seguridad simulado.

    - **module**: `biometric` | `camera` | `audio` | `system`
    - **session_id**: Identificador de sesión del cliente (opcional).
    """
    try:
        return _simulate_analysis(payload.module)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en análisis del módulo '{payload.module}': {exc}",
        ) from exc


@app.get(
    "/api/health",
    summary="Health check",
    tags=["Sistema"],
)
async def health(request: Request) -> dict:  # request dict required by slowapi if adding limiters later
    """Verifica que la API esté activa."""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": app.version,
    }


# ──────────────────────────────────────────────
#  Entry point (desarrollo local)
# ──────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)

