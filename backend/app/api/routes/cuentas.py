from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from pydantic import BaseModel
from decimal import Decimal

from app.ports.repositories import RepositorioCuentasPort
from app.api.dependencies import get_repositorio_cuentas

router = APIRouter(prefix="/cuentas", tags=["Plan de Cuentas (PCGE)"])

class CuentaResponseDTO(BaseModel):
    codigo: int
    codigo_tipo: int
    codigo_nivel: int
    nombre: str
    descripcion: Optional[str] = None
    es_auxiliar: bool
    requiere_analitica: bool
    estado: str
    saldo_mayor: Decimal

@router.get("", response_model=List[CuentaResponseDTO])
def listar_cuentas(
    solo_activas: bool = Query(True),
    repo: RepositorioCuentasPort = Depends(get_repositorio_cuentas),
):
    """
    Catálogo de cuentas bajo el Plan Contable General Empresarial (PCGE) oficial.
    """
    cuentas = repo.listar_todas(solo_activas=solo_activas)
    return [
        CuentaResponseDTO(
            codigo=c.codigo,
            codigo_tipo=c.codigo_tipo,
            codigo_nivel=c.codigo_nivel,
            nombre=c.nombre,
            descripcion=c.descripcion,
            es_auxiliar=c.es_auxiliar,
            requiere_analitica=c.requiere_analitica,
            estado=c.estado,
            saldo_mayor=c.saldo_mayor,
        )
        for c in cuentas
    ]

@router.get("/{codigo}", response_model=CuentaResponseDTO)
def consultar_cuenta(
    codigo: int,
    repo: RepositorioCuentasPort = Depends(get_repositorio_cuentas),
):
    cuenta = repo.obtener_por_codigo(codigo)
    if not cuenta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cuenta contable {codigo} no encontrada."
        )
    return CuentaResponseDTO(
        codigo=cuenta.codigo,
        codigo_tipo=cuenta.codigo_tipo,
        codigo_nivel=cuenta.codigo_nivel,
        nombre=cuenta.nombre,
        descripcion=cuenta.descripcion,
        es_auxiliar=cuenta.es_auxiliar,
        requiere_analitica=cuenta.requiere_analitica,
        estado=cuenta.estado,
        saldo_mayor=cuenta.saldo_mayor,
    )
