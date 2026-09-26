import os

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

from app.services import settings_store

DEFAULT_MODELS = {"openai": "gpt-4o-mini", "google": "gemini-1.5-flash"}
_KEY_SETTINGS = {"openai": "openai_api_key", "google": "google_api_key"}
# Env values are a local-dev fallback; the admin page's settings win.
_KEY_ENV = {"openai": "OPENAI_API_KEY", "google": "GOOGLE_API_KEY"}
_MODEL_ENV = {"openai": "OPENAI_MODEL", "google": "GOOGLE_MODEL"}


class LLMNotConfigured(RuntimeError):
    """No API key is available for the chosen provider."""


def resolve_llm_settings() -> tuple[str, str, str]:
    provider = (settings_store.get_setting("llm_provider") or os.getenv("LLM_PROVIDER") or "openai").lower()
    if provider not in DEFAULT_MODELS:
        provider = "openai"
    model = settings_store.get_setting("llm_model") or os.getenv(_MODEL_ENV[provider]) or DEFAULT_MODELS[provider]
    key = settings_store.get_setting(_KEY_SETTINGS[provider]) or os.getenv(_KEY_ENV[provider])
    if not key:
        raise LLMNotConfigured(f"No API key is set for {provider}.")
    return provider, model, key


def get_llm(temperature: float = 0.7):
    provider, model, key = resolve_llm_settings()
    if provider == "google":
        return ChatGoogleGenerativeAI(model=model, temperature=temperature, api_key=key)
    return ChatOpenAI(model=model, temperature=temperature, api_key=key)
