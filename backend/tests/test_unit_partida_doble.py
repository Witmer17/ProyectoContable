import unittest
from decimal import Decimal
from app.domain.services import ValidadorPartidaDoble
from app.domain.exceptions import PartidaDesbalanceadaError

class TestValidadorPartidaDoble(unittest.TestCase):
    """
    6.1.1 Unit Tests conforme a la especificación del PDF
    """
    def setUp(self):
        self.validador = ValidadorPartidaDoble()

    def test_partida_balanceada(self):
        """Verifica que asiento con Debe = Haber sea válido."""
        asiento = {
            "debe_total": 1000.00,
            "haber_total": 1000.00,
            "detalles": [
                {"debe": 1000.00, "haber": 0.00},
                {"debe": 0.00, "haber": 1000.00},
            ]
        }
        self.assertTrue(self.validador.es_valido(asiento))

    def test_partida_desbalanceada_rechazada(self):
        """Verifica que desbalance sea detectado y lance PartidaDesbalanceadaError."""
        asiento = {
            "debe_total": 1000.00,
            "haber_total": 900.00,
            "detalles": [
                {"debe": 1000.00, "haber": 0.00},
                {"debe": 0.00, "haber": 900.00},
            ]
        }
        self.assertFalse(self.validador.es_valido(asiento))
        with self.assertRaises(PartidaDesbalanceadaError):
            self.validador.validar(asiento)

    def test_tolerancia_redondeo(self):
        """Verifica tolerancia de 0.01 en cálculos contables."""
        asiento = {
            "debe_total": 1000.00,
            "haber_total": 1000.01,
            "detalles": [
                {"debe": 1000.00, "haber": 0.00},
                {"debe": 0.00, "haber": 1000.01},
            ]
        }
        self.assertTrue(self.validador.es_valido(asiento))

    def test_rechazo_debe_y_haber_simultaneos_en_misma_linea(self):
        """Verifica que no se permita Debe > 0 y Haber > 0 en el mismo apunte."""
        asiento = {
            "debe_total": 500.00,
            "haber_total": 500.00,
            "detalles": [
                {"debe": 500.00, "haber": 100.00},
                {"debe": 0.00, "haber": 400.00},
            ]
        }
        with self.assertRaises(PartidaDesbalanceadaError):
            self.validador.validar(asiento)

if __name__ == "__main__":
    unittest.main()
