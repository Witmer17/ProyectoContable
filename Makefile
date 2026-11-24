.PHONY: up down db logs test test-e2e build-frontend migrate seed

up:
	docker compose up --build -d

down:
	docker compose down

# Solo la base de datos (para desarrollo local)
db:
	docker compose up -d db

logs:
	docker compose logs -f

test:
	cd backend && npm test

# Requiere E2E_DATABASE_URL apuntando a una base vacía cuyo nombre termine en _test
test-e2e:
	cd backend && npm run test:e2e

build-frontend:
	cd frontend && npm run build

migrate:
	cd backend && npx prisma migrate deploy

seed:
	cd backend && npm run seed
