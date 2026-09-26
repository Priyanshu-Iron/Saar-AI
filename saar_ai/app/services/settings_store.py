"""Encrypted key/value settings the admin edits: LLM provider, model, and API keys."""
import logging
import time

from cryptography.fernet import InvalidToken
from sqlalchemy import text

from app.config import fernet  # noqa: F401
from app.db.connection import SessionLocal

logger = logging.getLogger(__name__)

PLAIN_KEYS = ("llm_provider", "llm_model")
SECRET_KEYS = ("openai_api_key", "google_api_key", "deepgram_api_key")
ALL_KEYS = PLAIN_KEYS + SECRET_KEYS
TTL_SECONDS = 30.0

_cache: dict = {"at": 0.0, "rows": None}


def _read_rows() -> dict:
    db = SessionLocal()
    try:
        rows = db.execute(text("SELECT key, value_encrypted, updated_at FROM saarai_settings")).mappings().all()
        return {r["key"]: {"value_encrypted": bytes(r["value_encrypted"]), "updated_at": r["updated_at"]} for r in rows}
    finally:
        db.close()


def _write_row(key: str, value_encrypted: bytes, user_id: int | None) -> None:
    db = SessionLocal()
    try:
        db.execute(
            text("""
                INSERT INTO saarai_settings (key, value_encrypted, updated_at, updated_by)
                VALUES (:key, :value, NOW(), :user_id)
                ON CONFLICT (key) DO UPDATE
                SET value_encrypted = EXCLUDED.value_encrypted,
                    updated_at = NOW(),
                    updated_by = EXCLUDED.updated_by
            """),
            {"key": key, "value": value_encrypted, "user_id": user_id},
        )
        db.commit()
    finally:
        db.close()


def clear_cache() -> None:
    _cache["at"] = 0.0
    _cache["rows"] = None


def _rows() -> dict:
    if _cache["rows"] is None or time.monotonic() - _cache["at"] > TTL_SECONDS:
        _cache["rows"] = _read_rows()
        _cache["at"] = time.monotonic()
    return _cache["rows"]


def get_setting(key: str) -> str | None:
    row = _rows().get(key)
    if row is None:
        return None
    try:
        return fernet().decrypt(row["value_encrypted"]).decode()
    except InvalidToken:
        logger.warning("Setting %s could not be decrypted; treating it as not set.", key)
        return None


def set_setting(key: str, value: str, user_id: int | None) -> None:
    if key not in ALL_KEYS:
        raise KeyError(key)
    _write_row(key, fernet().encrypt(value.encode()), user_id)
    clear_cache()


def masked_settings() -> dict:
    """The only shape of the settings that reaches the browser."""
    rows = _rows()
    masked: dict = {key: get_setting(key) for key in PLAIN_KEYS}
    for key in SECRET_KEYS:
        value = get_setting(key)
        masked[key] = {
            "set": value is not None,
            "last4": value[-4:] if value else None,
            "updated_at": rows[key]["updated_at"].isoformat() if value else None,
        }
    return masked
