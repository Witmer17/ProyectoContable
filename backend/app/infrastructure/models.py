from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    Date,
    DateTime,
    Boolean,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    Index,
    JSON,
    text,
)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class TipoModel(Base):
    __tablename__ = "tipo"

    codigo_tipo = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False, unique=True)
    descripcion = Column(String(500))

    cuentas = relationship("CuentaModel", back_populates="tipo")


class NivelModel(Base):
    __tablename__ = "nivel"

    codigo_nivel = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False, unique=True)
    descripcion = Column(String(500))

    cuentas = relationship("CuentaModel", back_populates="nivel")


class CuentaModel(Base):
    __tablename__ = "cuenta"

    codigo = Column(Integer, primary_key=True)
    codigo_tipo = Column(Integer, ForeignKey("tipo.codigo_tipo", ondelete="RESTRICT"), nullable=False)
    codigo_nivel = Column(Integer, ForeignKey("nivel.codigo_nivel", ondelete="RESTRICT"), nullable=False)
    nombre = Column(String(500), nullable=False)
    descripcion = Column(String(1000))
    es_auxiliar = Column(Boolean, default=False)
    requiere_analitica = Column(Boolean, default=False)
    estado = Column(String(20), default="ACTIVO")
    saldo_mayor = Column(Numeric(14, 2), default=0.00)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("estado IN ('ACTIVO', 'INACTIVO', 'BLOQUEADO')", name="chk_estado_cuenta"),
        Index("idx_cuenta_tipo", "codigo_tipo"),
        Index("idx_cuenta_nivel", "codigo_nivel"),
        Index("idx_cuenta_estado", "estado"),
    )

    tipo = relationship("TipoModel", back_populates="cuentas")
    nivel = relationship("NivelModel", back_populates="cuentas")
    detalles = relationship("PartidaDetalleModel", back_populates="cuenta")


class MonedaModel(Base):
    __tablename__ = "moneda"

    codigo_moneda = Column(Integer, primary_key=True)
    tipo_moneda = Column(String(10), nullable=False, unique=True)  # 'PEN', 'USD', 'EUR'
    descripcion = Column(String(100))
    tipo_cambio_compra = Column(Numeric(9, 4), nullable=False, default=1.0000)
    tipo_cambio_venta = Column(Numeric(9, 4), nullable=False, default=1.0000)
    fecha_actualizacion = Column(Date, nullable=False)

    __table_args__ = (
        CheckConstraint("tipo_cambio_compra > 0 AND tipo_cambio_venta > 0", name="chk_cambio"),
    )

    asientos = relationship("PartidaEncabezadoModel", back_populates="moneda")


