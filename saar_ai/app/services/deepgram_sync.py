"""Keeps Attendee's per-project Deepgram credential in step with the admin's key and approvals."""
import json

from sqlalchemy import text

from app.config import admin_email, fernet
from app.db.connection import SessionLocal
from app.services import settings_store

DEEPGRAM_CREDENTIAL_TYPE = 1  # attendee bots.models.Credentials.CredentialTypes.DEEPGRAM


def encrypt_credential(api_key: str) -> bytes:
    """Same bytes Attendee's Credentials.set_credentials writes."""
    return fernet().encrypt(json.dumps({"api_key": api_key}).encode())


def _upsert(project_ids: list[int], blob: bytes) -> None:
    db = SessionLocal()
    try:
        for project_id in project_ids:
            db.execute(
                text("""INSERT INTO bots_credentials (project_id, credential_type, _encrypted_data, created_at, updated_at)
                    VALUES (:project_id, :ctype, :blob, NOW(), NOW())
                    ON CONFLICT (project_id, credential_type)
                    DO UPDATE SET _encrypted_data = EXCLUDED._encrypted_data, updated_at = NOW()"""),
                {"project_id": project_id, "ctype": DEEPGRAM_CREDENTIAL_TYPE, "blob": blob},
            )
        db.commit()
    finally:
        db.close()


def _delete(project_id: int) -> None:
    db = SessionLocal()
    try:
        db.execute(
            text("DELETE FROM bots_credentials WHERE project_id = :project_id AND credential_type = :ctype"),
            {"project_id": project_id, "ctype": DEEPGRAM_CREDENTIAL_TYPE},
        )
        db.commit()
    finally:
        db.close()


def _approved_project_ids() -> list[int]:
    db = SessionLocal()
    try:
        rows = db.execute(
            text("""SELECT DISTINCT p.id
                FROM bots_project p
                JOIN accounts_user u ON u.organization_id = p.organization_id
                LEFT JOIN saarai_user_access a ON a.user_id = u.id
                WHERE a.status = 'approved' OR lower(u.email) = :admin"""),
            {"admin": admin_email()},
        ).all()
        return [r[0] for r in rows]
    finally:
        db.close()


def grant(project_id: int) -> bool:
    key = settings_store.get_setting("deepgram_api_key")
    if not key:
        return False
    _upsert([project_id], encrypt_credential(key))
    return True


def revoke(project_id: int) -> None:
    _delete(project_id)


def sync_all() -> int:
    key = settings_store.get_setting("deepgram_api_key")
    if not key:
        return 0
    project_ids = _approved_project_ids()
    _upsert(project_ids, encrypt_credential(key))
    return len(project_ids)
