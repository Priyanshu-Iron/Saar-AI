from datetime import datetime

import pytest
from cryptography.fernet import Fernet

from app.services import settings_store


@pytest.fixture
def rows(monkeypatch):
    """In-memory saarai_settings."""
    table = {}

    def write(key, value_encrypted, user_id):
        table[key] = {"value_encrypted": value_encrypted, "updated_at": datetime(2026, 9, 26, 12, 0)}

    monkeypatch.setattr(settings_store, "_read_rows", lambda: dict(table))
    monkeypatch.setattr(settings_store, "_write_row", write)
    settings_store.clear_cache()
    yield table
    settings_store.clear_cache()


def test_round_trip_is_encrypted_at_rest(rows):
    settings_store.set_setting("openai_api_key", "sk-secret-a1b2", user_id=1)
    assert b"sk-secret" not in rows["openai_api_key"]["value_encrypted"]
    assert settings_store.get_setting("openai_api_key") == "sk-secret-a1b2"


def test_unknown_key_is_rejected(rows):
    with pytest.raises(KeyError):
        settings_store.set_setting("anthropic_api_key", "x", user_id=1)


def test_missing_setting_is_none(rows):
    assert settings_store.get_setting("deepgram_api_key") is None


def test_masked_settings_never_contain_the_value(rows):
    settings_store.set_setting("llm_provider", "google", user_id=1)
    settings_store.set_setting("deepgram_api_key", "dg-0123456789-wxyz", user_id=1)
    masked = settings_store.masked_settings()
    assert masked["llm_provider"] == "google"
    assert masked["llm_model"] is None
    assert masked["deepgram_api_key"] == {"set": True, "last4": "wxyz", "updated_at": "2026-09-26T12:00:00"}
    assert masked["openai_api_key"] == {"set": False, "last4": None, "updated_at": None}
    assert "dg-0123456789" not in repr(masked)


def test_reads_are_cached_until_a_write(rows):
    settings_store.set_setting("llm_model", "gpt-4o", user_id=1)
    assert settings_store.get_setting("llm_model") == "gpt-4o"
    # A change made behind the store's back is not seen while cached...
    rows["llm_model"] = {"value_encrypted": settings_store.fernet().encrypt(b"other"), "updated_at": datetime(2026, 9, 26)}
    assert settings_store.get_setting("llm_model") == "gpt-4o"
    # ...but a write through the store clears the cache.
    settings_store.set_setting("llm_provider", "openai", user_id=1)
    assert settings_store.get_setting("llm_model") == "other"


def test_value_encrypted_with_another_key_reads_as_not_set(rows):
    rows["openai_api_key"] = {
        "value_encrypted": Fernet(Fernet.generate_key()).encrypt(b"sk-old"),
        "updated_at": datetime(2026, 9, 1),
    }
    assert settings_store.get_setting("openai_api_key") is None
    assert settings_store.masked_settings()["openai_api_key"]["set"] is False
