from abc import ABC, abstractmethod
from typing import List, Optional
from decimal import Decimal
from datetime import date
from app.domain.entities import (
    AsientoContable,
    CuentaContable,
    BloqueoPeriodo,
    AuditoriaAsiento,
    EventoConciliacion,
)

class RepositorioAsientosPort(ABC):
    @abstractmethod
    def guardar(self, asiento: AsientoContable) -> int:
        pass

    @abstractmethod
    def obtener_por_id(self, partida: int) -> Optional[AsientoContable]:
        pass

    @abstractmethod
    def listar(
        self,
        codigo_ejercicio: Optional[int] = None,
        fecha_inicio: Optional[date] = None,
        fecha_fin: Optional[date] = None,
        estado: Optional[str] = None
    ) -> List[AsientoContable]:
        pass

    @abstractmethod
    def actualizar_estado(
        self,
        partida: int,
        nuevo_estado: str,
        version_actual: int,
        usuario_modificacion: str
    ) -> bool:
        pass

    @abstractmethod
    def obtener_siguiente_partida(self) -> int:
        pass


class RepositorioCuentasPort(ABC):
    @abstractmethod
    def obtener_por_codigo(self, codigo: int) -> Optional[CuentaContable]:
        pass

    @abstractmethod
    def listar_todas(self, solo_activas: bool = True) -> List[CuentaContable]:
        pass

    @abstractmethod
    def actualizar_saldo(self, codigo: int, delta_saldo: Decimal) -> None:
        pass

    @abstractmethod
    def guardar(self, cuenta: CuentaContable) -> None:
        pass


class RepositorioPeriodosPort(ABC):
    @abstractmethod
    def obtener_periodo(self, codigo_ejercicio: int, mes: int, for_update: bool = False) -> Optional[BloqueoPeriodo]:
        pass

    @abstractmethod
    def bloquear_o_actualizar(self, periodo: BloqueoPeriodo) -> BloqueoPeriodo:
        pass

    @abstractmethod
    def listar_periodos(self, codigo_ejercicio: Optional[int] = None) -> List[BloqueoPeriodo]:
        pass


class RepositorioAuditoriaPort(ABC):
    @abstractmethod
    def registrar(self, auditoria: AuditoriaAsiento) -> int:
        pass

    @abstractmethod
    def obtener_por_partida(self, codigo_partida: int) -> List[AuditoriaAsiento]:
        pass


class RepositorioEventosPort(ABC):
    @abstractmethod
    def registrar_evento(self, evento: EventoConciliacion) -> int:
        pass

    @abstractmethod
    def listar_eventos(self, limite: int = 50) -> List[EventoConciliacion]:
        pass
