# app/auth/dependencies.py
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException

from app.auth.utils import hash_api_key
from app.config import admin_email
from app.services import accounts_store


@dataclass(frozen=True)
class Caller:
    user_id: int
    project_id: int
    email: str
    status: str  # pending | approved | disabled
    is_admin: bool


def is_admin_email(email: str) -> bool:
    admin = admin_email()
    return bool(admin) and email.strip().lower() == admin


def get_caller(authorization: str = Header(...)) -> Caller:
    """Resolve 'Bearer <key>' to the account behind it."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    row = accounts_store.lookup_caller(hash_api_key(authorization.removeprefix("Bearer ").strip()))
    if not row:
        raise HTTPException(status_code=401, detail="Invalid or disabled API key")
    admin = is_admin_email(row["email"])
    return Caller(
        user_id=row["user_id"],
        project_id=row["project_id"],
        email=row["email"],
        status="approved" if admin else (row["status"] or "pending"),
        is_admin=admin,
    )


def require_approved(caller: Caller = Depends(get_caller)) -> int:
    """Gate for data and paid endpoints. Returns the caller's project_id."""
    if caller.status != "approved":
        raise HTTPException(status_code=403, detail=f"account_{caller.status}")
    return caller.project_id


def require_admin(caller: Caller = Depends(get_caller)) -> Caller:
    if not caller.is_admin:
        raise HTTPException(status_code=403, detail="admin_only")
    return caller
