from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt

from app.api.security import decodificar_token
from app.infrastructure.database import get_db
from app.infrastructure.models import UsuarioSistemaModel

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

ROLES_ESCRITURA = ("ADMIN", "JEFE_CONTABILIDAD", "CONTADOR")
ROLES_CIERRE = ("ADMIN", "JEFE_CONTABILIDAD")


def get_usuario_actual(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> UsuarioSistemaModel:
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o token expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        nombre = decodificar_token(token).get("sub")
    except jwt.PyJWTError:
        raise credenciales_invalidas
    usuario = db.query(UsuarioSistemaModel).filter(UsuarioSistemaModel.nombre_usuario == nombre).first()
    if not usuario or usuario.estado != "ACTIVO":
        raise credenciales_invalidas
    return usuario


def requiere_roles(*roles: str):
    """Dependencia que exige que el usuario autenticado tenga uno de los roles dados."""
    def _dep(usuario: UsuarioSistemaModel = Depends(get_usuario_actual)) -> UsuarioSistemaModel:
        if usuario.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"El rol {usuario.rol} no tiene permiso para esta operación.",
            )
        return usuario
    return _dep
