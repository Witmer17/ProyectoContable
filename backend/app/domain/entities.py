from dataclasses import dataclass, field
from datetime import date, datetime
from typing import List, Optional
from decimal import Decimal

@dataclass
class TipoCuenta:
    codigo_tipo: int
    nombre: str
    descripcion: Optional[str] = None

@dataclass
class NivelCuenta:
    codigo_nivel: int
    nombre: str
    descripcion: Optional[str] = None

@dataclass
class CuentaContable:
    codigo: int
    codigo_tipo: int
    codigo_nivel: int
    nombre: str
    descripcion: Optional[str] = None
    es_auxiliar: bool = False
    requiere_analitica: bool = False
    estado: str = "ACTIVO"
    saldo_mayor: Decimal = Decimal("0.00")
    fecha_creacion: Optional[datetime] = None

@dataclass
class Moneda:
    codigo_moneda: int
    tipo_moneda: str
    descripcion: Optional[str] = None
    tipo_cambio_compra: Decimal = Decimal("1.0000")
    tipo_cambio_venta: Decimal = Decimal("1.0000")
    fecha_actualizacion: Optional[date] = None

@dataclass
class DetalleAsiento:
    linea_numero: int
    codigo_cuenta: int
    debe: Decimal = Decimal("0.00")
    haber: Decimal = Decimal("0.00")
    saldo_deudor: Decimal = Decimal("0.00")
    saldo_acreedor: Decimal = Decimal("0.00")
    codigo_cuenta_analitica: Optional[int] = None
    observaciones: Optional[str] = None
    codigo_detalle: Optional[int] = None
    codigo_partida: Optional[int] = None
    nombre_cuenta: Optional[str] = None

@dataclass
class AsientoContable:
    codigo_ejercicio: int
    fecha: date
    concepto: str
    tipo_asiento: str  # 'APERTURA', 'OPERATIVO', 'AJUSTE', 'REGULARIZACION', 'CIERRE'
    codigo_moneda: int
    tipo_cambio: Decimal
    monto_moneda_origen: Decimal
    debe_total: Decimal
    haber_total: Decimal
    usuario_creacion: str
    detalles: List[DetalleAsiento] = field(default_factory=list)
    partida: Optional[int] = None
    estado: str = "REGISTRADO"  # 'REGISTRADO', 'VALIDADO', 'ANULADO', 'RECTIFICADO'
    observaciones: Optional[str] = None
    version: int = 1
    fecha_creacion: Optional[datetime] = None
    fecha_modificacion: Optional[datetime] = None
    usuario_modificacion: Optional[str] = None

@dataclass
class AuditoriaAsiento:
    codigo_partida: int
    tipo_operacion: str  # 'INSERT', 'UPDATE', 'DELETE'
    usuario_responsable: str
    campo_modificado: Optional[str] = None
    valor_anterior: Optional[str] = None
    valor_nuevo: Optional[str] = None
    fecha_operacion: Optional[datetime] = None
    ip_origen: Optional[str] = None
    razon_cambio: Optional[str] = None
    id_auditoria: Optional[int] = None

@dataclass
class BloqueoPeriodo:
    codigo_ejercicio: int
    mes: int
    estado_bloqueo: str = "ABIERTO"  # 'ABIERTO', 'PROVISIONAL', 'DEFINITIVO'
    fecha_bloqueo: Optional[datetime] = None
    usuario_bloqueo: Optional[str] = None
    razon_bloqueo: Optional[str] = None
    codigo_bloqueo: Optional[int] = None

@dataclass
class UsuarioSistema:
    nombre_usuario: str
    correo_electronico: str
    rol: str  # 'ADMIN', 'CONTADOR', 'AUDITOR', 'JEFE_CONTABILIDAD', 'GERENTE'
    estado: str = "ACTIVO"
    id_usuario: Optional[int] = None
    fecha_creacion: Optional[datetime] = None
    fecha_ultimo_acceso: Optional[datetime] = None

@dataclass
class EventoConciliacion:
    tipo_evento: str  # 'CIERRE_MENSUAL', 'RECTIFICACION', 'TRANSFERENCIA', 'VALIDACION'
    resultado: str  # 'EXITOSO', 'FALLIDO', 'PARCIAL'
    codigo_partida: Optional[int] = None
    descripcion_evento: Optional[str] = None
    detalles_error: Optional[str] = None
    usuario_responsable: Optional[str] = None
    fecha_evento: Optional[datetime] = None
    id_evento: Optional[int] = None
