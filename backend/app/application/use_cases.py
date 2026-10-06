from decimal import Decimal
from datetime import date, datetime
from typing import List, Optional, Dict, Any

from app.domain.entities import (
    AsientoContable,
    DetalleAsiento,
    AuditoriaAsiento,
    BloqueoPeriodo,
    CuentaContable,
    EventoConciliacion,
)
from app.domain.exceptions import (
    PeriodoCerradoError,
    CuentaInvalidaError,
    ConcurrencyConflictError,
    RectificacionInvalidaError,
    PartidaDesbalanceadaError,
)
from app.domain.services import ValidadorPartidaDoble
from app.ports.repositories import (
    RepositorioAsientosPort,
    RepositorioCuentasPort,
    RepositorioPeriodosPort,
    RepositorioAuditoriaPort,
    RepositorioEventosPort,
)
from app.ports.event_publisher import EventPublisherPort
from app.application.dtos import (
    CrearAsientoInputDTO,
    RectificarAsientoInputDTO,
    AsientoResponseDTO,
    DetalleAsientoResponseDTO,
    HistorialCambioDTO,
    FacturaVentaInputDTO,
    BloqueoPeriodoInputDTO,
    BalanceComprobacionItemDTO,
)

class CrearAsientoUseCase:
    def __init__(
        self,
        repo_asientos: RepositorioAsientosPort,
        repo_cuentas: RepositorioCuentasPort,
        repo_periodos: RepositorioPeriodosPort,
        repo_auditoria: RepositorioAuditoriaPort,
        event_publisher: EventPublisherPort,
        validador: Optional[ValidadorPartidaDoble] = None,
    ):
        self.repo_asientos = repo_asientos
        self.repo_cuentas = repo_cuentas
        self.repo_periodos = repo_periodos
        self.repo_auditoria = repo_auditoria
        self.event_publisher = event_publisher
        self.validador = validador or ValidadorPartidaDoble()

    def ejecutar(self, dto: CrearAsientoInputDTO, estado_inicial: str = "VALIDADO") -> AsientoResponseDTO:
        codigo_ejercicio = dto.fecha.year
        mes = dto.fecha.month

        # 1. Validación de período abierto (Bloqueo pesimista)
        periodo = self.repo_periodos.obtener_periodo(codigo_ejercicio, mes, for_update=True)
        if periodo and periodo.estado_bloqueo in ("PROVISIONAL", "DEFINITIVO"):
            raise PeriodoCerradoError(
                f"El período {mes:02d}/{codigo_ejercicio} se encuentra {periodo.estado_bloqueo}. "
                "No se permiten nuevos registros contables."
            )

        # 2. Calcular totales y validar partida doble
        debe_total = sum(d.debe for d in dto.detalles)
        haber_total = sum(d.haber for d in dto.detalles)
        monto_moneda_origen = debe_total

        # Validar consistencia contable
        self.validador.validar({
            "debe_total": float(debe_total),
            "haber_total": float(haber_total),
            "detalles": [
                {"debe": float(d.debe), "haber": float(d.haber)}
                for d in dto.detalles
            ]
        })

        # 3. Validar existencia y estado de cuentas
        detalles_entidad: List[DetalleAsiento] = []
        for idx, d in enumerate(dto.detalles, start=1):
            cuenta = self.repo_cuentas.obtener_por_codigo(d.codigo_cuenta)
            if not cuenta:
                raise CuentaInvalidaError(f"La cuenta contable {d.codigo_cuenta} no existe en el catálogo PCGE.")
            if cuenta.estado != "ACTIVO":
                raise CuentaInvalidaError(f"La cuenta contable {d.codigo_cuenta} ({cuenta.nombre}) no está activa ({cuenta.estado}).")

            saldo_deudor = d.debe if d.debe > d.haber else Decimal("0.00")
            saldo_acreedor = d.haber if d.haber > d.debe else Decimal("0.00")

            detalles_entidad.append(
                DetalleAsiento(
                    linea_numero=idx,
                    codigo_cuenta=d.codigo_cuenta,
                    debe=d.debe,
                    haber=d.haber,
                    saldo_deudor=saldo_deudor,
                    saldo_acreedor=saldo_acreedor,
                    codigo_cuenta_analitica=d.codigo_cuenta_analitica,
                    observaciones=d.observaciones,
                    nombre_cuenta=cuenta.nombre,
                )
            )

        # 4. Asignar correlativo de partida
        siguiente_partida = self.repo_asientos.obtener_siguiente_partida()

        asiento = AsientoContable(
            partida=siguiente_partida,
            codigo_ejercicio=codigo_ejercicio,
            fecha=dto.fecha,
            concepto=dto.concepto,
            tipo_asiento=dto.tipo_asiento,
            codigo_moneda=dto.codigo_moneda,
            tipo_cambio=dto.tipo_cambio,
            monto_moneda_origen=monto_moneda_origen,
            debe_total=debe_total,
            haber_total=haber_total,
            usuario_creacion=dto.usuario or "sistema",
            detalles=detalles_entidad,
            estado=estado_inicial,
            observaciones=dto.observaciones,
            version=1,
            fecha_creacion=datetime.now(),
        )

        # 5. Guardar asiento de forma atómica
        partida_id = self.repo_asientos.guardar(asiento)

        # 6. Actualización de saldos de mayor (Mayorización)
        for d in detalles_entidad:
            # Determinamos si la cuenta incrementa por el Debe o Haber según su elemento
            cuenta = self.repo_cuentas.obtener_por_codigo(d.codigo_cuenta)
            # Elementos 1, 2, 3 (Activo) y 6 (Gastos): Naturaleza Deudora (+debe - haber)
            # Elementos 4 (Pasivo), 5 (Patrimonio) y 7 (Ingresos): Naturaleza Acreedora (+haber - debe)
            digito_inicial = int(str(d.codigo_cuenta)[0])
            if digito_inicial in (1, 2, 3, 6, 9):
                delta = d.debe - d.haber
            else:
                delta = d.haber - d.debe
            self.repo_cuentas.actualizar_saldo(d.codigo_cuenta, delta)

        # 7. Registrar auditoría completa
        self.repo_auditoria.registrar(
            AuditoriaAsiento(
                codigo_partida=partida_id,
                tipo_operacion="INSERT",
                usuario_responsable=dto.usuario or "sistema",
                campo_modificado="TODOS",
                valor_anterior=None,
                valor_nuevo=f"Asiento creado: Debe={debe_total}, Haber={haber_total}, Estado={estado_inicial}",
                fecha_operacion=datetime.now(),
                ip_origen="127.0.0.1",
                razon_cambio="Creación de nuevo asiento contable",
            )
        )

        # 8. Notificación fiscal / Publicación de evento
        self.event_publisher.publicar(
            "asiento_contabilizado",
            {
                "partida": partida_id,
                "tipo_asiento": dto.tipo_asiento,
                "fecha": dto.fecha.isoformat(),
                "debe_total": float(debe_total),
                "haber_total": float(haber_total),
                "status": "LISTO_PARA_SIRE"
            }
        )

        return AsientoResponseDTO(
            partida=partida_id,
            codigo_ejercicio=codigo_ejercicio,
            fecha=dto.fecha,
            concepto=dto.concepto,
            tipo_asiento=dto.tipo_asiento,
            codigo_moneda=dto.codigo_moneda,
            tipo_cambio=dto.tipo_cambio,
            monto_moneda_origen=monto_moneda_origen,
            debe_total=debe_total,
            haber_total=haber_total,
            estado=estado_inicial,
            version=1,
            observaciones=dto.observaciones,
            detalles=[
                DetalleAsientoResponseDTO(
                    codigo_detalle=d.codigo_detalle,
                    linea_numero=d.linea_numero,
                    codigo_cuenta=d.codigo_cuenta,
                    nombre_cuenta=d.nombre_cuenta,
                    debe=d.debe,
                    haber=d.haber,
                    saldo_deudor=d.saldo_deudor,
                    saldo_acreedor=d.saldo_acreedor,
                    observaciones=d.observaciones,
                )
                for d in detalles_entidad
            ],
            historial_cambios=[
                HistorialCambioDTO(
                    fecha_cambio=datetime.now(),
                    usuario=dto.usuario or "sistema",
                    cambio="Asiento registrado y validado",
                )
            ],
            url_recurso=f"/api/v1/asientos/{partida_id}",
        )


