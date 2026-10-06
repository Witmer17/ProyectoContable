from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.auth import get_usuario_actual
from app.api.security import crear_token, verify_password
from app.infrastructure.database import get_db
from app.infrastructure.models import UsuarioSistemaModel

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class TokenDTO(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: str
    nombre_usuario: str


class UsuarioDTO(BaseModel):
    nombre_usuario: str
    correo_electronico: str
    rol: str


@router.post("/login", response_model=TokenDTO)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(UsuarioSistemaModel).filter(UsuarioSistemaModel.nombre_usuario == form.username).first()
    if not usuario or usuario.estado != "ACTIVO" or not verify_password(form.password, usuario.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario o contraseña incorrectos.")
    usuario.fecha_ultimo_acceso = datetime.utcnow()
    db.commit()
    return TokenDTO(
        access_token=crear_token(usuario.nombre_usuario, usuario.rol),
        rol=usuario.rol,
        nombre_usuario=usuario.nombre_usuario,
    )


@router.get("/me", response_model=UsuarioDTO)
def me(usuario: UsuarioSistemaModel = Depends(get_usuario_actual)):
    return UsuarioDTO(
        nombre_usuario=usuario.nombre_usuario,
        correo_electronico=usuario.correo_electronico,
        rol=usuario.rol,
    )
