from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.auth import ROLES_CIERRE, ROLES_ESCRITURA, requiere_roles
from app.api.dependencies import get_aplicar_plantilla_use_case, get_ejecutar_recurrentes_use_case, get_repositorio_plantillas
from app.application.dtos import AsientoResponseDTO
from app.application.plantillas import (
    AplicarPlantillaDTO,
    AplicarPlantillaUseCase,
    EjecutarRecurrentesUseCase,
    PlantillaInputDTO,
    PlantillaResponseDTO,
    RecurrenteInputDTO,
    RecurrenteResponseDTO,
    RepositorioPlantillasSQL,
    ResultadoRecurrenteDTO,
    a_recurrente_response,
    a_response,
)

router = APIRouter(tags=["Plantillas y Asientos Recurrentes"])


@router.get("/plantillas", response_model=List[PlantillaResponseDTO])
def listar_plantillas(repo: RepositorioPlantillasSQL = Depends(get_repositorio_plantillas)):
    return [a_response(p) for p in repo.listar()]


@router.get("/plantillas/{codigo}", response_model=PlantillaResponseDTO)
def obtener_plantilla(codigo: str, repo: RepositorioPlantillasSQL = Depends(get_repositorio_plantillas)):
    p = repo.obtener(codigo)
    if not p:
        raise HTTPException(status_code=404, detail=f"Plantilla {codigo} no encontrada.")
    return a_response(p)


@router.post("/plantillas", response_model=PlantillaResponseDTO, status_code=status.HTTP_201_CREATED)
def crear_plantilla(
    dto: PlantillaInputDTO,
    repo: RepositorioPlantillasSQL = Depends(get_repositorio_plantillas),
    usuario=Depends(requiere_roles(*ROLES_CIERRE)),
):
    return a_response(repo.crear(dto))


@router.post("/plantillas/{codigo}/aplicar", response_model=AsientoResponseDTO, status_code=status.HTTP_201_CREATED)
def aplicar_plantilla(
    codigo: str,
    dto: AplicarPlantillaDTO,
    use_case: AplicarPlantillaUseCase = Depends(get_aplicar_plantilla_use_case),
    usuario=Depends(requiere_roles(*ROLES_ESCRITURA)),
):
    """Genera y registra un asiento a partir de la plantilla; valida partida doble y período como cualquier asiento."""
    return use_case.ejecutar(codigo, dto, usuario.nombre_usuario)


@router.get("/recurrentes", response_model=List[RecurrenteResponseDTO])
def listar_recurrentes(repo: RepositorioPlantillasSQL = Depends(get_repositorio_plantillas)):
    return [a_recurrente_response(r) for r in repo.listar_recurrentes()]


@router.post("/recurrentes", response_model=RecurrenteResponseDTO, status_code=status.HTTP_201_CREATED)
def crear_recurrente(
    dto: RecurrenteInputDTO,
    repo: RepositorioPlantillasSQL = Depends(get_repositorio_plantillas),
    usuario=Depends(requiere_roles(*ROLES_CIERRE)),
):
    plantilla = repo.obtener(dto.codigo_plantilla)
    if not plantilla or not plantilla.activo:
        raise HTTPException(status_code=404, detail=f"Plantilla {dto.codigo_plantilla} no encontrada.")
    return a_recurrente_response(repo.crear_recurrente(dto, plantilla, usuario.nombre_usuario))


@router.post("/recurrentes/{id_recurrente}/desactivar", response_model=RecurrenteResponseDTO)
def desactivar_recurrente(
    id_recurrente: int,
    repo: RepositorioPlantillasSQL = Depends(get_repositorio_plantillas),
    usuario=Depends(requiere_roles(*ROLES_CIERRE)),
):
    r = repo.obtener_recurrente(id_recurrente)
    if not r:
        raise HTTPException(status_code=404, detail="Asiento recurrente no encontrado.")
    r.activo = False
    repo.db.commit()
    return a_recurrente_response(r)


class EjecutarRecurrentesDTO(BaseModel):
    fecha_corte: Optional[date] = None


@router.post("/recurrentes/ejecutar", response_model=List[ResultadoRecurrenteDTO])
def ejecutar_recurrentes(
    dto: EjecutarRecurrentesDTO = EjecutarRecurrentesDTO(),
    use_case: EjecutarRecurrentesUseCase = Depends(get_ejecutar_recurrentes_use_case),
    usuario=Depends(requiere_roles(*ROLES_CIERRE)),
):
    """Genera los asientos recurrentes pendientes hasta la fecha de corte (hoy por defecto). Idempotente."""
    return use_case.ejecutar(dto.fecha_corte or date.today())