class ConsultarAsientoUseCase:
    def __init__(
        self,
        repo_asientos: RepositorioAsientosPort,
        repo_cuentas: RepositorioCuentasPort,
        repo_auditoria: RepositorioAuditoriaPort,
    ):
        self.repo_asientos = repo_asientos
        self.repo_cuentas = repo_cuentas
        self.repo_auditoria = repo_auditoria

    def ejecutar(self, partida: int) -> Optional[AsientoResponseDTO]:
        asiento = self.repo_asientos.obtener_por_id(partida)
        if not asiento:
            return None

        # Enriquecer nombres de cuentas
        detalles_dto = []
        for d in asiento.detalles:
            nombre = d.nombre_cuenta
            if not nombre:
                c = self.repo_cuentas.obtener_por_codigo(d.codigo_cuenta)
                nombre = c.nombre if c else f"Cuenta {d.codigo_cuenta}"
            detalles_dto.append(
                DetalleAsientoResponseDTO(
                    codigo_detalle=d.codigo_detalle,
                    linea_numero=d.linea_numero,
                    codigo_cuenta=d.codigo_cuenta,
                    nombre_cuenta=nombre,
                    debe=d.debe,
                    haber=d.haber,
                    saldo_deudor=d.saldo_deudor,
                    saldo_acreedor=d.saldo_acreedor,
                    observaciones=d.observaciones,
                )
            )

        # Historial de auditoría
        auditorias = self.repo_auditoria.obtener_por_partida(partida)
        historial = [
            HistorialCambioDTO(
                fecha_cambio=a.fecha_operacion,
                usuario=a.usuario_responsable,
                cambio=f"{a.tipo_operacion}: {a.campo_modificado or ''} {a.valor_nuevo or ''}",
                razon=a.razon_cambio,
            )
            for a in auditorias
        ]

        return AsientoResponseDTO(
            partida=asiento.partida,
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
            version=asiento.version,
            observaciones=asiento.observaciones,
            detalles=detalles_dto,
            historial_cambios=historial,
            url_recurso=f"/api/v1/asientos/{asiento.partida}",
        )


