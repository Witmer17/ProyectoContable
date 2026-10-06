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

ASIENTO = {
    "fecha": date.today().replace(year=2026).isoformat(),
    "concepto": "Prueba auth",
    "detalles": [
        {"codigo_cuenta": 101, "debe": 100, "haber": 0},
        {"codigo_cuenta": 5011, "debe": 0, "haber": 100},
    ],
    "usuario": "suplantado",
}


class TestAuthAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
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
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()

    def _token(self, usuario):
        r = self.client.post("/api/v1/auth/login", data={"username": usuario, "password": "clave-de-prueba"})
        self.assertEqual(r.status_code, 200, r.text)
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    def test_sin_token_401(self):
        self.assertEqual(self.client.get("/api/v1/asientos").status_code, 401)

    def test_login_clave_incorrecta(self):
        r = self.client.post("/api/v1/auth/login", data={"username": "admin_juan", "password": "mala"})
        self.assertEqual(r.status_code, 401)

    def test_token_invalido_401(self):
        r = self.client.get("/api/v1/asientos", headers={"Authorization": "Bearer basura"})
        self.assertEqual(r.status_code, 401)

    def test_auditor_lee_pero_no_escribe(self):
        h = self._token("auditor_carlos")
        self.assertEqual(self.client.get("/api/v1/asientos", headers=h).status_code, 200)
        self.assertEqual(self.client.post("/api/v1/asientos", json=ASIENTO, headers=h).status_code, 403)

    def test_contador_crea_con_su_usuario_y_no_cierra_periodos(self):
        h = self._token("contador_juana")
        r = self.client.post("/api/v1/asientos", json=ASIENTO, headers=h)
        self.assertEqual(r.status_code, 201, r.text)
        self.assertTrue(r.json()["historial_cambios"])
        self.assertTrue(all(h["usuario"] == "contador_juana" for h in r.json()["historial_cambios"]))
        cierre = {"codigo_ejercicio": 2026, "mes": 1, "estado_bloqueo": "DEFINITIVO"}
        self.assertEqual(self.client.post("/api/v1/periodos/bloquear", json=cierre, headers=h).status_code, 403)

    def test_admin_cierra_periodo(self):
        h = self._token("admin_juan")
        cierre = {"codigo_ejercicio": 2026, "mes": 12, "estado_bloqueo": "PROVISIONAL"}
        self.assertEqual(self.client.post("/api/v1/periodos/bloquear", json=cierre, headers=h).status_code, 200)


if __name__ == "__main__":
    unittest.main()
