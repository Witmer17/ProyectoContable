from typing import List
from datetime import date
from decimal import Decimal
from app.domain.entities import AsientoContable

class PLEService:
    """
    Servicio de exportación oficial PLE (Programa de Libros Electrónicos - SUNAT)
    según Resolución de Superintendencia N.º 234-2006/SUNAT y normas complementarias.
    """

    @staticmethod
    def generar_libro_diario_5_1(
        asientos: List[AsientoContable],
        ruc: str = "20123456789",
        ejercicio: int = 2026,
        mes: int = 10
    ) -> str:
        """
        Genera el contenido del archivo plano para el Libro Diario - Formato 5.1
        Estructura oficial:
        Campo 1: Periodo (AAAAMM00)
        Campo 2: Código Único de Operación (CUO)
        Campo 3: Correlativo del asiento
        Campo 4: Código de cuenta contable PCGE
        Campo 5: Código de unidad de operación
        Campo 6: Código centro de costos
        Campo 7: Tipo de moneda de origen
        Campo 8: Tipo comprobante identidad emisor
        Campo 9: Número comprobante identidad
        Campo 10: Tipo de comprobante de pago
        Campo 11: Serie comprobante
        Campo 12: Número comprobante
        Campo 13: Fecha contable (DD/MM/AAAA)
        Campo 14: Fecha de vencimiento
        Campo 15: Fecha de emisión
        Campo 16: Glosa o descripción
        Campo 17: Glosa referencial
        Campo 18: Movimiento del Debe
        Campo 19: Movimiento del Haber
        Campo 20: Dato estructurado
        Campo 21: Estado de la operación (1 = Normal en plazo)
        """
        lineas = []
        periodo_str = f"{ejercicio}{mes:02d}00"

        for asiento in asientos:
            if asiento.estado == "ANULADO":
                continue

            cuo = f"CUO{asiento.partida:08d}"
            fecha_str = asiento.fecha.strftime("%d/%m/%Y")
            moneda_str = "PEN" if asiento.codigo_moneda == 1 else ("USD" if asiento.codigo_moneda == 2 else "EUR")

            for detalle in asiento.detalles:
                correlativo = f"M{detalle.linea_numero:04d}"
                cuenta_str = str(detalle.codigo_cuenta)
                debe_str = f"{detalle.debe:.2f}"
                haber_str = f"{detalle.haber:.2f}"
                glosa = asiento.concepto.replace("|", "/")

                # Formato estándar SUNAT con delimitador pipe '|'
                campos = [
                    periodo_str,                     # 1. Periodo
                    cuo,                             # 2. CUO
                    correlativo,                     # 3. Correlativo
                    cuenta_str,                      # 4. Código Cuenta PCGE
                    "",                              # 5. Unidad de Operación
                    "",                              # 6. Centro de Costos
                    moneda_str,                      # 7. Moneda
                    "6",                             # 8. Tipo Doc Identidad (6 = RUC)
                    ruc,                             # 9. Doc Identidad
                    "01",                            # 10. Tipo Comprobante (01 = Factura)
                    "F001",                          # 11. Serie
                    f"{asiento.partida:08d}",         # 12. Número
                    fecha_str,                       # 13. Fecha Contable
                    fecha_str,                       # 14. Fecha Vencimiento
                    fecha_str,                       # 15. Fecha Emisión
                    glosa,                           # 16. Glosa
                    "",                              # 17. Glosa Referencial
                    debe_str,                        # 18. Debe
                    haber_str,                       # 19. Haber
                    "",                              # 20. Dato Estructurado
                    "1",                             # 21. Estado (1: Vigente)
                    ""                               # SUNAT requiere terminar con delimitador pipe
                ]
                lineas.append("|".join(campos))

        return "\r\n".join(lineas)

    @staticmethod
    def obtener_nombre_archivo_ple_diario(ruc: str = "20123456789", ejercicio: int = 2026, mes: int = 10) -> str:
        """
        Formato de nomenclatura SUNAT:
        LE[RUC][AÑO][MES]00050100001111.txt
        """
        return f"LE{ruc}{ejercicio}{mes:02d}00050100001111.txt"
