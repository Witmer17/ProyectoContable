from decimal import Decimal
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.domain.entities import (
    AsientoContable,
    DetalleAsiento,
    CuentaContable,
    BloqueoPeriodo,
    AuditoriaAsiento,
    EventoConciliacion,
)
from app.ports.repositories import (
    RepositorioAsientosPort,
    RepositorioCuentasPort,
    RepositorioPeriodosPort,
    RepositorioAuditoriaPort,
    RepositorioEventosPort,
)
from app.infrastructure.models import (
    PartidaEncabezadoModel,
    PartidaDetalleModel,
    CuentaModel,
    BloqueoPeriodoModel,
    AuditoriaAsientoModel,
    EventoConciliacionModel,
)

class RepositorioAsientosSQL(RepositorioAsientosPort):
    def __init__(self, db: Session):
        self.db = db

    def obtener_siguiente_partida(self) -> int:
        max_partida = self.db.query(func.max(PartidaEncabezadoModel.partida)).scalar()
        if not max_partida or max_partida < 10000:
            return 10001
        return max_partida + 1

    def guardar(self, asiento: AsientoContable) -> int:
        partida_num = asiento.partida or self.obtener_siguiente_partida()

        encabezado_db = PartidaEncabezadoModel(
            partida=partida_num,
            codigo_ejercicio=asiento.codigo_ejercicio,
            fecha=asiento.fecha,
            concepto=asiento.concepto,
            tipo_asiento=asiento.tipo_asiento,
            codigo_moneda=asiento.codigo_moneda,
            tipo_cambio=asiento.tipo_cambio,
            monto_moneda_origen=asiento.monto_moneda_origen,
            debe_total=asiento.debe_total,
            haber_total=asiento.haber_total,
            estado=asiento.estado,
            observaciones=asiento.observaciones,
            version=asiento.version,
            fecha_creacion=asiento.fecha_creacion or datetime.utcnow(),
            usuario_creacion=asiento.usuario_creacion,
        )
        self.db.add(encabezado_db)
        self.db.flush()

        for d in asiento.detalles:
            detalle_db = PartidaDetalleModel(
                codigo_partida=partida_num,
                linea_numero=d.linea_numero,
                codigo_cuenta=d.codigo_cuenta,
                codigo_cuenta_analitica=d.codigo_cuenta_analitica,
                debe=d.debe,
                haber=d.haber,
                saldo_deudor=d.saldo_deudor,
                saldo_acreedor=d.saldo_acreedor,
                observaciones=d.observaciones,
            )
            self.db.add(detalle_db)

        self.db.commit()
        return partida_num

    def obtener_por_id(self, partida: int) -> Optional[AsientoContable]:
        enc = self.db.query(PartidaEncabezadoModel).filter(PartidaEncabezadoModel.partida == partida).first()
        if not enc:
            return None

        detalles_entidad = []
        for d in enc.detalles:
            nombre = d.cuenta.nombre if d.cuenta else None
            detalles_entidad.append(
                DetalleAsiento(
                    codigo_detalle=d.codigo_detalle,
                    codigo_partida=d.codigo_partida,
                    linea_numero=d.linea_numero,
                    codigo_cuenta=d.codigo_cuenta,
                    codigo_cuenta_analitica=d.codigo_cuenta_analitica,
                    debe=Decimal(str(d.debe)),
                    haber=Decimal(str(d.haber)),
                    saldo_deudor=Decimal(str(d.saldo_deudor or 0)),
                    saldo_acreedor=Decimal(str(d.saldo_acreedor or 0)),
                    observaciones=d.observaciones,
                    nombre_cuenta=nombre,
                )
            )

        return AsientoContable(
            partida=enc.partida,
            codigo_ejercicio=enc.codigo_ejercicio,
            fecha=enc.fecha,
            concepto=enc.concepto,
            tipo_asiento=enc.tipo_asiento,
            codigo_moneda=enc.codigo_moneda,
            tipo_cambio=Decimal(str(enc.tipo_cambio)),
            monto_moneda_origen=Decimal(str(enc.monto_moneda_origen)),
            debe_total=Decimal(str(enc.debe_total)),
            haber_total=Decimal(str(enc.haber_total)),
            estado=enc.estado,
            observaciones=enc.observaciones,
            version=enc.version,
            fecha_creacion=enc.fecha_creacion,
            usuario_creacion=enc.usuario_creacion,
            fecha_modificacion=enc.fecha_modificacion,
            usuario_modificacion=enc.usuario_modificacion,
            detalles=detalles_entidad,
        )

    def listar(
        self,
        codigo_ejercicio: Optional[int] = None,
        fecha_inicio: Optional[date] = None,
        fecha_fin: Optional[date] = None,
        estado: Optional[str] = None
    ) -> List[AsientoContable]:
        query = self.db.query(PartidaEncabezadoModel)
        if codigo_ejercicio:
            query = query.filter(PartidaEncabezadoModel.codigo_ejercicio == codigo_ejercicio)
        if fecha_inicio:
            query = query.filter(PartidaEncabezadoModel.fecha >= fecha_inicio)
        if fecha_fin:
            query = query.filter(PartidaEncabezadoModel.fecha <= fecha_fin)
        if estado:
            query = query.filter(PartidaEncabezadoModel.estado == estado)

        filas = query.order_by(PartidaEncabezadoModel.partida.desc()).all()
        resultado = []
        for enc in filas:
            detalles_entidad = [
                DetalleAsiento(
                    codigo_detalle=d.codigo_detalle,
                    codigo_partida=d.codigo_partida,
                    linea_numero=d.linea_numero,
                    codigo_cuenta=d.codigo_cuenta,
                    codigo_cuenta_analitica=d.codigo_cuenta_analitica,
                    debe=Decimal(str(d.debe)),
                    haber=Decimal(str(d.haber)),
                    saldo_deudor=Decimal(str(d.saldo_deudor or 0)),
                    saldo_acreedor=Decimal(str(d.saldo_acreedor or 0)),
                    observaciones=d.observaciones,
                    nombre_cuenta=d.cuenta.nombre if d.cuenta else None,
                )
                for d in enc.detalles
            ]
            resultado.append(
                AsientoContable(
                    partida=enc.partida,
                    codigo_ejercicio=enc.codigo_ejercicio,
                    fecha=enc.fecha,
                    concepto=enc.concepto,
                    tipo_asiento=enc.tipo_asiento,
                    codigo_moneda=enc.codigo_moneda,
                    tipo_cambio=Decimal(str(enc.tipo_cambio)),
                    monto_moneda_origen=Decimal(str(enc.monto_moneda_origen)),
                    debe_total=Decimal(str(enc.debe_total)),
                    haber_total=Decimal(str(enc.haber_total)),
                    estado=enc.estado,
                    observaciones=enc.observaciones,
                    version=enc.version,
                    fecha_creacion=enc.fecha_creacion,
                    usuario_creacion=enc.usuario_creacion,
                    detalles=detalles_entidad,
                )
            )
        return resultado

    def actualizar_estado(
        self,
        partida: int,
        nuevo_estado: str,
        version_actual: int,
        usuario_modificacion: str
    ) -> bool:
        """Control de concurrencia optimista mediante columna version."""
        rows_affected = self.db.query(PartidaEncabezadoModel).filter(
            PartidaEncabezadoModel.partida == partida,
            PartidaEncabezadoModel.version == version_actual
        ).update(
            {
                PartidaEncabezadoModel.estado: nuevo_estado,
                PartidaEncabezadoModel.version: version_actual + 1,
                PartidaEncabezadoModel.fecha_modificacion: datetime.utcnow(),
                PartidaEncabezadoModel.usuario_modificacion: usuario_modificacion,
            },
            synchronize_session="fetch"
        )
        self.db.commit()
        return rows_affected > 0


