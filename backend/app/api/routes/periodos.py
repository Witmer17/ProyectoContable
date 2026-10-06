from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.domain.entities import BloqueoPeriodo
from app.application.dtos import BloqueoPeriodoInputDTO
from app.application.use_cases import BloquearPeriodoUseCase
from app.ports.repositories import RepositorioPeriodosPort
from app.api.auth import requiere_roles, ROLES_CIERRE
from app.api.dependencies import (
    get_bloquear_periodo_use_case,
    get_repositorio_periodos,
)

router = APIRouter(prefix="/periodos", tags=["Control de Bloqueo de Períodos"])

class PeriodoResponseDTO(BaseModel):
    codigo_bloqueo: Optional[int] = None
    codigo_ejercicio: int
    mes: int
    estado_bloqueo: str
    fecha_bloqueo: Optional[datetime] = None
    usuario_bloqueo: Optional[str] = None
    razon_bloqueo: Optional[str] = None

@router.get("", response_model=List[PeriodoResponseDTO])
def listar_periodos(
    codigo_ejercicio: Optional[int] = None,
    repo: RepositorioPeriodosPort = Depends(get_repositorio_periodos),
):
    periodos = repo.listar_periodos(codigo_ejercicio=codigo_ejercicio or 2026)
    return [
        PeriodoResponseDTO(
            codigo_bloqueo=p.codigo_bloqueo,
            codigo_ejercicio=p.codigo_ejercicio,
            mes=p.mes,
            estado_bloqueo=p.estado_bloqueo,
            fecha_bloqueo=p.fecha_bloqueo,
            usuario_bloqueo=p.usuario_bloqueo,
            razon_bloqueo=p.razon_bloqueo,
        )
        for p in periodos
    ]

@router.post("/bloquear", response_model=PeriodoResponseDTO)
def bloquear_periodo(
    dto: BloqueoPeriodoInputDTO,
    use_case: BloquearPeriodoUseCase = Depends(get_bloquear_periodo_use_case),
    usuario=Depends(requiere_roles(*ROLES_CIERRE)),
):
    """
    3.1.1 Control de Bloqueo de Períodos
    Cambia el estado del período (ABIERTO, PROVISIONAL, DEFINITIVO).
    """
    dto.usuario = usuario.nombre_usuario
    periodo = use_case.ejecutar(dto)
    return PeriodoResponseDTO(
        codigo_bloqueo=periodo.codigo_bloqueo,
        codigo_ejercicio=periodo.codigo_ejercicio,
        mes=periodo.mes,
        estado_bloqueo=periodo.estado_bloqueo,
        fecha_bloqueo=periodo.fecha_bloqueo,
        usuario_bloqueo=periodo.usuario_bloqueo,
        razon_bloqueo=periodo.razon_bloqueo,
    )
