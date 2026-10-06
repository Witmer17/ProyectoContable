import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.infrastructure.models import Base

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./sistema_contable.db"
)

# Detect SQLite vs PostgreSQL
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    # Fix regex/constraints in SQLite if needed
else:
    # Optimización recomendada en Sección 3.2: statement_timeout = 5000ms
    connect_args = {"options": "-c statement_timeout=5000"}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # En PostgreSQL el esquema lo gestiona Alembic (alembic upgrade head); create_all solo para SQLite local.
    if DATABASE_URL.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