class RectificarAsientoUseCase:
    """
    Sección 4.1.3:
    Rectificar Asiento (No Borrar)
    1. Anular asiento original: estado = 'ANULADO'
    2. Crear nuevo asiento con estado = 'RECTIFICADO'
    3. Mantener trazabilidad completa en auditoría
    4. Actualizar saldos del Mayor automáticamente
    """
    def __init__(
        self,
        crear_use_case: CrearAsientoUseCase,
        repo_asientos: RepositorioAsientosPort,
        repo_cuentas: RepositorioCuentasPort,
        repo_auditoria: RepositorioAuditoriaPort,
    ):
        self.crear_use_case = crear_use_case
        self.repo_asientos = repo_asientos
        self.repo_cuentas = repo_cuentas
        self.repo_auditoria = repo_auditoria

    def ejecutar(self, partida_original: int, dto: RectificarAsientoInputDTO) -> AsientoResponseDTO:
        asiento_original = self.repo_asientos.obtener_por_id(partida_original)
        if not asiento_original:
            raise RectificacionInvalidaError(f"El asiento {partida_original} no existe.")

        if asiento_original.estado == "ANULADO":
            raise RectificacionInvalidaError(f"El asiento {partida_original} ya se encuentra anulado.")

        # 1. Reversar saldos del asiento original en el mayor
        for d in asiento_original.detalles:
            digito_inicial = int(str(d.codigo_cuenta)[0])
            if digito_inicial in (1, 2, 3, 6, 9):
                delta_reverso = -(d.debe - d.haber)
            else:
                delta_reverso = -(d.haber - d.debe)
            self.repo_cuentas.actualizar_saldo(d.codigo_cuenta, delta_reverso)

        # 2. Anular asiento original con control optimista de versión
        actualizado = self.repo_asientos.actualizar_estado(
            partida=partida_original,
            nuevo_estado="ANULADO",
            version_actual=asiento_original.version,
            usuario_modificacion=dto.usuario or "sistema",
        )
        if not actualizado:
            raise ConcurrencyConflictError(
                f"Conflicto de concurrencia al anular la partida {partida_original}. El registro fue modificado por otro proceso."
            )

        # 3. Registrar auditoría de anulación
        self.repo_auditoria.registrar(
            AuditoriaAsiento(
                codigo_partida=partida_original,
                tipo_operacion="UPDATE",
                usuario_responsable=dto.usuario or "sistema",
                campo_modificado="estado",
                valor_anterior=asiento_original.estado,
                valor_nuevo="ANULADO",
                fecha_operacion=datetime.now(),
                ip_origen="127.0.0.1",
                razon_cambio=f"Rectificado por nuevo asiento. Motivo: {dto.razon_rectificacion}",
            )
        )

        # 4. Crear nuevo asiento rectificado
        concepto_nuevo = dto.concepto_nuevo or f"Rectificación de Asiento #{partida_original}: {asiento_original.concepto}"
        crear_dto = CrearAsientoInputDTO(
            fecha=asiento_original.fecha,
            concepto=concepto_nuevo,
            tipo_asiento="AJUSTE",
            codigo_moneda=asiento_original.codigo_moneda,
            tipo_cambio=asiento_original.tipo_cambio,
            detalles=dto.detalles_nuevos,
            usuario=dto.usuario,
            observaciones=f"Rectifica partida #{partida_original}. Razón: {dto.razon_rectificacion}",
        )

        nuevo_asiento_resp = self.crear_use_case.ejecutar(crear_dto, estado_inicial="RECTIFICADO")

        # Vincular en auditoría el nuevo asiento con el anterior
        self.repo_auditoria.registrar(
            AuditoriaAsiento(
                codigo_partida=nuevo_asiento_resp.partida,
                tipo_operacion="UPDATE",
                usuario_responsable=dto.usuario or "sistema",
                campo_modificado="referencia_origen",
                valor_anterior=str(partida_original),
                valor_nuevo=str(nuevo_asiento_resp.partida),
                fecha_operacion=datetime.now(),
                ip_origen="127.0.0.1",
                razon_cambio=f"Asiento rectificatorio emitido en reemplazo de partida #{partida_original}",
            )
        )

        return nuevo_asiento_resp


