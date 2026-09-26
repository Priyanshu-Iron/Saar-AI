"""Admin-only routes: approve accounts and manage the AI and transcription keys."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import Caller, is_admin_email, require_admin
from app.services import accounts_store, deepgram_sync, settings_store
from app.services.llm_config import DEFAULT_MODELS

router = APIRouter(prefix="/admin", tags=["Admin"])


class SettingsUpdate(BaseModel):
    llm_provider: Literal["openai", "google"] | None = None
    llm_model: str | None = None
    openai_api_key: str | None = None
    google_api_key: str | None = None
    deepgram_api_key: str | None = None


def _user_or_404(user_id: int) -> dict:
    user = accounts_store.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/users")
def list_users(admin: Caller = Depends(require_admin)):
    users = []
    for user in accounts_store.list_users():
        is_admin = is_admin_email(user["email"])
        users.append({**user, "is_admin": is_admin, "status": "approved" if is_admin else user["status"]})
    return {"users": users}


def _approve(user_id: int, admin: Caller) -> dict:
    user = _user_or_404(user_id)
    accounts_store.set_status(user_id, "approved", admin.user_id)
    deepgram_sync.grant(user["project_id"])
    return {"id": user_id, "status": "approved"}


@router.post("/users/{user_id}/approve")
def approve_user(user_id: int, admin: Caller = Depends(require_admin)):
    return _approve(user_id, admin)


@router.post("/users/{user_id}/enable")
def enable_user(user_id: int, admin: Caller = Depends(require_admin)):
    return _approve(user_id, admin)


@router.post("/users/{user_id}/disable")
def disable_user(user_id: int, admin: Caller = Depends(require_admin)):
    user = _user_or_404(user_id)
    if is_admin_email(user["email"]):
        raise HTTPException(status_code=400, detail="The admin account can't be disabled.")
    accounts_store.set_status(user_id, "disabled", admin.user_id)
    deepgram_sync.revoke(user["project_id"])
    accounts_store.disable_api_keys(user["project_id"])
    return {"id": user_id, "status": "disabled"}


@router.get("/settings")
def get_settings(admin: Caller = Depends(require_admin)):
    return settings_store.masked_settings()


@router.put("/settings")
def update_settings(body: SettingsUpdate, admin: Caller = Depends(require_admin)):
    values = {key: value.strip() for key, value in body.model_dump().items() if value and value.strip()}
    provider = values.get("llm_provider")
    if provider and "llm_model" not in values and provider != settings_store.get_setting("llm_provider"):
        values["llm_model"] = DEFAULT_MODELS[provider]
    for key, value in values.items():
        settings_store.set_setting(key, value, admin.user_id)
    if "deepgram_api_key" in values:
        deepgram_sync.sync_all()
    return settings_store.masked_settings()
