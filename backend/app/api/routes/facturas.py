from fastapi import APIRouter, Depends, status
from app.application.dtos import FacturaVentaInputDTO, AsientoResponseDTO
from app.application.use_cases import MapearFacturaPCGEUseCase
from app.api.dependencies import get_mapear_factura_use_case
from app.api.auth import requiere_roles, ROLES_ESCRITURA

router = APIRouter(prefix="/facturas", tags=["Mapeo Facturación PCGE (End-to-End)"])

@router.post("/emitir-y-contabilizar", response_model=AsientoResponseDTO, status_code=status.HTTP_201_CREATED)
def emitir_y_contabilizar_factura(
    dto: FacturaVentaInputDTO,
    use_case: MapearFacturaPCGEUseCase = Depends(get_mapear_factura_use_case),
    usuario=Depends(requiere_roles(*ROLES_ESCRITURA)),
):
    """
    Capítulo 5: Flujo End-to-End
    Recibe los datos de la factura comercial emitida y ejecuta el mapeo automático a las cuentas PCGE:
    - 1212: Emitidas en Cartera (Debe: Total)
    - 40111: IGV - Cuenta Propia (Haber: IGV)
    - 70121: Mercaderías - Venta Local (Haber: Base Imponible)
    Valida partida doble, genera asiento en Libro Diario, actualiza el Mayor y notifica a SIRE/Kafka.
    """
    dto.usuario = usuario.nombre_usuario
    return use_case.ejecutar(dto)
