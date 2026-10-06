import calendar
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.application.dtos import AsientoResponseDTO, CrearAsientoInputDTO, DetalleAsientoInputDTO
from app.application.use_cases import CrearAsientoUseCase
from app.domain.exceptions import CuentaInvalidaError
from app.infrastructure.models import (
    AsientoRecurrenteModel,
    CuentaModel,
    PlantillaAsientoModel,
    PlantillaLineaModel,
)


class PlantillaNoEncontradaError(Exception):
    pass


class PlantillaInvalidaError(Exception):
    pass


# ---------- DTOs ----------

class LineaPlantillaDTO(BaseModel):
    codigo_cuenta: int
    lado: str = Field(pattern="^(DEBE|HABER)$")
    variable: str = Field(min_length=1, max_length=50)
    glosa: Optional[str] = None


class PlantillaInputDTO(BaseModel):
    codigo: str = Field(min_length=2, max_length=50, pattern="^[A-Z0-9_]+$")
    nombre: str
    descripcion: Optional[str] = None
    tipo_asiento: str = "OPERATIVO"
    concepto_formato: str
    lineas: List[LineaPlantillaDTO] = Field(min_length=2)


class PlantillaResponseDTO(PlantillaInputDTO):
    id_plantilla: int
    activo: bool
    variables: List[str]


class AplicarPlantillaDTO(BaseModel):
    fecha: date
    valores: Dict[str, Any]  # importes por variable + textos usados en concepto_formato
    codigo_moneda: int = 1
    tipo_cambio: Decimal = Decimal("1.0000")
    observaciones: Optional[str] = None


class RecurrenteInputDTO(BaseModel):
    nombre: str
    codigo_plantilla: str
    valores: Dict[str, Any]
    dia_del_mes: int = Field(ge=1, le=28)
    fecha_inicio: date
    fecha_fin: Optional[date] = None


class RecurrenteResponseDTO(BaseModel):
    id_recurrente: int
    nombre: str
    codigo_plantilla: str
    valores: Dict[str, Any]
    dia_del_mes: int
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    activo: bool
    ultimo_periodo: Optional[int] = None


class ResultadoRecurrenteDTO(BaseModel):
    id_recurrente: int
    nombre: str
    periodo: int
    ok: bool
    partida: Optional[int] = None
    error: Optional[str] = None


# ---------- Repositorio ----------

class RepositorioPlantillasSQL:
    def __init__(self, db: Session):
        self.db = db

    def obtener(self, codigo: str) -> Optional[PlantillaAsientoModel]:
        return self.db.query(PlantillaAsientoModel).filter(PlantillaAsientoModel.codigo == codigo).first()

    def listar(self, solo_activas: bool = True) -> List[PlantillaAsientoModel]:
        q = self.db.query(PlantillaAsientoModel)
        if solo_activas:
            q = q.filter(PlantillaAsientoModel.activo.is_(True))
        return q.order_by(PlantillaAsientoModel.codigo).all()

    def crear(self, dto: PlantillaInputDTO) -> PlantillaAsientoModel:
        if self.obtener(dto.codigo):
            raise PlantillaInvalidaError(f"Ya existe una plantilla con código {dto.codigo}.")
        for linea in dto.lineas:
            if not self.db.get(CuentaModel, linea.codigo_cuenta):
                raise CuentaInvalidaError(f"La cuenta {linea.codigo_cuenta} no existe en el PCGE.")
        if not {l.lado for l in dto.lineas} == {"DEBE", "HABER"}:
            raise PlantillaInvalidaError("La plantilla debe tener al menos una línea al DEBE y una al HABER.")
        p = PlantillaAsientoModel(
            codigo=dto.codigo, nombre=dto.nombre, descripcion=dto.descripcion,
            tipo_asiento=dto.tipo_asiento, concepto_formato=dto.concepto_formato, activo=True,
            lineas=[
                PlantillaLineaModel(orden=i, codigo_cuenta=l.codigo_cuenta, lado=l.lado, variable=l.variable, glosa=l.glosa)
                for i, l in enumerate(dto.lineas, start=1)
            ],
        )
        self.db.add(p)
        self.db.commit()
        return p

    def crear_recurrente(self, dto: RecurrenteInputDTO, plantilla: PlantillaAsientoModel, usuario: str) -> AsientoRecurrenteModel:
        faltan = _variables(plantilla) - set(dto.valores)
        if faltan:
            raise PlantillaInvalidaError(f"Faltan valores para las variables: {', '.join(sorted(faltan))}.")
        r = AsientoRecurrenteModel(
            nombre=dto.nombre, id_plantilla=plantilla.id_plantilla, valores=_jsonable(dto.valores),
            dia_del_mes=dto.dia_del_mes, fecha_inicio=dto.fecha_inicio, fecha_fin=dto.fecha_fin,
            activo=True, usuario_creacion=usuario,
        )
        self.db.add(r)
        self.db.commit()
        return r

    def listar_recurrentes(self, solo_activos: bool = False) -> List[AsientoRecurrenteModel]:
        q = self.db.query(AsientoRecurrenteModel)
        if solo_activos:
            q = q.filter(AsientoRecurrenteModel.activo.is_(True))
        return q.order_by(AsientoRecurrenteModel.id_recurrente).all()

    def obtener_recurrente(self, id_recurrente: int) -> Optional[AsientoRecurrenteModel]:
        return self.db.get(AsientoRecurrenteModel, id_recurrente)


