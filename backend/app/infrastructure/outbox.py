import json
import logging
import os
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.infrastructure.models import EventoOutboxModel
from app.ports.event_publisher import EventPublisherPort

logger = logging.getLogger(__name__)

MAX_INTENTOS = int(os.getenv("OUTBOX_MAX_INTENTOS", "5"))


class OutboxEventPublisher(EventPublisherPort):
    """
    Guarda el evento en la tabla evento_outbox; un despachador aparte lo entrega al bus.
    Se invoca después de confirmar el asiento, por lo que no es atómico con él: si este insert fallara
    el asiento queda registrado y el fallo se loguea (el evento puede reconstruirse desde el asiento).
    """

    def __init__(self, db: Session):
        self.db = db

    def publicar(self, tipo_evento: str, payload: Dict[str, Any]) -> None:
        try:
            self.db.add(EventoOutboxModel(tipo_evento=tipo_evento, payload=payload))
            self.db.commit()
        except Exception:
            self.db.rollback()
            logger.exception("No se pudo guardar el evento %s en el outbox: %s", tipo_evento, payload)


class EventSink(ABC):
    @abstractmethod
    def enviar(self, evento: EventoOutboxModel) -> None:
        """Entrega el evento al destino; debe lanzar excepción si falla."""


class LogSink(EventSink):
    def enviar(self, evento: EventoOutboxModel) -> None:
        logger.info("evento %s %s", evento.tipo_evento, evento.payload)


class RedisStreamSink(EventSink):
    def __init__(self, url: str, stream: str = "eventos_contables"):
        import redis
        self.client = redis.Redis.from_url(url)
        self.stream = stream

    def enviar(self, evento: EventoOutboxModel) -> None:
        self.client.xadd(self.stream, {
            "id": str(evento.id_evento),  # permite al consumidor deduplicar (entrega al menos una vez)
            "tipo": evento.tipo_evento,
            "payload": json.dumps(evento.payload, default=str),
        })


def sink_desde_entorno() -> EventSink:
    url = os.getenv("REDIS_URL")
    return RedisStreamSink(url) if url else LogSink()


class DespachadorOutbox:
    """Entrega en orden los eventos pendientes. Entrega 'al menos una vez': los consumidores deben deduplicar por id."""

    def __init__(self, db: Session, sink: EventSink, max_intentos: int = MAX_INTENTOS):
        self.db = db
        self.sink = sink
        self.max_intentos = max_intentos

    def despachar(self, lote: int = 100) -> Dict[str, int]:
        q = (
            self.db.query(EventoOutboxModel)
            .filter(EventoOutboxModel.estado == "PENDIENTE")
            .order_by(EventoOutboxModel.id_evento)
            .limit(lote)
        )
        if self.db.bind.dialect.name == "postgresql":
            q = q.with_for_update(skip_locked=True)  # varios despachadores en paralelo sin pisarse
        enviados = fallidos = pendientes = 0
        for ev in q.all():
            try:
                self.sink.enviar(ev)
                ev.estado, ev.fecha_envio, ev.ultimo_error = "ENVIADO", datetime.utcnow(), None
                enviados += 1
            except Exception as e:
                ev.intentos += 1
                ev.ultimo_error = str(e)[:500]
                if ev.intentos >= self.max_intentos:
                    ev.estado = "FALLIDO"
                    fallidos += 1
                else:
                    pendientes += 1
            self.db.commit()
        return {"enviados": enviados, "fallidos": fallidos, "reintentar": pendientes}
