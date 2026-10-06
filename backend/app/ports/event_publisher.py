from abc import ABC, abstractmethod
from typing import Dict, Any

class EventPublisherPort(ABC):
    @abstractmethod
    def publicar(self, tipo_evento: str, payload: Dict[str, Any]) -> None:
        """Publica un evento del dominio contable para integración asíncrona o fiscal (Kafka/SIRE)."""
        pass

class InMemoryEventPublisher(EventPublisherPort):
    def __init__(self):
        self.eventos = []

    def publicar(self, tipo_evento: str, payload: Dict[str, Any]) -> None:
        evento = {"tipo_evento": tipo_evento, "payload": payload}
        self.eventos.append(evento)