def _variables(plantilla: PlantillaAsientoModel) -> set:
    return {l.variable for l in plantilla.lineas}


def _jsonable(valores: Dict[str, Any]) -> Dict[str, Any]:
    return {k: (str(v) if isinstance(v, Decimal) else v) for k, v in valores.items()}


def a_response(p: PlantillaAsientoModel) -> PlantillaResponseDTO:
    return PlantillaResponseDTO(
        id_plantilla=p.id_plantilla, codigo=p.codigo, nombre=p.nombre, descripcion=p.descripcion,
        tipo_asiento=p.tipo_asiento, concepto_formato=p.concepto_formato, activo=bool(p.activo),
        lineas=[LineaPlantillaDTO(codigo_cuenta=l.codigo_cuenta, lado=l.lado, variable=l.variable, glosa=l.glosa) for l in p.lineas],
        variables=sorted(_variables(p)),
    )


def a_recurrente_response(r: AsientoRecurrenteModel) -> RecurrenteResponseDTO:
    return RecurrenteResponseDTO(
        id_recurrente=r.id_recurrente, nombre=r.nombre, codigo_plantilla=r.plantilla.codigo, valores=r.valores,
        dia_del_mes=r.dia_del_mes, fecha_inicio=r.fecha_inicio, fecha_fin=r.fecha_fin,
        activo=bool(r.activo), ultimo_periodo=r.ultimo_periodo,
    )


# ---------- Casos de uso ----------

