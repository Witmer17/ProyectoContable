from pydantic import BaseModel, Field
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime

class DetalleAsientoInputDTO(BaseModel):
    codigo_cuenta: int
    debe: Decimal = Field(default=Decimal("0.00"), ge=0)
    haber: Decimal = Field(default=Decimal("0.00"), ge=0)
    codigo_cuenta_analitica: Optional[int] = None
    observaciones: Optional[str] = None

class CrearAsientoInputDTO(BaseModel):
    fecha: date
    concepto: str
    tipo_asiento: str = Field(default="OPERATIVO")  # APERTURA, OPERATIVO, AJUSTE, REGULARIZACION, CIERRE
    codigo_moneda: int = Field(default=1)  # 1: PEN, 2: USD, 3: EUR
    tipo_cambio: Decimal = Field(default=Decimal("1.0000"), gt=0)
    detalles: List[DetalleAsientoInputDTO]
    usuario: Optional[str] = "contador_sistema"
    observaciones: Optional[str] = None

class RectificarAsientoInputDTO(BaseModel):
    razon_rectificacion: str
    detalles_nuevos: List[DetalleAsientoInputDTO]
    concepto_nuevo: Optional[str] = None
    usuario: Optional[str] = "contador_sistema"

class FacturaVentaInputDTO(BaseModel):
    numero_factura: str
    fecha: date
    cliente_ruc: str
    total_venta: Decimal
    igv: Decimal
    base_imponible: Decimal
    usuario: Optional[str] = "sistema_automatico"

class BloqueoPeriodoInputDTO(BaseModel):
    codigo_ejercicio: int
    mes: int = Field(ge=1, le=12)
    estado_bloqueo: str  # ABIERTO, PROVISIONAL, DEFINITIVO
    razon_bloqueo: Optional[str] = None
    usuario: Optional[str] = "admin_sistema"

class DetalleAsientoResponseDTO(BaseModel):
    codigo_detalle: Optional[int] = None
    linea_numero: int
    codigo_cuenta: int
    nombre_cuenta: Optional[str] = None
    debe: Decimal
    haber: Decimal
    saldo_deudor: Decimal
    saldo_acreedor: Decimal
    observaciones: Optional[str] = None

class HistorialCambioDTO(BaseModel):
    fecha_cambio: Optional[datetime] = None
    usuario: str
    cambio: str
    razon: Optional[str] = None

class AsientoResponseDTO(BaseModel):
    partida: int
    codigo_ejercicio: int
    fecha: date
    concepto: str
    tipo_asiento: str
    codigo_moneda: int
    tipo_cambio: Decimal
    monto_moneda_origen: Decimal
    debe_total: Decimal
    haber_total: Decimal
    estado: str
    version: int
    observaciones: Optional[str] = None
    detalles: List[DetalleAsientoResponseDTO] = []
    historial_cambios: List[HistorialCambioDTO] = []
    url_recurso: Optional[str] = None

class BalanceComprobacionItemDTO(BaseModel):
    codigo_cuenta: int
    nombre_cuenta: str
    elemento: int
    suma_debe: Decimal
    suma_haber: Decimal
    saldo_deudor: Decimal
    saldo_acreedor: Decimal
