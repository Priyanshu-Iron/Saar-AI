from pathlib import Path

import pytest
from cryptography.fernet import Fernet

from app import config


def test_missing_admin_email(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAIL", "  ")
    assert "ADMIN_EMAIL is not set" in config.missing_config()


def test_missing_encryption_key(monkeypatch):
    monkeypatch.setenv("CREDENTIALS_ENCRYPTION_KEY", "")
    assert "CREDENTIALS_ENCRYPTION_KEY is not set" in config.missing_config()


def test_invalid_encryption_key(monkeypatch):
    monkeypatch.setenv("CREDENTIALS_ENCRYPTION_KEY", "not-a-key")
    assert "not a valid Fernet key" in config.missing_config()


def test_valid_config_and_admin_email_is_normalized(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAIL", " Owner@Example.com ")
    monkeypatch.setenv("CREDENTIALS_ENCRYPTION_KEY", Fernet.generate_key().decode())
    assert config.missing_config() is None
    assert config.admin_email() == "owner@example.com"


def test_check_config_exits_with_the_problem(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAIL", "")
    with pytest.raises(SystemExit, match="SaarAI cannot start: ADMIN_EMAIL"):
        config.check_config()


def test_allowed_origins(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://saar.example/, http://localhost:5173")
    assert config.allowed_origins() == ["https://saar.example", "http://localhost:5173"]
    monkeypatch.delenv("ALLOWED_ORIGINS")
    assert config.allowed_origins() == ["http://localhost:5173"]


def test_no_hardcoded_secrets_or_personal_urls():
    app_dir = Path(__file__).parents[1] / "app"
    source = "\n".join(p.read_text() for p in app_dir.rglob("*.py"))
    for needle in ("4d52f05b", "AnRIKHwG", "ngrok", "[DEBUG]"):
        assert needle not in source, needle
