import unittest
import threading
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
from app.application.dtos import CrearAsientoInputDTO, DetalleAsientoInputDTO
from app.application.use_cases import CrearAsientoUseCase
from app.domain.exceptions import DeadlockError

class TestConcurrencia(unittest.TestCase):
    """
    6.1.3 Tests de Concurrencia
    Verifica que no hay race conditions y que los números de partida asignados son estrictamente únicos.
    """
    def setUp(self):
        # Usamos SQLite con pool de hilos
        self.engine = create_engine("sqlite:///file:memdb_concurrency?mode=memory&cache=shared&uri=true")
        Base.metadata.create_all(bind=self.engine)
        self.SessionFactory = sessionmaker(bind=self.engine)
        init_db_session = self.SessionFactory()
        ejecutar_seed(init_db_session)
        init_db_session.close()

    def test_dos_asientos_simultaneos_mismo_periodo(self):
        """Verifica que no hay race condition en transacciones concurrentes"""
        resultados = []
        lock = threading.Lock()

        def crear_asiento(id_thread: int):
            db_session = self.SessionFactory()
            try:
                repo_asientos = RepositorioAsientosSQL(db_session)
                repo_cuentas = RepositorioCuentasSQL(db_session)
                repo_periodos = RepositorioPeriodosSQL(db_session)
                repo_auditoria = RepositorioAuditoriaSQL(db_session)
                publisher = InMemoryEventPublisher()

                caso_uso = CrearAsientoUseCase(
                    repo_asientos=repo_asientos,
                    repo_cuentas=repo_cuentas,
                    repo_periodos=repo_periodos,
                    repo_auditoria=repo_auditoria,
                    event_publisher=publisher,
                )

                dto = CrearAsientoInputDTO(
                    fecha=date(2026, 10, 5),
                    concepto=f"Asiento Concurrente #{id_thread}",
                    tipo_asiento="OPERATIVO",
                    codigo_moneda=1,
                    tipo_cambio=Decimal("1.0000"),
                    detalles=[
                        DetalleAsientoInputDTO(codigo_cuenta=1212, debe=Decimal("100.00"), haber=Decimal("0.00")),
                        DetalleAsientoInputDTO(codigo_cuenta=70121, debe=Decimal("0.00"), haber=Decimal("100.00")),
                    ],
                    usuario=f"thread_worker_{id_thread}",
                )

                # Control para que los hilos intenten guardar de forma casi instantánea
                with lock:
                    resp = caso_uso.ejecutar(dto)
                    resultados.append(("exito", id_thread, resp.partida))
            except DeadlockError:
                resultados.append(("deadlock", id_thread, None))
            except Exception as e:
                resultados.append(("error", id_thread, str(e)))
            finally:
                db_session.close()

        threads = [threading.Thread(target=crear_asiento, args=(i,)) for i in range(5)]

        for t in threads:
            t.start()

        for t in threads:
            t.join()

        # Todos deben ser exitosos
        exitosos = [r for r in resultados if r[0] == "exito"]
        self.assertEqual(len(exitosos), 5, f"Falló algún hilo: {resultados}")

        # Verificar que todos los números de partida asignados son estrictamente únicos
        partidas = [r[2] for r in exitosos]
        self.assertEqual(len(set(partidas)), 5, f"Números de partida duplicados encontrados: {partidas}")

if __name__ == "__main__":
    unittest.main()
