from fastapi import Depends
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db
from app.infrastructure.repositories_sql import (
    RepositorioAsientosSQL,
    RepositorioCuentasSQL,
    RepositorioPeriodosSQL,
    RepositorioAuditoriaSQL,
    RepositorioEventosSQL,
)
from app.infrastructure.outbox import OutboxEventPublisher
from app.application.use_cases import (
    CrearAsientoUseCase,
    ConsultarAsientoUseCase,
    RectificarAsientoUseCase,
    BloquearPeriodoUseCase,
    MapearFacturaPCGEUseCase,
    GenerarBalanceComprobacionUseCase,
)

def get_repositorio_asientos(db: Session = Depends(get_db)):
    return RepositorioAsientosSQL(db)

def get_repositorio_cuentas(db: Session = Depends(get_db)):
    return RepositorioCuentasSQL(db)

def get_repositorio_periodos(db: Session = Depends(get_db)):
    return RepositorioPeriodosSQL(db)

def get_repositorio_auditoria(db: Session = Depends(get_db)):
    return RepositorioAuditoriaSQL(db)

def get_repositorio_eventos(db: Session = Depends(get_db)):
    return RepositorioEventosSQL(db)

def get_event_publisher(db: Session = Depends(get_db)):
    return OutboxEventPublisher(db)

def get_crear_asiento_use_case(
    repo_asientos: RepositorioAsientosSQL = Depends(get_repositorio_asientos),
    repo_cuentas: RepositorioCuentasSQL = Depends(get_repositorio_cuentas),
    repo_periodos: RepositorioPeriodosSQL = Depends(get_repositorio_periodos),
    repo_auditoria: RepositorioAuditoriaSQL = Depends(get_repositorio_auditoria),
    event_publisher: OutboxEventPublisher = Depends(get_event_publisher),
):
    return CrearAsientoUseCase(
        repo_asientos=repo_asientos,
        repo_cuentas=repo_cuentas,
        repo_periodos=repo_periodos,
        repo_auditoria=repo_auditoria,
        event_publisher=event_publisher,
    )

def get_consultar_asiento_use_case(
    repo_asientos: RepositorioAsientosSQL = Depends(get_repositorio_asientos),
    repo_cuentas: RepositorioCuentasSQL = Depends(get_repositorio_cuentas),
    repo_auditoria: RepositorioAuditoriaSQL = Depends(get_repositorio_auditoria),
):
    return ConsultarAsientoUseCase(
        repo_asientos=repo_asientos,
        repo_cuentas=repo_cuentas,
        repo_auditoria=repo_auditoria,
    )

def get_rectificar_asiento_use_case(
    crear_use_case: CrearAsientoUseCase = Depends(get_crear_asiento_use_case),
    repo_asientos: RepositorioAsientosSQL = Depends(get_repositorio_asientos),
    repo_cuentas: RepositorioCuentasSQL = Depends(get_repositorio_cuentas),
    repo_auditoria: RepositorioAuditoriaSQL = Depends(get_repositorio_auditoria),
):
    return RectificarAsientoUseCase(
        crear_use_case=crear_use_case,
        repo_asientos=repo_asientos,
        repo_cuentas=repo_cuentas,
        repo_auditoria=repo_auditoria,
    )

def get_mapear_factura_use_case(
    crear_use_case: CrearAsientoUseCase = Depends(get_crear_asiento_use_case),
):
    return MapearFacturaPCGEUseCase(crear_asiento_use_case=crear_use_case)

def get_bloquear_periodo_use_case(
    repo_periodos: RepositorioPeriodosSQL = Depends(get_repositorio_periodos),
):
    return BloquearPeriodoUseCase(repo_periodos=repo_periodos)

def get_balance_comprobacion_use_case(
    repo_asientos: RepositorioAsientosSQL = Depends(get_repositorio_asientos),
    repo_cuentas: RepositorioCuentasSQL = Depends(get_repositorio_cuentas),
):
    return GenerarBalanceComprobacionUseCase(
        repo_asientos=repo_asientos,
        repo_cuentas=repo_cuentas,
    )


from app.application.plantillas import (
    AplicarPlantillaUseCase,
    EjecutarRecurrentesUseCase,
    RepositorioPlantillasSQL,
)


def get_repositorio_plantillas(db: Session = Depends(get_db)):
    return RepositorioPlantillasSQL(db)


def get_aplicar_plantilla_use_case(
    repo: RepositorioPlantillasSQL = Depends(get_repositorio_plantillas),
    crear_use_case: CrearAsientoUseCase = Depends(get_crear_asiento_use_case),
):
    return AplicarPlantillaUseCase(repo, crear_use_case)


def get_ejecutar_recurrentes_use_case(
    repo: RepositorioPlantillasSQL = Depends(get_repositorio_plantillas),
    aplicar: AplicarPlantillaUseCase = Depends(get_aplicar_plantilla_use_case),
):
    return EjecutarRecurrentesUseCase(repo, aplicar)