class RepositorioCuentasSQL(RepositorioCuentasPort):
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_codigo(self, codigo: int) -> Optional[CuentaContable]:
        c = self.db.query(CuentaModel).filter(CuentaModel.codigo == codigo).first()
        if not c:
            return None
        return CuentaContable(
            codigo=c.codigo,
            codigo_tipo=c.codigo_tipo,
            codigo_nivel=c.codigo_nivel,
            nombre=c.nombre,
            descripcion=c.descripcion,
            es_auxiliar=c.es_auxiliar,
            requiere_analitica=c.requiere_analitica,
            estado=c.estado,
            saldo_mayor=Decimal(str(c.saldo_mayor or 0)),
            fecha_creacion=c.fecha_creacion,
        )

    def listar_todas(self, solo_activas: bool = True) -> List[CuentaContable]:
        query = self.db.query(CuentaModel)
        if solo_activas:
            query = query.filter(CuentaModel.estado == "ACTIVO")
        filas = query.order_by(CuentaModel.codigo.asc()).all()
        return [
            CuentaContable(
                codigo=c.codigo,
                codigo_tipo=c.codigo_tipo,
                codigo_nivel=c.codigo_nivel,
                nombre=c.nombre,
                descripcion=c.descripcion,
                es_auxiliar=c.es_auxiliar,
                requiere_analitica=c.requiere_analitica,
                estado=c.estado,
                saldo_mayor=Decimal(str(c.saldo_mayor or 0)),
                fecha_creacion=c.fecha_creacion,
            )
            for c in filas
        ]

    def actualizar_saldo(self, codigo: int, delta_saldo: Decimal) -> None:
        c = self.db.query(CuentaModel).filter(CuentaModel.codigo == codigo).first()
        if c:
            saldo_actual = Decimal(str(c.saldo_mayor or 0))
            c.saldo_mayor = saldo_actual + delta_saldo
            self.db.commit()

    def guardar(self, cuenta: CuentaContable) -> None:
        c = self.db.query(CuentaModel).filter(CuentaModel.codigo == cuenta.codigo).first()
        if not c:
            c = CuentaModel(
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
            self.db.add(c)
        else:
            c.nombre = cuenta.nombre
            c.estado = cuenta.estado
            c.saldo_mayor = cuenta.saldo_mayor
        self.db.commit()


class RepositorioPeriodosSQL(RepositorioPeriodosPort):
    def __init__(self, db: Session):
        self.db = db

    def obtener_periodo(self, codigo_ejercicio: int, mes: int, for_update: bool = False) -> Optional[BloqueoPeriodo]:
        query = self.db.query(BloqueoPeriodoModel).filter(
            BloqueoPeriodoModel.codigo_ejercicio == codigo_ejercicio,
            BloqueoPeriodoModel.mes == mes
        )
        if for_update and self.db.bind.dialect.name == "postgresql":
            query = query.with_for_update()

        bp = query.first()
        if not bp:
            return None
        return BloqueoPeriodo(
            codigo_bloqueo=bp.codigo_bloqueo,
            codigo_ejercicio=bp.codigo_ejercicio,
            mes=bp.mes,
            estado_bloqueo=bp.estado_bloqueo,
            fecha_bloqueo=bp.fecha_bloqueo,
            usuario_bloqueo=bp.usuario_bloqueo,
            razon_bloqueo=bp.razon_bloqueo,
        )

    def bloquear_o_actualizar(self, periodo: BloqueoPeriodo) -> BloqueoPeriodo:
        bp = self.db.query(BloqueoPeriodoModel).filter(
            BloqueoPeriodoModel.codigo_ejercicio == periodo.codigo_ejercicio,
            BloqueoPeriodoModel.mes == periodo.mes
        ).first()

        if not bp:
            bp = BloqueoPeriodoModel(
                codigo_ejercicio=periodo.codigo_ejercicio,
                mes=periodo.mes,
                estado_bloqueo=periodo.estado_bloqueo,
                fecha_bloqueo=periodo.fecha_bloqueo or datetime.utcnow(),
                usuario_bloqueo=periodo.usuario_bloqueo,
                razon_bloqueo=periodo.razon_bloqueo,
            )
            self.db.add(bp)
        else:
            bp.estado_bloqueo = periodo.estado_bloqueo
            bp.fecha_bloqueo = periodo.fecha_bloqueo or datetime.utcnow()
            bp.usuario_bloqueo = periodo.usuario_bloqueo
            bp.razon_bloqueo = periodo.razon_bloqueo

        self.db.commit()
        self.db.refresh(bp)
        return BloqueoPeriodo(
            codigo_bloqueo=bp.codigo_bloqueo,
            codigo_ejercicio=bp.codigo_ejercicio,
            mes=bp.mes,
            estado_bloqueo=bp.estado_bloqueo,
            fecha_bloqueo=bp.fecha_bloqueo,
            usuario_bloqueo=bp.usuario_bloqueo,
            razon_bloqueo=bp.razon_bloqueo,
        )

    def listar_periodos(self, codigo_ejercicio: Optional[int] = None) -> List[BloqueoPeriodo]:
        query = self.db.query(BloqueoPeriodoModel)
        if codigo_ejercicio:
            query = query.filter(BloqueoPeriodoModel.codigo_ejercicio == codigo_ejercicio)
        filas = query.order_by(BloqueoPeriodoModel.codigo_ejercicio.asc(), BloqueoPeriodoModel.mes.asc()).all()
        return [
            BloqueoPeriodo(
                codigo_bloqueo=bp.codigo_bloqueo,
                codigo_ejercicio=bp.codigo_ejercicio,
                mes=bp.mes,
                estado_bloqueo=bp.estado_bloqueo,
                fecha_bloqueo=bp.fecha_bloqueo,
                usuario_bloqueo=bp.usuario_bloqueo,
                razon_bloqueo=bp.razon_bloqueo,
            )
            for bp in filas
        ]


class RepositorioAuditoriaSQL(RepositorioAuditoriaPort):
    def __init__(self, db: Session):
        self.db = db

    def registrar(self, auditoria: AuditoriaAsiento) -> int:
        a = AuditoriaAsientoModel(
            codigo_partida=auditoria.codigo_partida,
            tipo_operacion=auditoria.tipo_operacion,
            campo_modificado=auditoria.campo_modificado,
            valor_anterior=auditoria.valor_anterior,
            valor_nuevo=auditoria.valor_nuevo,
            usuario_responsable=auditoria.usuario_responsable,
            fecha_operacion=auditoria.fecha_operacion or datetime.utcnow(),
            ip_origen=auditoria.ip_origen,
            razon_cambio=auditoria.razon_cambio,
        )
        self.db.add(a)
        self.db.commit()
        self.db.refresh(a)
        return a.id_auditoria

    def obtener_por_partida(self, codigo_partida: int) -> List[AuditoriaAsiento]:
        filas = self.db.query(AuditoriaAsientoModel).filter(
            AuditoriaAsientoModel.codigo_partida == codigo_partida
        ).order_by(AuditoriaAsientoModel.fecha_operacion.asc()).all()

        return [
            AuditoriaAsiento(
                id_auditoria=f.id_auditoria,
                codigo_partida=f.codigo_partida,
                tipo_operacion=f.tipo_operacion,
                campo_modificado=f.campo_modificado,
                valor_anterior=f.valor_anterior,
                valor_nuevo=f.valor_nuevo,
                usuario_responsable=f.usuario_responsable,
                fecha_operacion=f.fecha_operacion,
                ip_origen=f.ip_origen,
                razon_cambio=f.razon_cambio,
            )
            for f in filas
        ]


class RepositorioEventosSQL(RepositorioEventosPort):
    def __init__(self, db: Session):
        self.db = db

    def registrar_evento(self, evento: EventoConciliacion) -> int:
        e = EventoConciliacionModel(
            fecha_evento=evento.fecha_evento or datetime.utcnow(),
            tipo_evento=evento.tipo_evento,
            codigo_partida=evento.codigo_partida,
            descripcion_evento=evento.descripcion_evento,
            resultado=evento.resultado,
            detalles_error=evento.detalles_error,
            usuario_responsable=evento.usuario_responsable,
        )
        self.db.add(e)
        self.db.commit()
        self.db.refresh(e)
        return e.id_evento

    def listar_eventos(self, limite: int = 50) -> List[EventoConciliacion]:
        filas = self.db.query(EventoConciliacionModel).order_by(
            EventoConciliacionModel.fecha_evento.desc()
        ).limit(limite).all()

        return [
            EventoConciliacion(
                id_evento=f.id_evento,
                fecha_evento=f.fecha_evento,
                tipo_evento=f.tipo_evento,
                codigo_partida=f.codigo_partida,
                descripcion_evento=f.descripcion_evento,
                resultado=f.resultado,
                detalles_error=f.detalles_error,
                usuario_responsable=f.usuario_responsable,
            )
            for f in filas
        ]
