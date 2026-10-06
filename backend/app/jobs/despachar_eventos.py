"""Entrega los eventos del outbox al bus (Redis Streams si REDIS_URL está definido).

    python -m app.jobs.despachar_eventos            # una pasada
    python -m app.jobs.despachar_eventos --loop 5   # continuo, cada 5 s
"""
import argparse
import logging
import time

from app.infrastructure.database import SessionLocal
from app.infrastructure.outbox import DespachadorOutbox, sink_desde_entorno


def pasada(sink) -> dict:
    db = SessionLocal()
    try:
        return DespachadorOutbox(db, sink).despachar()
    finally:
        db.close()


def main():
    logging.basicConfig(level=logging.INFO)
    ap = argparse.ArgumentParser()
    ap.add_argument("--loop", type=float, metavar="SEGUNDOS")
    args = ap.parse_args()
    sink = sink_desde_entorno()
    while True:
        try:
            r = pasada(sink)
            if any(r.values()):
                print(r, flush=True)
        except Exception:
            logging.exception("Fallo en la pasada del despachador")
        if not args.loop:
            break
        time.sleep(args.loop)


if __name__ == "__main__":
    main()
