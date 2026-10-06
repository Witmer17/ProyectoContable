import os
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.infrastructure.database import init_db, SessionLocal
from app.infrastructure.seed_data import ejecutar_seed
from app.domain.exceptions import (
    PartidaDesbalanceadaError,
    PeriodoCerradoError,
    CuentaInvalidaError,
    ConcurrencyConflictError,
    DeadlockError,
    RectificacionInvalidaError,
)
from app.api.auth import get_usuario_actual
from app.api.routes.auth import router as auth_router
from app.api.routes.asientos import router as asientos_router
from app.api.routes.cuentas import router as cuentas_router
from app.api.routes.periodos import router as periodos_router
from app.api.routes.facturas import router as facturas_router
from app.api.routes.reportes import router as reportes_router
from app.api.routes.plantillas import router as plantillas_router
from app.api.routes.eventos import router as eventos_router
from app.application.plantillas import PlantillaNoEncontradaError, PlantillaInvalidaError

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialización de la base de datos y catálogo de datos iniciales
    init_db()
    db = SessionLocal()
    try:
        ejecutar_seed(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="Sistema Contable Empresarial (PCGE & SUNAT)",
    description=(
        "API REST para Sistema Contable bajo Clean Architecture. "
        "Auditoría integral, control de concurrencia optimista/pesimista, "
        "Plan Contable General Empresarial (PCGE), exportación SUNAT PLE 5.1 y preparación SIRE."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# Configuración de CORS para el Frontend Angular
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:4200").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Manejadores de Excepciones de Dominio Contable
@app.exception_handler(PartidaDesbalanceadaError)
async def handle_partida_desbalanceada(request: Request, exc: PartidaDesbalanceadaError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "PARTIDA_DESBALANCEADA", "detalle": str(exc)},
    )

@app.exception_handler(PeriodoCerradoError)
async def handle_periodo_cerrado(request: Request, exc: PeriodoCerradoError):
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"error": "PERIODO_CERRADO", "detalle": str(exc)},
    )

@app.exception_handler(CuentaInvalidaError)
async def handle_cuenta_invalida(request: Request, exc: CuentaInvalidaError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "CUENTA_INVALIDA", "detalle": str(exc)},
    )

@app.exception_handler(ConcurrencyConflictError)
async def handle_concurrency_conflict(request: Request, exc: ConcurrencyConflictError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"error": "CONFLICTO_CONCURRENCIA", "detalle": str(exc)},
    )

@app.exception_handler(DeadlockError)
async def handle_deadlock(request: Request, exc: DeadlockError):
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"error": "DEADLOCK_DETECTADO", "detalle": str(exc)},
    )

@app.exception_handler(RectificacionInvalidaError)
async def handle_rectificacion_invalida(request: Request, exc: RectificacionInvalidaError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "RECTIFICACION_INVALIDA", "detalle": str(exc)},
    )

@app.exception_handler(PlantillaNoEncontradaError)
async def handle_plantilla_no_encontrada(request: Request, exc: PlantillaNoEncontradaError):
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"error": "PLANTILLA_NO_ENCONTRADA", "detalle": str(exc)})

@app.exception_handler(PlantillaInvalidaError)
async def handle_plantilla_invalida(request: Request, exc: PlantillaInvalidaError):
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"error": "PLANTILLA_INVALIDA", "detalle": str(exc)})

# Inclusión de Rutas con prefijo /api/v1
api_prefix = "/api/v1"
protegido = [Depends(get_usuario_actual)]
app.include_router(auth_router, prefix=api_prefix)
app.include_router(asientos_router, prefix=api_prefix, dependencies=protegido)
app.include_router(cuentas_router, prefix=api_prefix, dependencies=protegido)
app.include_router(periodos_router, prefix=api_prefix, dependencies=protegido)
app.include_router(facturas_router, prefix=api_prefix, dependencies=protegido)
app.include_router(reportes_router, prefix=api_prefix, dependencies=protegido)
app.include_router(plantillas_router, prefix=api_prefix, dependencies=protegido)
app.include_router(eventos_router, prefix=api_prefix, dependencies=protegido)

@app.get("/", tags=["Salud & Estado"])
def root():
    return {
        "sistema": "Sistema Contable Empresarial Mejorado",
        "version": "2.0.0",
        "estado": "ACTIVO",
        "normativa": ["SUNAT Res. 234-2006", "PCGE 2019/2026", "SIRE RVIE"],
        "documentacion": "/docs",
    }
