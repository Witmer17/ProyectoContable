import unittest
from datetime import date
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.infrastructure.models import Base
from app.infrastructure.seed_data import ejecutar_seed
from app.infrastructure.repositories_sql import (
    RepositorioAsientosSQL,
    RepositorioCuentasSQL,
    RepositorioPeriodosSQL,
    RepositorioAuditoriaSQL,
)
from app.ports.event_publisher import InMemoryEventPublisher
from app.application.dtos import (
    CrearAsientoInputDTO,
    RectificarAsientoInputDTO,
    DetalleAsientoInputDTO,
    BloqueoPeriodoInputDTO,
)
from app.application.use_cases import (
    CrearAsientoUseCase,
    ConsultarAsientoUseCase,
    RectificarAsientoUseCase,
    BloquearPeriodoUseCase,
)
from app.application.ple_service import PLEService
from app.domain.exceptions import PeriodoCerradoError

class TestCrearAsientoIntegration(unittest.TestCase):
    """
    6.1.2 Integration Tests conforme a la especificación del PDF
    """
    def setUp(self):
        # Base de datos en memoria para pruebas de integración aisladas
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        Session = sessionmaker(bind=self.engine)
        self.db = Session()

        # Cargar datos iniciales (PCGE, Periodos, etc.)
        ejecutar_seed(self.db)

        self.repo_asientos = RepositorioAsientosSQL(self.db)
        self.repo_cuentas = RepositorioCuentasSQL(self.db)
        self.repo_periodos = RepositorioPeriodosSQL(self.db)
        self.repo_auditoria = RepositorioAuditoriaSQL(self.db)
        self.event_publisher = InMemoryEventPublisher()

        self.crear_use_case = CrearAsientoUseCase(
            repo_asientos=self.repo_asientos,
            repo_cuentas=self.repo_cuentas,
            repo_periodos=self.repo_periodos,
            repo_auditoria=self.repo_auditoria,
            event_publisher=self.event_publisher,
        )
        self.consultar_use_case = ConsultarAsientoUseCase(
            repo_asientos=self.repo_asientos,
            repo_cuentas=self.repo_cuentas,
            repo_auditoria=self.repo_auditoria,
        )
        self.rectificar_use_case = RectificarAsientoUseCase(
            crear_use_case=self.crear_use_case,
            repo_asientos=self.repo_asientos,
            repo_cuentas=self.repo_cuentas,
            repo_auditoria=self.repo_auditoria,
        )
        self.bloquear_use_case = BloquearPeriodoUseCase(
            repo_periodos=self.repo_periodos
        )

    def tearDown(self):
        self.db.close()

    def test_crear_asiento_venta_completo(self):
        """Prueba flujo completo de creación de asiento de venta (Capítulo 5 y 6.1.2)"""
        # 1. Verificar estado inicial
        cuenta_1212_antes = self.repo_cuentas.obtener_por_codigo(1212)
        saldo_1212_antes = cuenta_1212_antes.saldo_mayor

        # 2. Ejecutar caso de uso
        dto = CrearAsientoInputDTO(
            fecha=date(2026, 10, 5),
            concepto="Factura de venta FV-001-000001",
            tipo_asiento="OPERATIVO",
            codigo_moneda=1,
            tipo_cambio=Decimal("1.0000"),
            detalles=[
                DetalleAsientoInputDTO(codigo_cuenta=1212, debe=Decimal("1000.00"), haber=Decimal("0.00"), observaciones="Venta"),
                DetalleAsientoInputDTO(codigo_cuenta=70121, debe=Decimal("0.00"), haber=Decimal("847.46"), observaciones="Base"),
                DetalleAsientoInputDTO(codigo_cuenta=40111, debe=Decimal("0.00"), haber=Decimal("152.54"), observaciones="IGV"),
            ],
            usuario="contador_juana"
        )
        respuesta = self.crear_use_case.ejecutar(dto)

        # 3. Verificar resultado
        self.assertEqual(respuesta.estado, "VALIDADO")
        self.assertTrue(respuesta.partida >= 100)

        # 4. Verificar actualización de Mayor (Mayorización automática)
        cuenta_1212_despues = self.repo_cuentas.obtener_por_codigo(1212)
        self.assertEqual(cuenta_1212_despues.saldo_mayor, saldo_1212_antes + Decimal("1000.00"))

        # 5. Verificar auditoría
        auditorias = self.repo_auditoria.obtener_por_partida(respuesta.partida)
        self.assertEqual(len(auditorias), 1)
        self.assertEqual(auditorias[0].tipo_operacion, "INSERT")
        self.assertEqual(auditorias[0].usuario_responsable, "contador_juana")

    def test_rectificar_asiento_no_borra_y_mantiene_trazabilidad(self):
        """Verifica que la rectificación no borra registros sino que anula el previo y crea el nuevo (4.1.3)"""
        # Crear asiento inicial con error de imputación
        dto_original = CrearAsientoInputDTO(
            fecha=date(2026, 10, 5),
            concepto="Venta original con error",
            tipo_asiento="OPERATIVO",
            codigo_moneda=1,
            tipo_cambio=Decimal("1.0000"),
            detalles=[
                DetalleAsientoInputDTO(codigo_cuenta=1212, debe=Decimal("500.00"), haber=Decimal("0.00")),
                DetalleAsientoInputDTO(codigo_cuenta=70121, debe=Decimal("0.00"), haber=Decimal("500.00")),
            ],
            usuario="contador_juana"
        )
        asiento_original = self.crear_use_case.ejecutar(dto_original)

        # Rectificar hacia la cuenta correcta 1213 (En cobranza)
        dto_rectificar = RectificarAsientoInputDTO(
            razon_rectificacion="Error en cuenta de imputación, debe ser 1213",
            detalles_nuevos=[
                DetalleAsientoInputDTO(codigo_cuenta=1213, debe=Decimal("500.00"), haber=Decimal("0.00")),
                DetalleAsientoInputDTO(codigo_cuenta=70121, debe=Decimal("0.00"), haber=Decimal("500.00")),
            ],
            usuario="auditor_carlos"
        )
        asiento_rectificado = self.rectificar_use_case.ejecutar(asiento_original.partida, dto_rectificar)

        # Comprobar que el original sigue existiendo pero en estado ANULADO
        original_db = self.consultar_use_case.ejecutar(asiento_original.partida)
        self.assertEqual(original_db.estado, "ANULADO")

        # Comprobar que el nuevo asiento tiene estado RECTIFICADO
        self.assertEqual(asiento_rectificado.estado, "RECTIFICADO")
        self.assertNotEqual(asiento_rectificado.partida, asiento_original.partida)

    def test_periodo_cerrado_rechaza_nuevos_asientos(self):
        """Verifica el bloqueo de períodos fiscales (SUNAT)"""
        # Bloquear período de octubre (mes 10)
        self.bloquear_use_case.ejecutar(
            BloqueoPeriodoInputDTO(
                codigo_ejercicio=2026,
                mes=10,
                estado_bloqueo="DEFINITIVO",
                razon_bloqueo="Cierre contable mensual efectuado",
                usuario="gerente_ana"
            )
        )

        dto = CrearAsientoInputDTO(
            fecha=date(2026, 10, 10),
            concepto="Intento de registro en mes cerrado",
            tipo_asiento="OPERATIVO",
            detalles=[
                DetalleAsientoInputDTO(codigo_cuenta=1212, debe=Decimal("100.00"), haber=Decimal("0.00")),
                DetalleAsientoInputDTO(codigo_cuenta=70121, debe=Decimal("0.00"), haber=Decimal("100.00")),
            ]
        )
        with self.assertRaises(PeriodoCerradoError):
            self.crear_use_case.ejecutar(dto)

    def test_exportacion_ple_diario_5_1(self):
        """Verifica la generación del archivo plano oficial SUNAT PLE 5.1"""
        dto = CrearAsientoInputDTO(
            fecha=date(2026, 10, 5),
            concepto="Factura FV-001",
            tipo_asiento="OPERATIVO",
            detalles=[
                DetalleAsientoInputDTO(codigo_cuenta=1212, debe=Decimal("1000.00"), haber=Decimal("0.00")),
                DetalleAsientoInputDTO(codigo_cuenta=70121, debe=Decimal("0.00"), haber=Decimal("1000.00")),
            ]
        )
        asiento = self.crear_use_case.ejecutar(dto)
        asientos = [self.repo_asientos.obtener_por_id(asiento.partida)]

        ple_txt = PLEService.generar_libro_diario_5_1(asientos, ruc="20123456789", ejercicio=2026, mes=10)
        self.assertIn("20261000", ple_txt)
        self.assertIn("1212", ple_txt)
        self.assertIn("70121", ple_txt)
        self.assertIn("1000.00", ple_txt)
        self.assertTrue(ple_txt.endswith("|"))

if __name__ == "__main__":
    unittest.main()
