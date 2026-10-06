"""Genera los asientos recurrentes pendientes. Pensado para cron / scheduler:

    python -m app.jobs.ejecutar_recurrentes [AAAA-MM-DD]
"""
import sys
from datetime import date

from app.application.plantillas import AplicarPlantillaUseCase, EjecutarRecurrentesUseCase, RepositorioPlantillasSQL
from app.application.use_cases import CrearAsientoUseCase
from app.infrastructure.database import SessionLocal
from app.infrastructure.outbox import OutboxEventPublisher
from app.infrastructure.repositories_sql import (
    RepositorioAsientosSQL,
    RepositorioAuditoriaSQL,
    RepositorioCuentasSQL,
    RepositorioPeriodosSQL,
)


def main(fecha_corte: date) -> int:
    db = SessionLocal()
    try:
        crear = CrearAsientoUseCase(
            RepositorioAsientosSQL(db), RepositorioCuentasSQL(db), RepositorioPeriodosSQL(db),
            RepositorioAuditoriaSQL(db), OutboxEventPublisher(db),
        )
        repo = RepositorioPlantillasSQL(db)
        resultados = EjecutarRecurrentesUseCase(repo, AplicarPlantillaUseCase(repo, crear)).ejecutar(fecha_corte)
    finally:
        db.close()
    for r in resultados:
        estado = f"partida {r.partida}" if r.ok else f"ERROR: {r.error}"
        print(f"[{r.periodo}] {r.nombre}: {estado}")
    print(f"{sum(r.ok for r in resultados)} generados, {sum(not r.ok for r in resultados)} con error.")
    return 1 if any(not r.ok for r in resultados) else 0


if __name__ == "__main__":
    corte = date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else date.today()
    sys.exit(main(corte))
