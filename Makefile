.PHONY: despachar recurrentes migrate migration up down logs test test-backend build-frontend

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

test: test-backend

test-backend:
	PYTHONPATH=backend backend/venv/bin/pytest backend/tests -v

build-frontend:
	cd frontend && npm run build

migrate:
	cd backend && PYTHONPATH=. venv/bin/alembic upgrade head

migration:
	cd backend && PYTHONPATH=. venv/bin/alembic revision --autogenerate -m "$(m)"

recurrentes:
	cd backend && PYTHONPATH=. venv/bin/python -m app.jobs.ejecutar_recurrentes

despachar:
	cd backend && PYTHONPATH=. venv/bin/python -m app.jobs.despachar_eventos