class MapearFacturaPCGEUseCase:
    """
    Capítulo 5 del PDF: Flujo End-to-End
    Mapeo automático de Factura de Venta al Plan Contable General Empresarial (PCGE)
    - Debe: 1212 (Emitidas en Cartera) -> Total Venta
    - Haber: 40111 (IGV - Cuenta Propia) -> IGV
    - Haber: 70121 (Mercaderías - Venta Local) -> Base Imponible
    """
    def __init__(self, crear_asiento_use_case: CrearAsientoUseCase):
        self.crear_asiento_use_case = crear_asiento_use_case

    def ejecutar(self, factura: FacturaVentaInputDTO) -> AsientoResponseDTO:
        # Validar consistencia aritmética de la factura
        total_calculado = factura.base_imponible + factura.igv
        diferencia = abs(total_calculado - factura.total_venta)
        if diferencia > Decimal("0.02"):
            raise PartidaDesbalanceadaError(
                f"Error en factura: Base ({factura.base_imponible}) + IGV ({factura.igv}) = {total_calculado} "
                f"no coincide con Total Venta ({factura.total_venta})"
            )

        dto = CrearAsientoInputDTO(
            fecha=factura.fecha,
            concepto=f"Factura de venta {factura.numero_factura} - Cliente RUC {factura.cliente_ruc}",
            tipo_asiento="OPERATIVO",
            codigo_moneda=1,
            tipo_cambio=Decimal("1.0000"),
            detalles=[
                {
                    "codigo_cuenta": 1212,
                    "debe": factura.total_venta,
                    "haber": Decimal("0.00"),
                    "observaciones": f"Venta de mercaderías {factura.numero_factura}"
                },
                {
                    "codigo_cuenta": 40111,
                    "debe": Decimal("0.00"),
                    "haber": factura.igv,
                    "observaciones": "IGV generado en venta"
                },
                {
                    "codigo_cuenta": 70121,
                    "debe": Decimal("0.00"),
                    "haber": factura.base_imponible,
                    "observaciones": "Base imponible de venta de mercadería"
                }
            ],
            usuario=factura.usuario or "sistema_automatico",
            observaciones=f"Generado automáticamente por módulo de facturación comercial. Factura: {factura.numero_factura}",
        )

        return self.crear_asiento_use_case.ejecutar(dto)