class AplicarPlantillaUseCase:
    """Convierte una plantilla + valores en un asiento y lo registra con las mismas validaciones que un asiento manual."""

    def __init__(self, repo: RepositorioPlantillasSQL, crear_asiento: CrearAsientoUseCase):
        self.repo = repo
        self.crear_asiento = crear_asiento

    def construir_dto(self, plantilla: PlantillaAsientoModel, dto: AplicarPlantillaDTO, usuario: str) -> CrearAsientoInputDTO:
        faltan = _variables(plantilla) - set(dto.valores)
        if faltan:
            raise PlantillaInvalidaError(f"Faltan valores para las variables: {', '.join(sorted(faltan))}.")
        detalles = []
        for l in plantilla.lineas:
            try:
                importe = Decimal(str(dto.valores[l.variable]))
            except InvalidOperation:
                raise PlantillaInvalidaError(f"El valor de '{l.variable}' no es un importe válido.")
            if importe == 0:
                continue  # p. ej. una compra inafecta sin IGV
            detalles.append(DetalleAsientoInputDTO(
                codigo_cuenta=l.codigo_cuenta,
                debe=importe if l.lado == "DEBE" else Decimal("0.00"),
                haber=importe if l.lado == "HABER" else Decimal("0.00"),
                observaciones=l.glosa,
            ))
        try:
            concepto = plantilla.concepto_formato.format_map(_Seguro(dto.valores))
        except (ValueError, IndexError):
            raise PlantillaInvalidaError("concepto_formato de la plantilla es inválido.")
        return CrearAsientoInputDTO(
            fecha=dto.fecha, concepto=concepto, tipo_asiento=plantilla.tipo_asiento,
            codigo_moneda=dto.codigo_moneda, tipo_cambio=dto.tipo_cambio, detalles=detalles,
            usuario=usuario, observaciones=dto.observaciones or f"Generado con plantilla {plantilla.codigo}",
        )

    def ejecutar(self, codigo: str, dto: AplicarPlantillaDTO, usuario: str) -> AsientoResponseDTO:
        plantilla = self.repo.obtener(codigo)
        if not plantilla or not plantilla.activo:
            raise PlantillaNoEncontradaError(f"Plantilla {codigo} no encontrada.")
        return self.crear_asiento.ejecutar(self.construir_dto(plantilla, dto, usuario))


class _Seguro(dict):
    """Variables ausentes en el concepto se dejan como {nombre} en vez de fallar."""
    def __missing__(self, key):
        return "{" + key + "}"


def _fecha_programada(r: AsientoRecurrenteModel, anio: int, mes: int) -> date:
    return date(anio, mes, min(r.dia_del_mes, calendar.monthrange(anio, mes)[1]))


class EjecutarRecurrentesUseCase:
    """
    Genera los asientos recurrentes pendientes hasta `fecha_corte`. Es idempotente: cada recurrente guarda el
    último período generado, y si un mes falla (p. ej. período cerrado) no avanza para reintentarse después.
    """

    def __init__(self, repo: RepositorioPlantillasSQL, aplicar: AplicarPlantillaUseCase):
        self.repo = repo
        self.aplicar = aplicar

    def ejecutar(self, fecha_corte: date) -> List[ResultadoRecurrenteDTO]:
        resultados: List[ResultadoRecurrenteDTO] = []
        for r in self.repo.listar_recurrentes(solo_activos=True):
            anio, mes = r.fecha_inicio.year, r.fecha_inicio.month
            if r.ultimo_periodo:
                anio, mes = divmod(r.ultimo_periodo, 100)
                anio, mes = (anio + 1, 1) if mes == 12 else (anio, mes + 1)
            while True:
                programada = _fecha_programada(r, anio, mes)
                if programada > fecha_corte or (r.fecha_fin and programada > r.fecha_fin):
                    break
                if programada >= r.fecha_inicio:
                    periodo = anio * 100 + mes
                    try:
                        asiento = self.aplicar.ejecutar(
                            r.plantilla.codigo,
                            AplicarPlantillaDTO(
                                fecha=programada, valores=r.valores,
                                observaciones=f"Asiento recurrente: {r.nombre}",
                            ),
                            usuario=r.usuario_creacion,
                        )
                    except Exception as e:  # un fallo no debe detener a los demás recurrentes
                        self.repo.db.rollback()
                        resultados.append(ResultadoRecurrenteDTO(
                            id_recurrente=r.id_recurrente, nombre=r.nombre, periodo=periodo, ok=False, error=str(e)))
                        break
                    r.ultimo_periodo = periodo
                    self.repo.db.commit()
                    resultados.append(ResultadoRecurrenteDTO(
                        id_recurrente=r.id_recurrente, nombre=r.nombre, periodo=periodo, ok=True, partida=asiento.partida))
                anio, mes = (anio + 1, 1) if mes == 12 else (anio, mes + 1)
        return resultados
