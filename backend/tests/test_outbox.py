import os
import unittest

os.environ["SEED_USER_PASSWORD"] = "clave-de-prueba"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.main import app
from app.infrastructure.database import get_db
from app.infrastructure.models import Base, EventoOutboxModel
from app.infrastructure.outbox import DespachadorOutbox, EventSink, OutboxEventPublisher
from app.infrastructure.seed_data import ejecutar_seed

API = "/api/v1"


class SinkFalso(EventSink):
    def __init__(self, falla=False):
        self.enviados, self.falla = [], falla

    def enviar(self, evento):
        if self.falla:
            raise ConnectionError("bus caído")
        self.enviados.append(evento.id_evento)


class TestOutbox(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        with self.Session() as db:
            ejecutar_seed(db)

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_publicar_persiste_y_despachar_entrega_en_orden_una_sola_vez(self):
        db = self.Session()
        pub = OutboxEventPublisher(db)
        pub.publicar("asiento_contabilizado", {"partida": 1})
        pub.publicar("asiento_contabilizado", {"partida": 2})
        sink = SinkFalso()
        self.assertEqual(DespachadorOutbox(db, sink).despachar()["enviados"], 2)
        self.assertEqual(sink.enviados, [1, 2])
        self.assertEqual(DespachadorOutbox(db, sink).despachar()["enviados"], 0)
        self.assertEqual({e.estado for e in db.query(EventoOutboxModel)}, {"ENVIADO"})

    def test_fallo_reintenta_y_luego_marca_fallido(self):
        db = self.Session()
        OutboxEventPublisher(db).publicar("x", {"a": 1})
        d = DespachadorOutbox(db, SinkFalso(falla=True), max_intentos=2)
        self.assertEqual(d.despachar(), {"enviados": 0, "fallidos": 0, "reintentar": 1})
        self.assertEqual(d.despachar(), {"enviados": 0, "fallidos": 1, "reintentar": 0})
        ev = db.query(EventoOutboxModel).one()
        self.assertEqual((ev.estado, ev.intentos, ev.ultimo_error), ("FALLIDO", 2, "bus caído"))

    def test_crear_asiento_por_api_deja_evento_y_admin_puede_reintentar(self):
        def override_db():
            db = self.Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_db
        c = TestClient(app)

        def h(u):
            r = c.post(f"{API}/auth/login", data={"username": u, "password": "clave-de-prueba"})
            return {"Authorization": f"Bearer {r.json()['access_token']}"}

        r = c.post(f"{API}/asientos", headers=h("contador_juana"), json={
            "fecha": "2026-03-01", "concepto": "t",
            "detalles": [{"codigo_cuenta": 101, "debe": 10, "haber": 0}, {"codigo_cuenta": 5011, "debe": 0, "haber": 10}],
        })
        self.assertEqual(r.status_code, 201, r.text)
        admin = h("admin_juan")
        evs = c.get(f"{API}/eventos/outbox", headers=admin).json()
        self.assertEqual([(e["tipo_evento"], e["estado"]) for e in evs], [("asiento_contabilizado", "PENDIENTE")])
        self.assertEqual(c.get(f"{API}/eventos/outbox", headers=h("contador_juana")).status_code, 403)
        self.assertEqual(c.post(f"{API}/eventos/outbox/{evs[0]['id_evento']}/reintentar", headers=admin).status_code, 400)


if __name__ == "__main__":
    unittest.main()
