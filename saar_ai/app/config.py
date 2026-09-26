"""Environment configuration, read at call time so tests can change it per test."""
import os
import sys

from cryptography.fernet import Fernet

DEFAULT_ORIGINS = "http://localhost:5173"


def admin_email() -> str:
    return os.getenv("ADMIN_EMAIL", "").strip().lower()


def fernet() -> Fernet:
    """Cipher for saarai_settings and Attendee's bots_credentials (same key as Attendee)."""
    return Fernet(os.getenv("CREDENTIALS_ENCRYPTION_KEY", "").encode())


def allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS)
    return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]


def missing_config() -> str | None:
    """One line describing what is missing, or None when the config is usable."""
    if not admin_email():
        return "ADMIN_EMAIL is not set. Set it to the email of the SaarAI admin account."
    key = os.getenv("CREDENTIALS_ENCRYPTION_KEY", "")
    if not key:
        return "CREDENTIALS_ENCRYPTION_KEY is not set. Use the same value as Attendee's."
    try:
        Fernet(key.encode())
    except ValueError:
        return "CREDENTIALS_ENCRYPTION_KEY is not a valid Fernet key (32 url-safe base64 bytes)."
    return None


def check_config() -> None:
    problem = missing_config()
    if problem:
        sys.exit(f"SaarAI cannot start: {problem}")
