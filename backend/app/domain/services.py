from decimal import Decimal
from typing import Union, Dict, Any, List
from app.domain.entities import AsientoContable
from app.domain.exceptions import PartidaDesbalanceadaError

class ValidadorPartidaDoble:
    """
    Validador del principio contable fundamental de partida doble:
    Sum(Débitos) = Sum(Créditos) con tolerancia de redondeo de 0.01.
    """
    TOLERANCIA = Decimal("0.01")

    def es_valido(self, asiento: Union[AsientoContable, Dict[str, Any]]) -> bool:
        try:
            self.validar(asiento)
            return True
        except PartidaDesbalanceadaError:
            return False

    def validar(self, asiento: Union[AsientoContable, Dict[str, Any]]) -> None:
        if isinstance(asiento, dict):
            debe_total = Decimal(str(asiento.get("debe_total", 0.0)))
            haber_total = Decimal(str(asiento.get("haber_total", 0.0)))
            detalles = asiento.get("detalles", [])
        else:
            debe_total = Decimal(str(asiento.debe_total))
            haber_total = Decimal(str(asiento.haber_total))
            detalles = asiento.detalles

        # 1. Comprobar que totales de cabecera cuadren
        diferencia = abs(debe_total - haber_total)
        if diferencia > self.TOLERANCIA:
            raise PartidaDesbalanceadaError(
                f"Partida desbalanceada: Debe total ({debe_total}) != Haber total ({haber_total}). "
                f"Diferencia: {diferencia} excede la tolerancia permitida ({self.TOLERANCIA})"
            )

        # 2. Si hay detalles, validar integridad de líneas
        if detalles:
            if len(detalles) < 2:
                raise PartidaDesbalanceadaError("Un asiento contable requiere al menos 2 apuntes o líneas de detalle.")

            suma_debe_detalles = Decimal("0.00")
            suma_haber_detalles = Decimal("0.00")

            for idx, item in enumerate(detalles, start=1):
                if isinstance(item, dict):
                    d = Decimal(str(item.get("debe", 0.0)))
                    h = Decimal(str(item.get("haber", 0.0)))
                else:
                    d = Decimal(str(item.debe))
                    h = Decimal(str(item.haber))

                if d < 0 or h < 0:
                    raise PartidaDesbalanceadaError(f"Línea {idx}: Los importes de Debe y Haber no pueden ser negativos.")

                if d > 0 and h > 0:
                    raise PartidaDesbalanceadaError(f"Línea {idx}: Una línea contable no puede tener simultáneamente Debe > 0 y Haber > 0.")

                suma_debe_detalles += d
                suma_haber_detalles += h

            # Verificar que la suma de detalles coincide con los totales
            if abs(suma_debe_detalles - debe_total) > self.TOLERANCIA:
                raise PartidaDesbalanceadaError(
                    f"La suma de débitos en detalles ({suma_debe_detalles}) no coincide con debe_total ({debe_total})."
                )

            if abs(suma_haber_detalles - haber_total) > self.TOLERANCIA:
                raise PartidaDesbalanceadaError(
                    f"La suma de créditos en detalles ({suma_haber_detalles}) no coincide con haber_total ({haber_total})."
                )
