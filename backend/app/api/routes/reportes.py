from fastapi import APIRouter, Depends, Query, Response
from typing import List, Optional, Dict, Any
from decimal import Decimal

from app.application.dtos import BalanceComprobacionItemDTO
from app.application.use_cases import GenerarBalanceComprobacionUseCase
from app.application.ple_service import PLEService
from app.ports.repositories import RepositorioAsientosPort, RepositorioPeriodosPort, RepositorioCuentasPort
from app.api.dependencies import (
    get_balance_comprobacion_use_case,
    get_repositorio_asientos,
    get_repositorio_periodos,
    get_repositorio_cuentas,
)

router = APIRouter(prefix="/reportes", tags=["Reportes Contables & SUNAT"])

@router.get("/balance-comprobacion", response_model=List[BalanceComprobacionItemDTO])
def obtener_balance_comprobacion(
    ejercicio: Optional[int] = Query(2026),
    use_case: GenerarBalanceComprobacionUseCase = Depends(get_balance_comprobacion_use_case),
):
    """
    Balance de Comprobación oficial (Sumas y Saldos).
    Permite verificar el cuadre de todas las cuentas y la ecuación contable.
    """
    return use_case.ejecutar(codigo_ejercicio=ejercicio)

@router.get("/ple/diario")
def descargar_ple_diario_5_1(
    ejercicio: int = Query(2026),
    mes: int = Query(10),
    ruc: str = Query("20123456789"),
    repo_asientos: RepositorioAsientosPort = Depends(get_repositorio_asientos),
):
    """
    7.1.1 Exportación SUNAT PLE - Libro Diario Formato 5.1
    Genera el archivo plano conforme a la Resolución N.º 234-2006/SUNAT.
    Nomenclatura: LE[RUC][AÑO][MES]00050100001111.txt
    """
    asientos = repo_asientos.listar(codigo_ejercicio=ejercicio)
    # Filtrar por mes
    asientos_mes = [a for a in asientos if a.fecha.month == mes]

    contenido = PLEService.generar_libro_diario_5_1(
        asientos=asientos_mes,
        ruc=ruc,
        ejercicio=ejercicio,
        mes=mes
    )
    nombre_archivo = PLEService.obtener_nombre_archivo_ple_diario(ruc=ruc, ejercicio=ejercicio, mes=mes)

    return Response(
        content=contenido,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{nombre_archivo}"',
            "X-PLE-Filename": nombre_archivo,
        }
    )

@router.get("/kpis")
def obtener_kpis(
    ejercicio: int = Query(2026),
    repo_asientos: RepositorioAsientosPort = Depends(get_repositorio_asientos),
    repo_periodos: RepositorioPeriodosPort = Depends(get_repositorio_periodos),
    repo_cuentas: RepositorioCuentasPort = Depends(get_repositorio_cuentas),
) -> Dict[str, Any]:
    """
    Métricas e indicadores globales del sistema contable.
    """
    asientos = repo_asientos.listar(codigo_ejercicio=ejercicio)
    periodos = repo_periodos.listar_periodos(codigo_ejercicio=ejercicio)
    cuentas = repo_cuentas.listar_todas()

    total_asientos = len(asientos)
    asientos_validados = sum(1 for a in asientos if a.estado in ("VALIDADO", "REGISTRADO"))
    asientos_anulados = sum(1 for a in asientos if a.estado == "ANULADO")
    asientos_rectificados = sum(1 for a in asientos if a.estado == "RECTIFICADO")

    suma_debe = sum(a.debe_total for a in asientos if a.estado != "ANULADO")
    suma_haber = sum(a.haber_total for a in asientos if a.estado != "ANULADO")
    diferencia = abs(suma_debe - suma_haber)

    periodos_abiertos = sum(1 for p in periodos if p.estado_bloqueo == "ABIERTO")
    periodos_cerrados = sum(1 for p in periodos if p.estado_bloqueo in ("PROVISIONAL", "DEFINITIVO"))

    return {
        "ejercicio": ejercicio,
        "total_asientos": total_asientos,
        "asientos_validados": asientos_validados,
        "asientos_anulados": asientos_anulados,
        "asientos_rectificados": asientos_rectificados,
        "suma_debe_acumulada": float(suma_debe),
        "suma_haber_acumulada": float(suma_haber),
        "diferencia_cuadre": float(diferencia),
        "cuadre_perfecto": bool(diferencia < Decimal("0.01")),
        "total_cuentas_pcge": len(cuentas),
        "periodos_abiertos": periodos_abiertos,
        "periodos_cerrados": periodos_cerrados,
    }
