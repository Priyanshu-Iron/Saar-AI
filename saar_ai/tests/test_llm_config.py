import pytest

from app.services import llm_config, settings_store


@pytest.fixture
def settings(monkeypatch):
    values = {}
    monkeypatch.setattr(settings_store, "get_setting", lambda key: values.get(key))
    for var in ("LLM_PROVIDER", "OPENAI_API_KEY", "GOOGLE_API_KEY", "OPENAI_MODEL", "GOOGLE_MODEL"):
        monkeypatch.delenv(var, raising=False)
    return values


def test_db_values_win(settings, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-env")
    settings.update(llm_provider="openai", llm_model="gpt-4o", openai_api_key="sk-db")
    assert llm_config.resolve_llm_settings() == ("openai", "gpt-4o", "sk-db")


def test_env_is_the_local_dev_fallback(settings, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-env")
    assert llm_config.resolve_llm_settings() == ("openai", "gpt-4o-mini", "sk-env")


def test_google_uses_its_own_key_and_default_model(settings):
    settings.update(llm_provider="google", google_api_key="g-key", openai_api_key="sk-db")
    assert llm_config.resolve_llm_settings() == ("google", "gemini-1.5-flash", "g-key")


def test_no_key_raises_not_configured(settings):
    settings.update(llm_provider="google", openai_api_key="sk-db")
    with pytest.raises(llm_config.LLMNotConfigured):
        llm_config.resolve_llm_settings()


def test_get_llm_passes_the_key_explicitly(settings):
    settings.update(openai_api_key="sk-db")
    llm = llm_config.get_llm(temperature=0.2)
    assert llm.model_name == "gpt-4o-mini"
    assert llm.openai_api_key.get_secret_value() == "sk-db"
