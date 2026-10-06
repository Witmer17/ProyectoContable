from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.auth import requiere_roles
from app.infrastructure.database import get_db
from app.infrastructure.models import EventoOutboxModel

router = APIRouter(prefix="/eventos", tags=["Eventos (Outbox)"])


class EventoOutboxDTO(BaseModel):
    id_evento: int
    tipo_evento: str
    payload: Dict[str, Any]
    estado: str
    intentos: int
    ultimo_error: Optional[str] = None
    fecha_creacion: datetime
    fecha_envio: Optional[datetime] = None

    model_config = {"from_attributes": True}


@router.get("/outbox", response_model=List[EventoOutboxDTO])
def listar_outbox(
    estado: Optional[str] = Query(None, pattern="^(PENDIENTE|ENVIADO|FALLIDO)$"),
    limite: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    usuario=Depends(requiere_roles("ADMIN")),
):
    q = db.query(EventoOutboxModel)
    if estado:
        q = q.filter(EventoOutboxModel.estado == estado)
    return q.order_by(EventoOutboxModel.id_evento.desc()).limit(limite).all()


@router.post("/outbox/{id_evento}/reintentar", response_model=EventoOutboxDTO)
def reintentar(id_evento: int, db: Session = Depends(get_db), usuario=Depends(requiere_roles("ADMIN"))):
    ev = db.get(EventoOutboxModel, id_evento)
    if not ev:
        raise HTTPException(status_code=404, detail="Evento no encontrado.")
    if ev.estado != "FALLIDO":
        raise HTTPException(status_code=400, detail="Solo se pueden reintentar eventos FALLIDO.")
    ev.estado, ev.intentos, ev.ultimo_error = "PENDIENTE", 0, None
    db.commit()
    return ev
