from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import date

from app.application.dtos import (
    CrearAsientoInputDTO,
    RectificarAsientoInputDTO,
    AsientoResponseDTO,
)
from app.application.use_cases import (
    CrearAsientoUseCase,
    ConsultarAsientoUseCase,
    RectificarAsientoUseCase,
)
from app.ports.repositories import RepositorioAsientosPort
from app.api.auth import requiere_roles, ROLES_ESCRITURA
from app.api.dependencies import (
    get_crear_asiento_use_case,
    get_consultar_asiento_use_case,
    get_rectificar_asiento_use_case,
    get_repositorio_asientos,
)

router = APIRouter(prefix="/asientos", tags=["Asientos Contables"])

@router.post("", response_model=AsientoResponseDTO, status_code=status.HTTP_201_CREATED)
def crear_asiento(
    dto: CrearAsientoInputDTO,
    use_case: CrearAsientoUseCase = Depends(get_crear_asiento_use_case),
    usuario=Depends(requiere_roles(*ROLES_ESCRITURA)),
):
    """
    4.1.1 Crear Asiento Contable
    Registra un asiento en el Libro Diario validando partida doble, período abierto y cuentas activas.
    """
    dto.usuario = usuario.nombre_usuario
    return use_case.ejecutar(dto)


@router.get("/{partida}", response_model=AsientoResponseDTO)
def consultar_asiento(
    partida: int,
    use_case: ConsultarAsientoUseCase = Depends(get_consultar_asiento_use_case),
):
    """
    4.1.2 Consultar Asiento
    Recupera el asiento por número correlativo de partida, incluyendo apuntes e historial de auditoría.
    """
    asiento = use_case.ejecutar(partida)
    if not asiento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asiento con número de partida {partida} no encontrado."
        )
    return asiento


@router.post("/{partida}/rectificar", response_model=AsientoResponseDTO)
def rectificar_asiento(
    partida: int,
    dto: RectificarAsientoInputDTO,
    use_case: RectificarAsientoUseCase = Depends(get_rectificar_asiento_use_case),
    usuario=Depends(requiere_roles(*ROLES_ESCRITURA)),
):
    """
    4.1.3 Rectificar Asiento (No Borrar)
    Anula el asiento previo, revierte sus saldos, genera el nuevo asiento corregido y guarda auditoría.
    """
    dto.usuario = usuario.nombre_usuario
    return use_case.ejecutar(partida, dto)


@router.get("", response_model=List[AsientoResponseDTO])
def listar_asientos(
    codigo_ejercicio: Optional[int] = Query(None, description="Año fiscal (ej. 2026)"),
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    estado: Optional[str] = Query(None, description="REGISTRADO, VALIDADO, ANULADO, RECTIFICADO"),
    repo: RepositorioAsientosPort = Depends(get_repositorio_asientos),
    use_case: ConsultarAsientoUseCase = Depends(get_consultar_asiento_use_case),
):
    """
    Listar asientos registrados en el Libro Diario con soporte de filtros.
    """
    asientos = repo.listar(
        codigo_ejercicio=codigo_ejercicio,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        estado=estado
    )
    resultado = []
    for a in asientos:
        det = use_case.ejecutar(a.partida)
        if det:
            resultado.append(det)
    return resultado