class PartidaEncabezadoModel(Base):
    __tablename__ = "partida_encabezado"

    partida = Column(Integer, primary_key=True)
    codigo_ejercicio = Column(Integer, nullable=False)
    fecha = Column(Date, nullable=False)
    concepto = Column(String(500), nullable=False)
    tipo_asiento = Column(String(50), nullable=False)  # 'APERTURA', 'OPERATIVO', 'AJUSTE', 'REGULARIZACION', 'CIERRE'
    codigo_moneda = Column(Integer, ForeignKey("moneda.codigo_moneda"), nullable=False)
    tipo_cambio = Column(Numeric(9, 4), nullable=False, default=1.0000)
    monto_moneda_origen = Column(Numeric(12, 2), nullable=False)
    debe_total = Column(Numeric(12, 2), nullable=False)
    haber_total = Column(Numeric(12, 2), nullable=False)
    estado = Column(String(20), default="REGISTRADO")  # 'REGISTRADO', 'VALIDADO', 'ANULADO', 'RECTIFICADO'
    observaciones = Column(String(500))
    version = Column(Integer, default=1, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    usuario_creacion = Column(String(100), nullable=False)
    fecha_modificacion = Column(DateTime)
    usuario_modificacion = Column(String(100))

    __table_args__ = (
        CheckConstraint("partida >= 100", name="chk_partida_numero"),
        CheckConstraint("debe_total >= 0 AND haber_total >= 0", name="chk_debe_haber_positivos"),
        CheckConstraint("ABS(debe_total - haber_total) < 0.01", name="chk_partida_balanceada"),
        CheckConstraint("estado IN ('REGISTRADO', 'VALIDADO', 'ANULADO', 'RECTIFICADO')", name="chk_estado_asiento"),
        CheckConstraint("tipo_asiento IN ('APERTURA', 'OPERATIVO', 'AJUSTE', 'REGULARIZACION', 'CIERRE')", name="chk_tipo_asiento"),
        Index("idx_partida_fecha", "fecha"),
        Index("idx_partida_ejercicio", "codigo_ejercicio"),
        Index("idx_partida_estado", "estado"),
        Index("idx_partida_tipo", "tipo_asiento"),
    )

    moneda = relationship("MonedaModel", back_populates="asientos")
    detalles = relationship("PartidaDetalleModel", back_populates="encabezado", cascade="all, delete-orphan")
    auditorias = relationship("AuditoriaAsientoModel", back_populates="encabezado", cascade="all, delete-orphan")


class PartidaDetalleModel(Base):
    __tablename__ = "partida_detalle"

    codigo_detalle = Column(Integer, primary_key=True, autoincrement=True)
    codigo_partida = Column(Integer, ForeignKey("partida_encabezado.partida", ondelete="CASCADE"), nullable=False)
    linea_numero = Column(Integer, nullable=False)
    codigo_cuenta = Column(Integer, ForeignKey("cuenta.codigo", ondelete="RESTRICT"), nullable=False)
    codigo_cuenta_analitica = Column(Integer)
    debe = Column(Numeric(12, 2), nullable=False, default=0.00)
    haber = Column(Numeric(12, 2), nullable=False, default=0.00)
    saldo_deudor = Column(Numeric(12, 2), default=0.00)
    saldo_acreedor = Column(Numeric(12, 2), default=0.00)
    observaciones = Column(String(500))

    __table_args__ = (
        CheckConstraint("((debe >= 0 AND haber = 0) OR (debe = 0 AND haber >= 0))", name="chk_debe_haber"),
        UniqueConstraint("codigo_partida", "linea_numero", name="chk_linea_unica"),
        Index("idx_detalle_partida", "codigo_partida"),
        Index("idx_detalle_cuenta", "codigo_cuenta"),
    )

    encabezado = relationship("PartidaEncabezadoModel", back_populates="detalles")
    cuenta = relationship("CuentaModel", back_populates="detalles")


class AuditoriaAsientoModel(Base):
    __tablename__ = "auditoria_asiento"

    id_auditoria = Column(Integer, primary_key=True, autoincrement=True)
    codigo_partida = Column(Integer, ForeignKey("partida_encabezado.partida", ondelete="CASCADE"), nullable=False)
    tipo_operacion = Column(String(20), nullable=False)  # 'INSERT', 'UPDATE', 'DELETE'
    campo_modificado = Column(String(100))
    valor_anterior = Column(String(1000))
    valor_nuevo = Column(String(1000))
    usuario_responsable = Column(String(100), nullable=False)
    fecha_operacion = Column(DateTime, default=datetime.utcnow)
    ip_origen = Column(String(45))
    razon_cambio = Column(String(500))

    __table_args__ = (
        CheckConstraint("tipo_operacion IN ('INSERT', 'UPDATE', 'DELETE')", name="chk_tipo_op"),
        Index("idx_auditoria_partida", "codigo_partida"),
        Index("idx_auditoria_fecha", "fecha_operacion"),
        Index("idx_auditoria_usuario", "usuario_responsable"),
    )

    encabezado = relationship("PartidaEncabezadoModel", back_populates="auditorias")


class BloqueoPeriodoModel(Base):
    __tablename__ = "bloqueo_periodo"

    codigo_bloqueo = Column(Integer, primary_key=True, autoincrement=True)
    codigo_ejercicio = Column(Integer, nullable=False)
    mes = Column(Integer, nullable=False)
    estado_bloqueo = Column(String(20), default="ABIERTO")  # 'ABIERTO', 'PROVISIONAL', 'DEFINITIVO'
    fecha_bloqueo = Column(DateTime)
    usuario_bloqueo = Column(String(100))
    razon_bloqueo = Column(String(500))

    __table_args__ = (
        CheckConstraint("mes >= 1 AND mes <= 12", name="chk_mes_valido"),
        CheckConstraint("estado_bloqueo IN ('ABIERTO', 'PROVISIONAL', 'DEFINITIVO')", name="chk_estado_bloqueo"),
        UniqueConstraint("codigo_ejercicio", "mes", name="unique_periodo"),
    )


class UsuarioSistemaModel(Base):
    __tablename__ = "usuario_sistema"

    id_usuario = Column(Integer, primary_key=True, autoincrement=True)
    nombre_usuario = Column(String(100), nullable=False, unique=True)
    correo_electronico = Column(String(255), nullable=False, unique=True)
    rol = Column(String(50), nullable=False)  # 'ADMIN', 'CONTADOR', 'AUDITOR', 'JEFE_CONTABILIDAD', 'GERENTE'
    estado = Column(String(20), default="ACTIVO")
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_ultimo_acceso = Column(DateTime)
    password_hash = Column(String(255))

    __table_args__ = (
        CheckConstraint("rol IN ('ADMIN', 'CONTADOR', 'AUDITOR', 'JEFE_CONTABILIDAD', 'GERENTE')", name="chk_rol_valido"),
        CheckConstraint("estado IN ('ACTIVO', 'INACTIVO', 'BLOQUEADO')", name="chk_estado_usuario"),
    )


class EventoConciliacionModel(Base):
    __tablename__ = "evento_conciliacion"

    id_evento = Column(Integer, primary_key=True, autoincrement=True)
    fecha_evento = Column(DateTime, default=datetime.utcnow)
    tipo_evento = Column(String(50), nullable=False)  # 'CIERRE_MENSUAL', 'RECTIFICACION', 'TRANSFERENCIA', 'VALIDACION'
    codigo_partida = Column(Integer, ForeignKey("partida_encabezado.partida", ondelete="SET NULL"))
    descripcion_evento = Column(String(500))
    resultado = Column(String(20))  # 'EXITOSO', 'FALLIDO', 'PARCIAL'
    detalles_error = Column(String(1000))
    usuario_responsable = Column(String(100))

    __table_args__ = (
        CheckConstraint("resultado IN ('EXITOSO', 'FALLIDO', 'PARCIAL')", name="chk_resultado"),
        Index("idx_evento_tipo", "tipo_evento"),
        Index("idx_evento_fecha", "fecha_evento"),
    )


class PlantillaAsientoModel(Base):
    __tablename__ = "plantilla_asiento"

    id_plantilla = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String(50), nullable=False, unique=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(String(500))
    tipo_asiento = Column(String(20), nullable=False, default="OPERATIVO")
    concepto_formato = Column(String(300), nullable=False)  # admite {variables}, ej. "Factura {numero}"
    activo = Column(Boolean, default=True)

    lineas = relationship(
        "PlantillaLineaModel", back_populates="plantilla", cascade="all, delete-orphan",
        order_by="PlantillaLineaModel.orden",
    )

    __table_args__ = (
        CheckConstraint("tipo_asiento IN ('APERTURA', 'OPERATIVO', 'AJUSTE', 'REGULARIZACION', 'CIERRE')", name="chk_plantilla_tipo"),
    )


class PlantillaLineaModel(Base):
    __tablename__ = "plantilla_linea"

    id_linea = Column(Integer, primary_key=True, autoincrement=True)
    id_plantilla = Column(Integer, ForeignKey("plantilla_asiento.id_plantilla", ondelete="CASCADE"), nullable=False)
    orden = Column(Integer, nullable=False)
    codigo_cuenta = Column(Integer, ForeignKey("cuenta.codigo"), nullable=False)
    lado = Column(String(5), nullable=False)  # 'DEBE' | 'HABER'
    variable = Column(String(50), nullable=False)  # nombre del importe que se aporta al aplicar la plantilla
    glosa = Column(String(300))

    plantilla = relationship("PlantillaAsientoModel", back_populates="lineas")

    __table_args__ = (
        CheckConstraint("lado IN ('DEBE', 'HABER')", name="chk_linea_lado"),
        Index("idx_plantilla_linea_plantilla", "id_plantilla"),
    )


class AsientoRecurrenteModel(Base):
    __tablename__ = "asiento_recurrente"

    id_recurrente = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(200), nullable=False)
    id_plantilla = Column(Integer, ForeignKey("plantilla_asiento.id_plantilla"), nullable=False)
    valores = Column(JSON, nullable=False)  # {variable: importe} y textos para el concepto
    dia_del_mes = Column(Integer, nullable=False)  # 1..28
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date)
    activo = Column(Boolean, default=True)
    ultimo_periodo = Column(Integer)  # AAAAMM del último mes generado
    usuario_creacion = Column(String(100), nullable=False)

    plantilla = relationship("PlantillaAsientoModel")

    __table_args__ = (
        CheckConstraint("dia_del_mes >= 1 AND dia_del_mes <= 28", name="chk_recurrente_dia"),
    )


class EventoOutboxModel(Base):
    """Cola persistente de eventos de dominio pendientes de entregar (patrón outbox)."""
    __tablename__ = "evento_outbox"

    id_evento = Column(Integer, primary_key=True, autoincrement=True)
    tipo_evento = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    estado = Column(String(15), nullable=False, default="PENDIENTE")  # PENDIENTE | ENVIADO | FALLIDO
    intentos = Column(Integer, nullable=False, default=0)
    ultimo_error = Column(String(500))
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_envio = Column(DateTime)

    __table_args__ = (
        CheckConstraint("estado IN ('PENDIENTE', 'ENVIADO', 'FALLIDO')", name="chk_outbox_estado"),
        Index("idx_outbox_estado_id", "estado", "id_evento"),
    )