class BloquearPeriodoUseCase:
    def __init__(self, repo_periodos: RepositorioPeriodosPort):
        self.repo_periodos = repo_periodos

    def ejecutar(self, dto: BloqueoPeriodoInputDTO) -> BloqueoPeriodo:
        periodo = BloqueoPeriodo(
            codigo_ejercicio=dto.codigo_ejercicio,
            mes=dto.mes,
            estado_bloqueo=dto.estado_bloqueo,
            fecha_bloqueo=datetime.now(),
            usuario_bloqueo=dto.usuario,
            razon_bloqueo=dto.razon_bloqueo,
        )
        return self.repo_periodos.bloquear_o_actualizar(periodo)


class GenerarBalanceComprobacionUseCase:
    def __init__(self, repo_asientos: RepositorioAsientosPort, repo_cuentas: RepositorioCuentasPort):
        self.repo_asientos = repo_asientos
        self.repo_cuentas = repo_cuentas

    def ejecutar(self, codigo_ejercicio: Optional[int] = None) -> List[BalanceComprobacionItemDTO]:
        asientos = self.repo_asientos.listar(codigo_ejercicio=codigo_ejercicio)
        cuentas = {c.codigo: c for c in self.repo_cuentas.listar_todas(solo_activas=False)}

        sumas_debe: Dict[int, Decimal] = {}
        sumas_haber: Dict[int, Decimal] = {}

        for asiento in asientos:
            if asiento.estado == "ANULADO":
                continue
            for det in asiento.detalles:
                cta = det.codigo_cuenta
                sumas_debe[cta] = sumas_debe.get(cta, Decimal("0.00")) + det.debe
                sumas_haber[cta] = sumas_haber.get(cta, Decimal("0.00")) + det.haber

        resultado: List[BalanceComprobacionItemDTO] = []
        for codigo, c in cuentas.items():
            debe = sumas_debe.get(codigo, Decimal("0.00"))
            haber = sumas_haber.get(codigo, Decimal("0.00"))
            if debe == 0 and haber == 0:
                continue

            elemento = int(str(codigo)[0])
            if debe >= haber:
                saldo_deudor = debe - haber
                saldo_acreedor = Decimal("0.00")
            else:
                saldo_deudor = Decimal("0.00")
                saldo_acreedor = haber - debe

            resultado.append(
                BalanceComprobacionItemDTO(
                    codigo_cuenta=codigo,
                    nombre_cuenta=c.nombre,
                    elemento=elemento,
                    suma_debe=debe,
                    suma_haber=haber,
                    saldo_deudor=saldo_deudor,
                    saldo_acreedor=saldo_acreedor,
                )
            )

        resultado.sort(key=lambda x: x.codigo_cuenta)
        return resultado
