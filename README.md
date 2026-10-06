# Sistema Contable Empresarial Mejorado

Sistema integral de gestión contable bajo **Clean Architecture** (Arquitectura Limpia / Hexagonal), diseñado conforme a la normativa fiscal peruana (**Plan Contable General Empresarial - PCGE 2026**, **Resolución N.º 234-2006/SUNAT**, **PLE 5.1** y compatibilidad **SIRE**).

---

## 🛠️ Tecnologías Utilizadas

| Capa / Módulo | Tecnología | Justificación y Rol en el Sistema |
|---|---|---|
| **Backend API** | **Python 3.14 + FastAPI** | Framework asíncrono de alto rendimiento, tipado riguroso con Pydantic v2, generación automática de OpenAPI / Swagger. |
| **Arquitectura** | **Clean Architecture (Hexagonal)** | Separación estricta en 4 capas: Dominio, Casos de Uso, Puertos y Adaptadores/Infraestructura. |
| **Base de Datos** | **PostgreSQL 16** | Soporte de transacciones `SERIALIZABLE`, bloqueos pesimistas (`SELECT ... FOR UPDATE`), versionamiento optimista (`version`), e índices B-Tree/BRIN. |
| **ORM / Acceso a Datos** | **SQLAlchemy 2.0** | Gestión de sesiones transaccionales, mapeo de las 10 entidades del modelo relacional. |
| **Frontend** | **Angular (v22/v19 Standalone + Signals)** | SPA reactiva con Tailwind CSS, interfaz intuitiva para Libro Diario, validador de partida doble en tiempo real y exportador PLE. |
| **Caché y Eventos** | **Redis 7** | Almacenamiento rápido de saldos de mayor y publicación de eventos fiscales (`asiento_contabilizado` para SIRE / Kafka). |
| **Contenedores** | **Docker & Docker Compose** | Despliegue completo y orquestado de base de datos, caché, backend y frontend en un solo comando. |
| **Testing** | **Pytest & Unittest** | Pruebas unitarias de partida doble, pruebas de integración transaccional y pruebas multihilo de concurrencia/deadlocks. |

---

## 🏛️ Modelo Relacional (10 Tablas Principales)

El esquema de base de datos en PostgreSQL implementa las 10 entidades fundamentales del sistema:
1. `tipo`: Clasificación por naturaleza contable (Activo, Pasivo, Patrimonio, Ingresos, Gastos).
2. `nivel`: Niveles jerárquicos del PCGE (Elemento, Principal, Subcuenta, Divisionaria, Subdivisionaria).
3. `cuenta`: Catálogo arborescente del PCGE oficial (ej. `1212`, `40111`, `70121`).
4. `moneda`: Gestión multimoneda (PEN, USD, EUR) y tipos de cambio oficiales.
5. `partida_encabezado`: Cabecera del asiento en Libro Diario, separando moneda de origen vs. moneda funcional, con versionamiento optimista.
6. `partida_detalle`: Movimientos y apuntes individuales del Libro Mayor con restricciones de integridad de partida doble.
7. `auditoria_asiento`: Trazabilidad inmutable de todas las operaciones (INSERT, UPDATE) para cumplimiento de no borrado fiscal.
8. `bloqueo_periodo`: Control de cierre mensual de períodos fiscales con bloqueo pesimista.
9. `usuario_sistema`: Roles (ADMIN, CONTADOR, AUDITOR, GERENTE).
10. `evento_conciliacion`: Registro de eventos de cierre, validaciones y sincronizaciones.

---

## ⚡ Reglas Contables y Fiscales Implementadas

- **Partida Doble (\(\sum Debe = \sum Haber\))**: Tolerancia matemática de \(0.01\) ante variaciones de redondeo cambiario.
- **Prohibición de Enmiendas (SUNAT 4.1.3)**: No se eliminan físicamente asientos; la rectificación anula el asiento previo, revierte saldos del mayor, emite un nuevo asiento rectificado y deja registro en auditoría.
- **Flujo End-to-End Factura de Venta**: Mapeo automático de Factura Comercial al PCGE:
  - **Debe 1212**: Total Facturado (Cuentas por cobrar en cartera).
  - **Haber 40111**: IGV 18% (Pasivo fiscal débito).
  - **Haber 70121**: Base Imponible (Ventas gravadas locales).
- **Exportación SUNAT PLE 5.1**: Generador oficial del archivo plano con delimitador pipe (`|`) y nomenclatura estándar: `LE[RUC][AÑO][MES]00050100001111.txt`.

---

## 🚀 Despliegue con Docker Compose

Para levantar toda la infraestructura (PostgreSQL, Redis, Backend FastAPI y Frontend Angular):

```bash
docker compose up --build -d
```

- **Frontend Angular**: `http://localhost:4200`
- **Backend FastAPI & Swagger UI**: `http://localhost:8000/docs`
- **PostgreSQL**: `localhost:5432` (usuario: `postgres`, base de datos: `sistema_contable`)

---

## 🗄️ Migraciones de base de datos (Alembic)

El esquema se gestiona con Alembic (`backend/migrations/`); el contenedor del backend ejecuta `alembic upgrade head` al arrancar.

```bash
make migrate                      # aplicar migraciones
make migration m="descripcion"    # generar una nueva a partir de los modelos
```

Las bases creadas antes de Alembic se actualizan solas (la migración base se omite si el esquema ya existe).

## 🧪 Ejecución de Pruebas Automatizadas

El sistema incluye las 3 suites de pruebas exigidas en el Capítulo 6 del documento:

```bash
# Activar entorno virtual
source backend/venv/bin/activate

# Ejecutar tests unitarios, de integración y de concurrencia
PYTHONPATH=backend pytest backend/tests/ -v
```
