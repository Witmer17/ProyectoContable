import base64
import hashlib
import hmac
import os
import secrets
import warnings
from datetime import datetime, timedelta, timezone

import jwt

ALGORITHM = "HS256"
TOKEN_MINUTOS = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
_PBKDF2_ITER = 240_000

_secret = os.getenv("JWT_SECRET")
if not _secret:
    warnings.warn("JWT_SECRET no definido: se usa un secreto efímero (los tokens se invalidan al reiniciar).")
    _secret = secrets.token_urlsafe(48)
JWT_SECRET = _secret


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ITER)
    return f"pbkdf2_sha256${_PBKDF2_ITER}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored:
        return False
    try:
        _, iters, salt_b64, dk_b64 = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt_b64), int(iters))
        return hmac.compare_digest(dk, base64.b64decode(dk_b64))
    except (ValueError, TypeError):
        return False


def crear_token(nombre_usuario: str, rol: str) -> str:
    ahora = datetime.now(timezone.utc)
    payload = {"sub": nombre_usuario, "rol": rol, "iat": ahora, "exp": ahora + timedelta(minutes=TOKEN_MINUTOS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def decodificar_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
