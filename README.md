# Sistema Contable para pymes peruanas (PCGE 2019)

Sistema web para registrar operaciones de una empresa (comercial, de servicios, industrial o mixta). Cada operación genera sus asientos automáticamente en el formato de tres partes (provisión, destino y cancelación) y todo asiento cumple **Debe = Haber**. Versión 1: solo régimen general (IGV 18 %).

| Capa | Tecnología |
|---|---|
| Frontend | Angular 22 (standalone, Signals, Reactive Forms, Angular Material) |
| Backend | NestJS 10 + TypeScript, API REST, JWT con roles |
| Base de datos | PostgreSQL 16 + Prisma |
| Pruebas | Jest + Supertest (backend), Vitest (frontend) |

## Puesta en marcha

```bash
cp .env.example .env        # completa POSTGRES_PASSWORD, JWT_SECRET y SEED_USER_PASSWORD
docker compose up --build -d
```

- Aplicación: http://localhost:4200 · API: http://localhost:3000/api
- Al arrancar, el backend aplica las migraciones y carga (de forma idempotente) el catálogo PCGE, cuatro usuarios y los **datos demo** de la sección 9 (DEMO SAC, apertura de S/ 35,000, productos A/B/C, Proveedor 1 y Cliente 1). `SEED_DEMO=false` los omite.
- Usuarios demo (clave = `SEED_USER_PASSWORD`): `admin@demo.pe`, `contador@demo.pe`, `auxiliar@demo.pe`, `lectura@demo.pe`.

Desarrollo local: `make db`, luego `cd backend && npm i && npx prisma migrate deploy && npm run seed && npm run start:dev` y `cd frontend && npm i && npm start` (el proxy `/api` apunta a `localhost:3000`).

## Pruebas

```bash
cd backend && npm test        # motor de asientos: 26 pruebas, incluye las 12 operaciones de regresión
E2E_DATABASE_URL=postgresql://user:pass@localhost:5432/sistema_test npm run test:e2e   # 27 pruebas vía HTTP
cd frontend && npm test -- --watch=false
```
La base e2e debe terminar en `_test` o `_verif`: **se vacía por completo**.

## Estructura

- `backend/src/motor-asientos`: reglas contables puras, sin HTTP ni base de datos (códigos de cuenta en `cuentas.ts`).
- `backend/src/operaciones`: asistente (previsualización y registro), documentos, kárdex, pagos, planilla, depreciación, IGV, capital, apertura.
- `backend/src/{empresa,cuentas,terceros,productos,activos,asientos,periodos,reportes,admin}`; `backend/prisma`: esquema, migraciones y seed.
- `frontend/src/app`: `core`, `shared` (selector de cuenta código↔nombre, selector de tercero con "+ Nuevo", tabla de asientos, indicador de cuadre, montos Base/IGV/Total) y `pages`.

## Roles
Administrador: todo · Contador: todo menos configuración · Auxiliar: solo documentos y pagos · Lectura: solo reportes.

## Decisiones y límites (secciones 15 y 17)
Por defecto: una empresa, soles (dólares al tipo de cambio del documento), kárdex a costo promedio ponderado, solo registro de comprobantes, RUC/DNI a mano con validación de formato, en línea.

- Destino de compras: se usa **6111** (subcuenta de 611); verificar contra el PCGE vigente y corregir en `cuentas.ts` y `cuentas/catalogo.ts`. Igual con 4241, 4011/40172, 45, 676/776, 891/892 y 502.
- Anticipo de cliente: Debe caja/banco; Haber 122 (base) y 40111 (IGV).
- Producción industrial (92 → productos terminados): sin asistente, usar asiento manual.
- Registros de compras/ventas: Excel y PDF; el TXT PLE de SUNAT no está implementado.
- La liquidación de IGV no arrastra saldo a favor de meses anteriores.
