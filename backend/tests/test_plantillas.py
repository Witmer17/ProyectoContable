import os
import unittest
from datetime import date

os.environ["SEED_USER_PASSWORD"] = "clave-de-prueba"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.main import app
from app.infrastructure.database import get_db
from app.infrastructure.models import Base
from app.infrastructure.seed_data import ejecutar_seed

API = "/api/v1"


class TestPlantillas(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        with Session() as db:
            ejecutar_seed(db)

        def override_db():
            db = Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)
        self.admin = self._h("admin_juan")
        self.contador = self._h("contador_juana")

    def tearDown(self):
        app.dependency_overrides.clear()

    def _h(self, u):
        r = self.client.post(f"{API}/auth/login", data={"username": u, "password": "clave-de-prueba"})
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    def test_aplicar_plantilla_venta(self):
        r = self.client.post(f"{API}/plantillas/VENTA_GRAVADA/aplicar", headers=self.contador, json={
            "fecha": "2026-03-10",
            "valores": {"total": "118.00", "igv": "18.00", "base": "100.00", "numero": "F001-1", "cliente": "ACME"},
        })
        self.assertEqual(r.status_code, 201, r.text)
        self.assertEqual(r.json()["concepto"], "Factura F001-1 - ACME")
        self.assertEqual(len(r.json()["detalles"]), 3)

    def test_plantilla_desbalanceada_se_rechaza(self):
        r = self.client.post(f"{API}/plantillas/VENTA_GRAVADA/aplicar", headers=self.contador, json={
            "fecha": "2026-03-10", "valores": {"total": "118.00", "igv": "18.00", "base": "90.00"},
        })
        self.assertEqual(r.status_code, 400, r.text)

    def test_faltan_variables(self):
        r = self.client.post(f"{API}/plantillas/VENTA_GRAVADA/aplicar", headers=self.contador, json={
            "fecha": "2026-03-10", "valores": {"total": "118.00"},
        })
        self.assertEqual(r.status_code, 400)
        self.assertIn("igv", r.json()["detalle"])

    def test_plantilla_inexistente_404(self):
        r = self.client.post(f"{API}/plantillas/NOPE/aplicar", headers=self.contador, json={"fecha": "2026-03-10", "valores": {}})
        self.assertEqual(r.status_code, 404)

    def test_solo_admin_crea_plantillas(self):
        body = {
            "codigo": "ALQUILER", "nombre": "Alquiler", "concepto_formato": "Alquiler {mes}",
            "lineas": [{"codigo_cuenta": 6311, "lado": "DEBE", "variable": "monto"},
                       {"codigo_cuenta": 4212, "lado": "HABER", "variable": "monto"}],
        }
        self.assertEqual(self.client.post(f"{API}/plantillas", json=body, headers=self.contador).status_code, 403)
        self.assertEqual(self.client.post(f"{API}/plantillas", json=body, headers=self.admin).status_code, 201)
        body["codigo"] = "MALA"
        body["lineas"][0]["codigo_cuenta"] = 99999
        self.assertEqual(self.client.post(f"{API}/plantillas", json=body, headers=self.admin).status_code, 400)

    def _crear_recurrente(self):
        r = self.client.post(f"{API}/recurrentes", headers=self.admin, json={
            "nombre": "Seguro oficina", "codigo_plantilla": "SEGURO_MENSUAL",
            "valores": {"monto": "250.00", "descripcion": "oficina"}, "dia_del_mes": 5, "fecha_inicio": "2026-01-01",
        })
        self.assertEqual(r.status_code, 201, r.text)

    def test_recurrentes_generan_meses_pendientes_y_son_idempotentes(self):
        self._crear_recurrente()
        r = self.client.post(f"{API}/recurrentes/ejecutar", headers=self.admin, json={"fecha_corte": "2026-03-10"})
        self.assertEqual([x["periodo"] for x in r.json()], [202601, 202602, 202603])
        self.assertTrue(all(x["ok"] for x in r.json()))
        r2 = self.client.post(f"{API}/recurrentes/ejecutar", headers=self.admin, json={"fecha_corte": "2026-03-10"})
        self.assertEqual(r2.json(), [])
        r3 = self.client.post(f"{API}/recurrentes/ejecutar", headers=self.admin, json={"fecha_corte": "2026-04-05"})
        self.assertEqual([x["periodo"] for x in r3.json()], [202604])

    def test_recurrente_con_periodo_cerrado_falla_y_reintenta(self):
        self._crear_recurrente()
        self.client.post(f"{API}/periodos/bloquear", headers=self.admin,
                         json={"codigo_ejercicio": 2026, "mes": 2, "estado_bloqueo": "DEFINITIVO"})
        r = self.client.post(f"{API}/recurrentes/ejecutar", headers=self.admin, json={"fecha_corte": "2026-03-10"})
        self.assertEqual([(x["periodo"], x["ok"]) for x in r.json()], [(202601, True), (202602, False)])
        self.client.post(f"{API}/periodos/bloquear", headers=self.admin,
                         json={"codigo_ejercicio": 2026, "mes": 2, "estado_bloqueo": "ABIERTO"})
        r = self.client.post(f"{API}/recurrentes/ejecutar", headers=self.admin, json={"fecha_corte": "2026-03-10"})
        self.assertEqual([(x["periodo"], x["ok"]) for x in r.json()], [(202602, True), (202603, True)])

    def test_contador_no_ejecuta_recurrentes(self):
        self.assertEqual(self.client.post(f"{API}/recurrentes/ejecutar", headers=self.contador, json={}).status_code, 403)


if __name__ == "__main__":
    unittest.main()
