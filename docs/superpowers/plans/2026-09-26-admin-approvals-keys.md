# Admin, Account Approvals, and Keys in the Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New SaarAI accounts wait for the admin's approval, the admin manages LLM and Deepgram keys from an in-app page backed by encrypted DB rows, and no secret or personal URL is hardcoded.

**Architecture:** Two SaarAI-owned tables (`saarai_user_access`, `saarai_settings`) next to `saarai_outputs`. All account SQL moves into `app/services/accounts_store.py`; FastAPI dependencies (`get_caller`, `require_approved`, `require_admin`) gate every route. Settings are Fernet-encrypted with `CREDENTIALS_ENCRYPTION_KEY`, the same key Attendee uses, so SaarAI can also write Attendee's per-project Deepgram credential on approval. The React app learns `status` and `isAdmin` from `/auth/me`, sends pending users to `/pending`, and shows `/admin` to the admin.

**Tech Stack:** FastAPI, SQLAlchemy `text()` on Attendee's Postgres, `cryptography.fernet`, LangChain (`langchain_openai`, `langchain_google_genai`), pytest; React 18, react-router 6, Vitest, Testing Library, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-26-admin-approvals-keys-design.md`

## Global Constraints

- Backend tests run from `saar_ai/` with `../.venv/bin/python -m pytest tests -q`. Do not run bare `pytest` there: `saar_ai/test_generators.py` is a stale script that fails collection and is out of scope.
- Frontend tests run from `frontend/` with `npx vitest run`; types with `npx tsc -b`.
- Required env: `CREDENTIALS_ENCRYPTION_KEY` (must equal Attendee's), `ADMIN_EMAIL`. Optional: `ALLOWED_ORIGINS` (default `http://localhost:5173`), `ATTENDEE_API_URL` (default `http://localhost:8000`), `OPENAI_API_KEY` / `GOOGLE_API_KEY` (local-dev fallback only).
- Config values are read at call time (`app/config.py`), never captured at import, so tests can set them per test.
- Admin comparison is case-insensitive and whitespace-trimmed. The admin's status is always reported as `approved`.
- 403 details are exactly `account_pending`, `account_disabled`, `admin_only`.
- Stored keys never reach the browser. Only `{set, last4, updated_at}`.
- Deepgram credential format (Attendee): `bots_credentials`, `credential_type = 1`, `_encrypted_data = Fernet(key).encrypt(json.dumps({"api_key": k}).encode())`, unique on `(project_id, credential_type)`.
- Attendee's `accounts_user.role = 'admin'` stays for new users (it means admin of their own single-user organization).
- UI copy: sentence case, no pills or status dots (status is plain text), no middle-dot meta strings, buttons name the action.
- Do not change anything under `attendee/`.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A pending user calls a data endpoint directly with their key** (curl, not the UI): expect 403 `account_pending` on every `/meetings/*` and `/generate/*` route. Pinned in Task 6 by a test that walks every route on both routers.
2. **The admin's email is typed with different case or spaces at signup** (`Owner@Example.com `): expect the account to be the admin. Pinned in Task 1 (`admin_email` normalizes) and Task 7 (register test uses mixed case).
3. **The admin switches provider from OpenAI to Gemini and saves without touching the model**: expect the model to become the Gemini default, not stay `gpt-4o-mini`. Pinned in Task 9 (API) and Task 13 (UI).
4. **The encryption key is rotated after keys were saved**: expect those keys to read as "Not set" and generation to return the 503 not-configured message, not a 500. Pinned in Task 3 (undecryptable value) and Task 8 (503 mapping).
5. **SQL that unit tests monkeypatch away is wrong against the real schema** (Attendee column names, `ON CONFLICT` targets): expect the opt-in DB test (Task 4) and the end-to-end run (Task 14) to exercise every query in `accounts_store` and `deepgram_sync` against the local Postgres.

---

## File map

Backend (`saar_ai/`):
- Create `app/config.py`: env access and startup check.
- Modify `app/db/init_saarai_tables.py`: two tables and the backfill.
- Create `app/services/settings_store.py`: encrypted settings with cache and masking.
- Create `app/services/accounts_store.py`: all account, key and access SQL.
- Create `app/services/deepgram_sync.py`: Attendee Deepgram credential writes.
- Modify `app/auth/dependencies.py`: `Caller`, `get_caller`, `require_approved`, `require_admin`.
- Rewrite `app/routers/auth.py`: register, login, me.
- Create `app/routers/admin.py`.
- Modify `app/services/llm_config.py`, `app/routers/generate.py`, `app/routers/meetings.py`, `app/main.py`.
- Create `.env.example`. Tests in `tests/`.

Frontend (`frontend/src/`):
- Modify `api.ts`, `context/AuthContext.tsx`, `components/auth/ProtectedRoute.tsx`, `components/layout/Rail.tsx`, `router/AppRouter.tsx`, `pages/Login.tsx`, `pages/Settings.tsx`.
- Create `components/auth/AdminRoute.tsx`, `pages/Pending.tsx`, `pages/Admin.tsx`, `components/admin/UsersPanel.tsx`, `components/admin/KeysPanel.tsx`, `test/auth.ts`.

---

### Task 1: Config module, startup check, CORS, and removing hardcoded values

**Files:**
- Create: `saar_ai/app/config.py`
- Create: `saar_ai/.env.example`
- Modify: `saar_ai/app/main.py`
- Modify: `saar_ai/app/routers/auth.py:1-18, 69-78`
- Modify: `saar_ai/app/routers/meetings.py:30, 60`
- Modify: `saar_ai/tests/conftest.py`
- Test: `saar_ai/tests/test_config.py`

**Interfaces:**
- Produces: `config.admin_email() -> str` (trimmed, lowercased, `""` if unset), `config.fernet() -> Fernet`, `config.allowed_origins() -> list[str]`, `config.missing_config() -> str | None`, `config.check_config() -> None` (exits).

- [ ] **Step 1: Pin test env in conftest**

Replace the top of `saar_ai/tests/conftest.py` (before `import pytest`) so tests never depend on a developer's `.env`:

```python
import os

from cryptography.fernet import Fernet

os.environ["SAARAI_SKIP_DB_INIT"] = "1"
# Set before app import; load_dotenv never overrides existing variables.
os.environ["ADMIN_EMAIL"] = "admin@example.com"
os.environ["CREDENTIALS_ENCRYPTION_KEY"] = Fernet.generate_key().decode()
```

- [ ] **Step 2: Write the failing tests**

`saar_ai/tests/test_config.py`:

```python
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests/test_config.py -q`
Expected: collection error `ImportError: cannot import name 'config' from 'app'`.

- [ ] **Step 4: Create `saar_ai/app/config.py`**

```python
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
```

- [ ] **Step 5: Remove hardcoded values**

In `saar_ai/app/routers/auth.py`:
- Delete lines 16-18 (the comment, `DEEPGRAM_API_KEY = ...`, `CREDENTIALS_ENCRYPTION_KEY = ...`).
- Delete the whole `# 2.5. Create Deepgram Credential for this project` block (the `f = Fernet(...)` line through the `bots_credentials` `db.execute(...)` call).
- Delete the now-unused imports `json`, `os`, and `from cryptography.fernet import Fernet`.

(Task 7 rewrites this file; this step only removes the secrets so no commit contains them after this one.)

In `saar_ai/app/routers/meetings.py`:
- Delete the line `WEBHOOK_URL = os.getenv("WEBHOOK_URL", "https://rohan-realizing-cicely.ngrok-free.dev/my-ai-handler")`.
- Delete the line `print(f"[DEBUG] Bot creation payload: {payload}")`.

- [ ] **Step 6: Wire `main.py`**

Replace `saar_ai/app/main.py` imports and startup/CORS blocks:

```python
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import allowed_origins, check_config
from app.routers import auth, meetings, generate
from app.db.init_saarai_tables import init_saarai_tables

app = FastAPI(
    title="SaarAI",
    description="AI-Powered Meeting Intelligence — MOM, Insights & Strategy",
    version="1.0.0",
)

# Check config and create SaarAI tables on startup. Tests set SAARAI_SKIP_DB_INIT=1.
if os.getenv("SAARAI_SKIP_DB_INIT") != "1":
    check_config()
    init_saarai_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Leave the router includes and health check unchanged.

- [ ] **Step 7: Create `saar_ai/.env.example`**

```bash
# Attendee's Postgres (values from attendee/dev.docker-compose.yaml locally)
DB_HOST=
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=

# Required. Must equal CREDENTIALS_ENCRYPTION_KEY in attendee/.env.
# Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
CREDENTIALS_ENCRYPTION_KEY=

# Required. The account that signs up with this email is the SaarAI admin.
ADMIN_EMAIL=

# Optional. Comma-separated origins allowed to call the API.
ALLOWED_ORIGINS=http://localhost:5173

# Optional. Attendee's API.
ATTENDEE_API_URL=http://localhost:8000

# Optional, local development only. The admin page's keys take precedence.
OPENAI_API_KEY=
GOOGLE_API_KEY=
```

Check `saar_ai/.gitignore` ignores `.env` but not `.env.example`: `git check-ignore -v saar_ai/.env.example` must print nothing.

- [ ] **Step 8: Run all backend tests**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests -q`
Expected: all pass (22 existing + 7 new).

- [ ] **Step 9: Commit**

```bash
git add saar_ai/app/config.py saar_ai/app/main.py saar_ai/app/routers/auth.py saar_ai/app/routers/meetings.py saar_ai/.env.example saar_ai/tests/conftest.py saar_ai/tests/test_config.py
git commit -m "fix(backend): drop hardcoded keys and ngrok URL, require config at startup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: SaarAI access and settings tables

**Files:**
- Modify: `saar_ai/app/db/init_saarai_tables.py`

**Interfaces:**
- Produces: tables `saarai_user_access(user_id PK, status, created_at, decided_at, decided_by)` and `saarai_settings(key PK, value_encrypted BYTEA, updated_at, updated_by)`.

- [ ] **Step 1: Add the DDL and backfill**

In `init_saarai_tables()`, after the `ALTER TABLE saarai_outputs ...` execute and before `conn.commit()`:

```python
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS saarai_user_access (
                    user_id     INTEGER PRIMARY KEY REFERENCES accounts_user(id) ON DELETE CASCADE,
                    status      VARCHAR(10) NOT NULL CHECK (status IN ('pending', 'approved', 'disabled')),
                    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
                    decided_at  TIMESTAMP,
                    decided_by  INTEGER REFERENCES accounts_user(id) ON DELETE SET NULL
                )
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS saarai_settings (
                    key              VARCHAR(40) PRIMARY KEY,
                    value_encrypted  BYTEA NOT NULL,
                    updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_by       INTEGER REFERENCES accounts_user(id) ON DELETE SET NULL
                )
            """))
            # Accounts that predate approvals keep working. Registration always writes
            # its own row in the same transaction, so new signups never land here.
            conn.execute(text("""
                INSERT INTO saarai_user_access (user_id, status, decided_at)
                SELECT id, 'approved', NOW() FROM accounts_user
                ON CONFLICT (user_id) DO NOTHING
            """))
```

- [ ] **Step 2: Run it against the local Postgres**

Attendee's Postgres must be up (`docker ps` shows `attendee-postgres-1`). Run:

```bash
cd saar_ai && ../.venv/bin/python -c "from app.db.init_saarai_tables import init_saarai_tables; init_saarai_tables(); init_saarai_tables(); print('ok')"
docker exec attendee-postgres-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\d saarai_user_access" -c "\d saarai_settings" -c "SELECT status, count(*) FROM saarai_user_access GROUP BY status"'
```

Expected: `ok` (running twice proves it is idempotent), both table descriptions, and one `approved` row count equal to `SELECT count(*) FROM accounts_user`.

- [ ] **Step 3: Run backend tests**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests -q` → all pass.

- [ ] **Step 4: Commit**

```bash
git add saar_ai/app/db/init_saarai_tables.py
git commit -m "feat(backend): add saarai_user_access and saarai_settings tables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Encrypted settings store

**Files:**
- Create: `saar_ai/app/services/settings_store.py`
- Test: `saar_ai/tests/test_settings_store.py`

**Interfaces:**
- Consumes: `config.fernet()`.
- Produces: `PLAIN_KEYS`, `SECRET_KEYS`, `ALL_KEYS` tuples; `get_setting(key: str) -> str | None`; `set_setting(key: str, value: str, user_id: int | None) -> None` (raises `KeyError` for unknown keys); `masked_settings() -> dict` shaped `{"llm_provider": str|None, "llm_model": str|None, "<secret>": {"set": bool, "last4": str|None, "updated_at": str|None}}`; `clear_cache() -> None`. Internal seams for tests: `_read_rows() -> dict[str, {"value_encrypted": bytes, "updated_at": datetime}]`, `_write_row(key, value_encrypted: bytes, user_id)`.

- [ ] **Step 1: Write the failing tests**

`saar_ai/tests/test_settings_store.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests/test_settings_store.py -q`
Expected: `ImportError` for `settings_store`.

- [ ] **Step 3: Implement `saar_ai/app/services/settings_store.py`**

```python
"""Encrypted key/value settings the admin edits: LLM provider, model, and API keys."""
import logging
import time

from cryptography.fernet import InvalidToken
from sqlalchemy import text

from app.config import fernet
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests/test_settings_store.py -q` → 6 passed.

- [ ] **Step 5: Commit**

```bash
git add saar_ai/app/services/settings_store.py saar_ai/tests/test_settings_store.py
git commit -m "feat(backend): encrypted settings store with masked reads

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Accounts store (all account, key, and access SQL)

**Files:**
- Create: `saar_ai/app/services/accounts_store.py`
- Test: `saar_ai/tests/test_accounts_store_db.py` (opt-in, runs against the local Postgres)

**Interfaces:**
- Consumes: `app.auth.utils.generate_api_key`, `hash_api_key`.
- Produces:
  - `email_exists(email: str) -> bool` (case-insensitive)
  - `create_account(email: str, password_hash: str, status: str) -> {"user_id": int, "project_id": int, "api_key": str}`
  - `find_login_user(email: str) -> {"user_id", "email", "password", "project_id", "status": str|None} | None`
  - `rotate_api_key(project_id: int) -> str`
  - `lookup_caller(key_hash: str) -> {"user_id", "project_id", "email", "status": str|None} | None`
  - `list_users() -> list[{"id", "email", "joined_at": datetime, "status": str, "decided_at": datetime|None}]` (pending first, then newest)
  - `get_user(user_id: int) -> {"id", "email", "project_id", "status"} | None`
  - `set_status(user_id: int, status: str, decided_by: int | None) -> None`
  - `disable_api_keys(project_id: int) -> None`

- [ ] **Step 1: Write the opt-in DB test**

`saar_ai/tests/test_accounts_store_db.py`:

```python
"""Runs every accounts_store query against the local Postgres. Opt in with SAARAI_DB_TESTS=1."""
import os
import uuid

import pytest
from sqlalchemy import text

pytestmark = pytest.mark.skipif(os.getenv("SAARAI_DB_TESTS") != "1", reason="set SAARAI_DB_TESTS=1 to run")


@pytest.fixture
def store():
    from app.db.init_saarai_tables import init_saarai_tables
    from app.services import accounts_store

    init_saarai_tables()
    return accounts_store


@pytest.fixture
def cleanup():
    project_ids = []
    yield project_ids
    from app.db.connection import SessionLocal

    db = SessionLocal()
    try:
        for pid in project_ids:
            org_id = db.execute(text("SELECT organization_id FROM bots_project WHERE id = :p"), {"p": pid}).scalar()
            db.execute(text("DELETE FROM bots_apikey WHERE project_id = :p"), {"p": pid})
            db.execute(text("DELETE FROM bots_credentials WHERE project_id = :p"), {"p": pid})
            db.execute(text("DELETE FROM accounts_user WHERE organization_id = :o"), {"o": org_id})
            db.execute(text("DELETE FROM bots_project WHERE id = :p"), {"p": pid})
            db.execute(text("DELETE FROM accounts_organization WHERE id = :o"), {"o": org_id})
        db.commit()
    finally:
        db.close()


def test_account_lifecycle(store, cleanup):
    from app.auth.utils import hash_api_key

    email = f"db-test-{uuid.uuid4().hex[:8]}@Example.com"
    account = store.create_account(email, "not-a-real-hash", "pending")
    cleanup.append(account["project_id"])

    assert store.email_exists(email.lower())
    login = store.find_login_user(email.upper())
    assert login["user_id"] == account["user_id"] and login["status"] == "pending"

    caller = store.lookup_caller(hash_api_key(account["api_key"]))
    assert caller == {"user_id": account["user_id"], "project_id": account["project_id"], "email": email, "status": "pending"}

    listed = {u["id"]: u for u in store.list_users()}
    assert listed[account["user_id"]]["status"] == "pending"

    store.set_status(account["user_id"], "approved", decided_by=None)
    assert store.get_user(account["user_id"])["status"] == "approved"

    new_key = store.rotate_api_key(account["project_id"])
    assert store.lookup_caller(hash_api_key(account["api_key"])) is None
    assert store.lookup_caller(hash_api_key(new_key))["status"] == "approved"

    store.disable_api_keys(account["project_id"])
    assert store.lookup_caller(hash_api_key(new_key)) is None
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd saar_ai && SAARAI_DB_TESTS=1 ../.venv/bin/python -m pytest tests/test_accounts_store_db.py -q`
Expected: FAIL, `ImportError: cannot import name 'accounts_store'`.

- [ ] **Step 3: Implement `saar_ai/app/services/accounts_store.py`**

The organization/project/user column lists are copied from the current `routers/auth.py` register SQL.

```python
"""Accounts, API keys, and SaarAI access status. All SQL for auth and admin lives here."""
import secrets
import string
import uuid

from sqlalchemy import text

from app.auth.utils import generate_api_key, hash_api_key
from app.db.connection import SessionLocal


def _object_id(prefix: str) -> str:
    return prefix + "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))


def _insert_api_key(db, project_id: int, name: str) -> str:
    api_key = generate_api_key()
    db.execute(
        text("""INSERT INTO bots_apikey (name, project_id, key_hash, object_id, created_at, updated_at)
            VALUES (:name, :project_id, :key_hash, :obj_id, NOW(), NOW())"""),
        {"name": name, "project_id": project_id, "key_hash": hash_api_key(api_key), "obj_id": _object_id("key_")},
    )
    return api_key


def email_exists(email: str) -> bool:
    db = SessionLocal()
    try:
        row = db.execute(text("SELECT 1 FROM accounts_user WHERE lower(email) = lower(:email)"), {"email": email}).first()
        return row is not None
    finally:
        db.close()


def create_account(email: str, password_hash: str, status: str) -> dict:
    """Create organization, project, user, access row, and first API key in one transaction."""
    db = SessionLocal()
    try:
        org_id = db.execute(
            text("""INSERT INTO accounts_organization
                (name, created_at, updated_at, centicredits, version,
                 is_webhooks_enabled, is_async_transcription_enabled,
                 is_managed_zoom_oauth_enabled, is_app_sessions_enabled,
                 autopay_enabled, autopay_threshold_centricredits, autopay_amount_to_purchase_cents)
                VALUES (:name, NOW(), NOW(), 500, 0,
                 true, false, true, false,
                 false, 1000, 5000)
                RETURNING id"""),
            {"name": f"{email}'s organization"},
        ).scalar()
        project_id = db.execute(
            text("""INSERT INTO bots_project (name, organization_id, object_id, created_at, updated_at)
                VALUES (:name, :org_id, :obj_id, NOW(), NOW()) RETURNING id"""),
            {"name": f"{email}'s project", "org_id": org_id, "obj_id": _object_id("proj_")},
        ).scalar()
        # role='admin' is Attendee's admin of this user's own organization, not a SaarAI admin.
        user_id = db.execute(
            text("""INSERT INTO accounts_user
                (email, password, username, organization_id, object_id, role,
                 is_active, is_staff, is_superuser, date_joined, first_name, last_name)
                VALUES (:email, :password, :username, :org_id, :obj_id, 'admin',
                 true, false, false, NOW(), '', '')
                RETURNING id"""),
            {"email": email, "password": password_hash, "username": str(uuid.uuid4()),
             "org_id": org_id, "obj_id": _object_id("usr_")},
        ).scalar()
        db.execute(
            text("""INSERT INTO saarai_user_access (user_id, status, decided_at)
                VALUES (:user_id, :status, CASE WHEN :status = 'approved' THEN NOW() END)"""),
            {"user_id": user_id, "status": status},
        )
        api_key = _insert_api_key(db, project_id, "Default Key")
        db.commit()
        return {"user_id": user_id, "project_id": project_id, "api_key": api_key}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def find_login_user(email: str) -> dict | None:
    db = SessionLocal()
    try:
        row = db.execute(
            text("""SELECT u.id AS user_id, u.email, u.password, p.id AS project_id, a.status
                FROM accounts_user u
                JOIN bots_project p ON p.organization_id = u.organization_id
                LEFT JOIN saarai_user_access a ON a.user_id = u.id
                WHERE lower(u.email) = lower(:email)
                ORDER BY p.id
                LIMIT 1"""),
            {"email": email},
        ).mappings().first()
        return dict(row) if row else None
    finally:
        db.close()


def rotate_api_key(project_id: int) -> str:
    """Disable the project's live keys and issue a new one (avoids key accumulation)."""
    db = SessionLocal()
    try:
        db.execute(
            text("UPDATE bots_apikey SET disabled_at = NOW() WHERE project_id = :pid AND disabled_at IS NULL"),
            {"pid": project_id},
        )
        api_key = _insert_api_key(db, project_id, "Login Key")
        db.commit()
        return api_key
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def lookup_caller(key_hash: str) -> dict | None:
    db = SessionLocal()
    try:
        row = db.execute(
            text("""SELECT u.id AS user_id, k.project_id, u.email, a.status
                FROM bots_apikey k
                JOIN bots_project p ON p.id = k.project_id
                JOIN accounts_user u ON u.organization_id = p.organization_id
                LEFT JOIN saarai_user_access a ON a.user_id = u.id
                WHERE k.key_hash = :key_hash AND k.disabled_at IS NULL
                ORDER BY u.id
                LIMIT 1"""),
            {"key_hash": key_hash},
        ).mappings().first()
        return dict(row) if row else None
    finally:
        db.close()


def list_users() -> list[dict]:
    db = SessionLocal()
    try:
        rows = db.execute(
            text("""SELECT u.id, u.email, u.date_joined AS joined_at,
                       COALESCE(a.status, 'pending') AS status, a.decided_at
                FROM accounts_user u
                LEFT JOIN saarai_user_access a ON a.user_id = u.id
                ORDER BY (COALESCE(a.status, 'pending') = 'pending') DESC, u.date_joined DESC""")
        ).mappings().all()
        return [dict(r) for r in rows]
    finally:
        db.close()


def get_user(user_id: int) -> dict | None:
    db = SessionLocal()
    try:
        row = db.execute(
            text("""SELECT u.id, u.email, p.id AS project_id, COALESCE(a.status, 'pending') AS status
                FROM accounts_user u
                JOIN bots_project p ON p.organization_id = u.organization_id
                LEFT JOIN saarai_user_access a ON a.user_id = u.id
                WHERE u.id = :user_id
                ORDER BY p.id
                LIMIT 1"""),
            {"user_id": user_id},
        ).mappings().first()
        return dict(row) if row else None
    finally:
        db.close()


def set_status(user_id: int, status: str, decided_by: int | None) -> None:
    db = SessionLocal()
    try:
        db.execute(
            text("""INSERT INTO saarai_user_access (user_id, status, decided_at, decided_by)
                VALUES (:user_id, :status, NOW(), :decided_by)
                ON CONFLICT (user_id) DO UPDATE
                SET status = EXCLUDED.status, decided_at = NOW(), decided_by = EXCLUDED.decided_by"""),
            {"user_id": user_id, "status": status, "decided_by": decided_by},
        )
        db.commit()
    finally:
        db.close()


def disable_api_keys(project_id: int) -> None:
    db = SessionLocal()
    try:
        db.execute(
            text("UPDATE bots_apikey SET disabled_at = NOW() WHERE project_id = :pid AND disabled_at IS NULL"),
            {"pid": project_id},
        )
        db.commit()
    finally:
        db.close()
```

- [ ] **Step 4: Run the DB test**

Run: `cd saar_ai && SAARAI_DB_TESTS=1 ../.venv/bin/python -m pytest tests/test_accounts_store_db.py -q`
Expected: 1 passed. If an INSERT fails on a NOT NULL column, compare against `\d accounts_user` / `\d accounts_organization` in psql and add the column with the value Attendee's model default uses; note it in the commit message.

Then: `cd saar_ai && ../.venv/bin/python -m pytest tests -q` → all pass, the DB test shows as skipped.

- [ ] **Step 5: Commit**

```bash
git add saar_ai/app/services/accounts_store.py saar_ai/tests/test_accounts_store_db.py
git commit -m "feat(backend): accounts store for account, key, and access queries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Deepgram credential sync

**Files:**
- Create: `saar_ai/app/services/deepgram_sync.py`
- Test: `saar_ai/tests/test_deepgram_sync.py`
- Modify: `saar_ai/tests/test_accounts_store_db.py` (add a DB test for the upsert)

**Interfaces:**
- Consumes: `settings_store.get_setting("deepgram_api_key")`, `config.fernet()`, `config.admin_email()`.
- Produces: `DEEPGRAM_CREDENTIAL_TYPE = 1`; `encrypt_credential(api_key: str) -> bytes`; `grant(project_id: int) -> bool` (False when no key is stored); `revoke(project_id: int) -> None`; `sync_all() -> int` (projects written). Seams: `_upsert(project_ids: list[int], blob: bytes)`, `_delete(project_id: int)`, `_approved_project_ids() -> list[int]`.

- [ ] **Step 1: Write the failing tests**

`saar_ai/tests/test_deepgram_sync.py`:

```python
import json

import pytest

from app.config import fernet
from app.services import deepgram_sync, settings_store


@pytest.fixture
def calls(monkeypatch):
    log = {"upsert": [], "delete": []}
    monkeypatch.setattr(deepgram_sync, "_upsert", lambda ids, blob: log["upsert"].append((list(ids), blob)))
    monkeypatch.setattr(deepgram_sync, "_delete", lambda pid: log["delete"].append(pid))
    monkeypatch.setattr(deepgram_sync, "_approved_project_ids", lambda: [3, 5])
    return log


def use_key(monkeypatch, value):
    monkeypatch.setattr(settings_store, "get_setting", lambda key: value if key == "deepgram_api_key" else None)


def test_credential_uses_attendees_format():
    blob = deepgram_sync.encrypt_credential("dg-key")
    assert json.loads(fernet().decrypt(blob)) == {"api_key": "dg-key"}


def test_grant_writes_the_stored_key(monkeypatch, calls):
    use_key(monkeypatch, "dg-key")
    assert deepgram_sync.grant(7) is True
    [(ids, blob)] = calls["upsert"]
    assert ids == [7]
    assert json.loads(fernet().decrypt(blob)) == {"api_key": "dg-key"}


def test_grant_without_a_key_does_nothing(monkeypatch, calls):
    use_key(monkeypatch, None)
    assert deepgram_sync.grant(7) is False
    assert calls["upsert"] == []


def test_revoke_deletes(calls):
    deepgram_sync.revoke(7)
    assert calls["delete"] == [7]


def test_sync_all_writes_every_approved_project(monkeypatch, calls):
    use_key(monkeypatch, "dg-new")
    assert deepgram_sync.sync_all() == 2
    assert calls["upsert"][0][0] == [3, 5]


def test_sync_all_without_a_key_does_nothing(monkeypatch, calls):
    use_key(monkeypatch, None)
    assert deepgram_sync.sync_all() == 0
    assert calls["upsert"] == []
```

Append to `saar_ai/tests/test_accounts_store_db.py`:

```python
def test_deepgram_upsert_and_delete(store, cleanup):
    import json

    from app.config import fernet
    from app.db.connection import SessionLocal
    from app.services import deepgram_sync

    email = f"db-test-{uuid.uuid4().hex[:8]}@example.com"
    account = store.create_account(email, "not-a-real-hash", "approved")
    cleanup.append(account["project_id"])
    pid = account["project_id"]

    deepgram_sync._upsert([pid], deepgram_sync.encrypt_credential("first"))
    deepgram_sync._upsert([pid], deepgram_sync.encrypt_credential("second"))
    assert pid in deepgram_sync._approved_project_ids()

    db = SessionLocal()
    try:
        rows = db.execute(
            text("SELECT _encrypted_data FROM bots_credentials WHERE project_id = :p AND credential_type = 1"), {"p": pid}
        ).all()
    finally:
        db.close()
    assert len(rows) == 1
    assert json.loads(fernet().decrypt(bytes(rows[0][0]))) == {"api_key": "second"}

    deepgram_sync._delete(pid)
    db = SessionLocal()
    try:
        assert db.execute(text("SELECT 1 FROM bots_credentials WHERE project_id = :p"), {"p": pid}).first() is None
    finally:
        db.close()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests/test_deepgram_sync.py -q`
Expected: `ImportError` for `deepgram_sync`.

- [ ] **Step 3: Implement `saar_ai/app/services/deepgram_sync.py`**

```python
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
```

- [ ] **Step 4: Run tests**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests/test_deepgram_sync.py -q` → 6 passed.
Run: `cd saar_ai && SAARAI_DB_TESTS=1 ../.venv/bin/python -m pytest tests/test_accounts_store_db.py -q` → 2 passed.

- [ ] **Step 5: Commit**

```bash
git add saar_ai/app/services/deepgram_sync.py saar_ai/tests/test_deepgram_sync.py saar_ai/tests/test_accounts_store_db.py
git commit -m "feat(backend): sync Attendee Deepgram credentials from the admin key

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Caller dependencies and gating every data route

**Files:**
- Modify: `saar_ai/app/auth/dependencies.py` (rewrite)
- Modify: `saar_ai/app/routers/meetings.py`, `saar_ai/app/routers/generate.py` (dependency swap)
- Modify: `saar_ai/tests/conftest.py`
- Test: `saar_ai/tests/test_dependencies.py`

**Interfaces:**
- Consumes: `accounts_store.lookup_caller`, `config.admin_email`, `hash_api_key`.
- Produces: `Caller(user_id: int, project_id: int, email: str, status: str, is_admin: bool)` (frozen dataclass); `is_admin_email(email: str) -> bool`; `get_caller(authorization: str = Header(...)) -> Caller`; `require_approved(caller) -> int` (project_id); `require_admin(caller) -> Caller`. `verify_api_key` is removed. Test fixtures `api` (client, no overrides) and `as_caller(**overrides) -> Caller`.

- [ ] **Step 1: Update conftest**

Replace everything below the env block in `saar_ai/tests/conftest.py`:

```python
import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import Caller, get_caller, require_approved
from app.main import app

BASE_CALLER = {"user_id": 2, "project_id": 1, "email": "user@example.com", "status": "approved", "is_admin": False}


@pytest.fixture
def client():
    """Client for route tests that don't care about auth: every call is project 1."""
    app.dependency_overrides[require_approved] = lambda: 1
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def api():
    """Client with real auth gates; pair with as_caller."""
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def as_caller():
    def use(**overrides) -> Caller:
        caller = Caller(**{**BASE_CALLER, **overrides})
        app.dependency_overrides[get_caller] = lambda: caller
        return caller

    yield use
    app.dependency_overrides.clear()
```

- [ ] **Step 2: Write the failing tests**

`saar_ai/tests/test_dependencies.py`:

```python
import pytest
from fastapi import HTTPException

from app.auth import dependencies as deps
from app.auth.utils import hash_api_key
from app.main import app
from app.routers import generate as gen


def row(**overrides):
    return {"user_id": 2, "project_id": 9, "email": "user@example.com", "status": "approved", **overrides}


def test_get_caller_resolves_the_key(monkeypatch):
    seen = {}
    monkeypatch.setattr(deps.accounts_store, "lookup_caller", lambda h: seen.setdefault("hash", h) and row())
    caller = deps.get_caller("Bearer secret-key")
    assert seen["hash"] == hash_api_key("secret-key")
    assert caller == deps.Caller(user_id=2, project_id=9, email="user@example.com", status="approved", is_admin=False)


def test_get_caller_rejects_bad_header_and_unknown_key(monkeypatch):
    monkeypatch.setattr(deps.accounts_store, "lookup_caller", lambda h: None)
    with pytest.raises(HTTPException) as bad:
        deps.get_caller("Token abc")
    assert bad.value.status_code == 401
    with pytest.raises(HTTPException) as unknown:
        deps.get_caller("Bearer abc")
    assert unknown.value.status_code == 401


def test_missing_access_row_counts_as_pending(monkeypatch):
    monkeypatch.setattr(deps.accounts_store, "lookup_caller", lambda h: row(status=None))
    assert deps.get_caller("Bearer k").status == "pending"


def test_admin_email_is_always_approved(monkeypatch):
    monkeypatch.setattr(deps.accounts_store, "lookup_caller", lambda h: row(email=" Admin@Example.com", status="pending"))
    caller = deps.get_caller("Bearer k")
    assert caller.is_admin and caller.status == "approved"


@pytest.mark.parametrize("status", ["pending", "disabled"])
def test_require_approved_blocks(status):
    caller = deps.Caller(user_id=2, project_id=9, email="u@example.com", status=status, is_admin=False)
    with pytest.raises(HTTPException) as exc:
        deps.require_approved(caller)
    assert (exc.value.status_code, exc.value.detail) == (403, f"account_{status}")


def test_require_approved_returns_project():
    caller = deps.Caller(user_id=2, project_id=9, email="u@example.com", status="approved", is_admin=False)
    assert deps.require_approved(caller) == 9


def test_require_admin():
    user = deps.Caller(user_id=2, project_id=9, email="u@example.com", status="approved", is_admin=False)
    with pytest.raises(HTTPException) as exc:
        deps.require_admin(user)
    assert (exc.value.status_code, exc.value.detail) == (403, "admin_only")
    admin = deps.Caller(user_id=1, project_id=1, email="admin@example.com", status="approved", is_admin=True)
    assert deps.require_admin(admin) is admin


def data_routes():
    """Every /meetings and /generate route, with a sample path."""
    for route in app.routes:
        path = getattr(route, "path", "")
        if path.startswith(("/meetings", "/generate")):
            for method in route.methods - {"HEAD", "OPTIONS"}:
                yield method, path.replace("{bot_id}", "7")


@pytest.mark.parametrize("method,path", sorted(set(data_routes())))
def test_pending_user_is_blocked_on_every_data_route(api, as_caller, method, path):
    as_caller(status="pending")
    response = api.request(
        method, path, json={"meeting_url": "https://meet.example/x"}, headers={"Authorization": "Bearer k"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "account_pending"


def test_approved_user_passes_the_gate(api, as_caller, monkeypatch):
    as_caller(status="approved")
    monkeypatch.setattr(gen, "verify_bot_access", lambda bot_id, project_id: False)
    assert api.get("/generate/status/7").status_code == 404
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests/test_dependencies.py -q`
Expected: collection error, `cannot import name 'Caller'`.

- [ ] **Step 4: Rewrite `saar_ai/app/auth/dependencies.py`**

```python
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
```

- [ ] **Step 5: Swap the dependency in both routers**

```bash
cd saar_ai
sed -i '' 's/verify_api_key/require_approved/g' app/routers/meetings.py app/routers/generate.py
grep -rn "verify_api_key" app tests
```

Expected: the grep prints nothing. (`sed -i ''` is the macOS form; on Linux use `sed -i`.)

- [ ] **Step 6: Run all backend tests**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests -q` → all pass (existing router tests use the `client` fixture, which now overrides `require_approved`).

- [ ] **Step 7: Commit**

```bash
git add saar_ai/app/auth/dependencies.py saar_ai/app/routers/meetings.py saar_ai/app/routers/generate.py saar_ai/tests/conftest.py saar_ai/tests/test_dependencies.py
git commit -m "feat(backend): gate meetings and generation on approved accounts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Register, login, and `/auth/me`

**Files:**
- Modify: `saar_ai/app/routers/auth.py` (rewrite)
- Test: `saar_ai/tests/test_auth_router.py`

**Interfaces:**
- Consumes: `accounts_store.email_exists / create_account / find_login_user / rotate_api_key`, `deepgram_sync.grant`, `is_admin_email`, `get_caller`.
- Produces: `POST /auth/register` and `POST /auth/login` → `{api_key, message, email, status, is_admin}`; `GET /auth/me` → `{email, status, is_admin}`. Disabled login → 403 `"Your account has been disabled."`.

- [ ] **Step 1: Write the failing tests**

`saar_ai/tests/test_auth_router.py`:

```python
import pytest

from app.auth.utils import hash_password
from app.routers import auth as auth_router

PASSWORD = "password123"
HASHED = hash_password(PASSWORD)


@pytest.fixture
def store(monkeypatch):
    calls = {"create": [], "grant": [], "rotate": []}
    users = {}

    def create_account(email, password_hash, status):
        calls["create"].append((email, status))
        return {"user_id": 5, "project_id": 8, "api_key": "new-key"}

    monkeypatch.setattr(auth_router.accounts_store, "email_exists", lambda email: email.lower() in users)
    monkeypatch.setattr(auth_router.accounts_store, "create_account", create_account)
    monkeypatch.setattr(auth_router.accounts_store, "find_login_user", lambda email: users.get(email.lower()))
    monkeypatch.setattr(auth_router.accounts_store, "rotate_api_key", lambda pid: calls["rotate"].append(pid) or "login-key")
    monkeypatch.setattr(auth_router.deepgram_sync, "grant", lambda pid: calls["grant"].append(pid) or True)

    def add_user(email, status):
        users[email.lower()] = {"user_id": 5, "email": email, "password": HASHED, "project_id": 8, "status": status}

    calls["add_user"] = add_user
    return calls


def test_register_creates_a_pending_account(api, store):
    r = api.post("/auth/register", json={"email": "new@example.com", "password": PASSWORD})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "pending" and body["is_admin"] is False and body["api_key"] == "new-key"
    assert store["create"] == [("new@example.com", "pending")]
    assert store["grant"] == []


def test_register_with_admin_email_is_approved_and_granted_deepgram(api, store):
    r = api.post("/auth/register", json={"email": "Admin@Example.com", "password": PASSWORD})
    body = r.json()
    assert body["status"] == "approved" and body["is_admin"] is True
    assert store["create"][0][1] == "approved"
    assert store["grant"] == [8]


def test_register_rejects_a_taken_email(api, store):
    store["add_user"]("taken@example.com", "approved")
    r = api.post("/auth/register", json={"email": "Taken@example.com", "password": PASSWORD})
    assert r.status_code == 400


def test_login_pending_user_gets_a_key_and_status(api, store):
    store["add_user"]("wait@example.com", "pending")
    r = api.post("/auth/login", json={"email": "wait@example.com", "password": PASSWORD})
    assert r.status_code == 200
    assert r.json()["status"] == "pending"
    assert store["rotate"] == [8]


def test_login_disabled_user_is_refused_without_a_key(api, store):
    store["add_user"]("gone@example.com", "disabled")
    r = api.post("/auth/login", json={"email": "gone@example.com", "password": PASSWORD})
    assert r.status_code == 403
    assert r.json()["detail"] == "Your account has been disabled."
    assert store["rotate"] == []


def test_login_admin_is_approved_even_without_an_access_row(api, store):
    store["add_user"]("admin@example.com", None)
    body = api.post("/auth/login", json={"email": "admin@example.com", "password": PASSWORD}).json()
    assert body["status"] == "approved" and body["is_admin"] is True


def test_login_wrong_password(api, store):
    store["add_user"]("u@example.com", "approved")
    r = api.post("/auth/login", json={"email": "u@example.com", "password": "wrongpassword"})
    assert r.status_code == 401


def test_me_reports_the_caller(api, as_caller):
    as_caller(email="wait@example.com", status="pending")
    assert api.get("/auth/me").json() == {"email": "wait@example.com", "status": "pending", "is_admin": False}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests/test_auth_router.py -q`
Expected: failures (`auth_router` has no `accounts_store`; `/auth/me` is 404).

- [ ] **Step 3: Rewrite `saar_ai/app/routers/auth.py`**

```python
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, field_validator

from app.auth.dependencies import Caller, get_caller, is_admin_email
from app.auth.utils import hash_password, verify_password
from app.services import accounts_store, deepgram_sync

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class AuthResponse(BaseModel):
    api_key: str
    message: str
    email: str
    status: str
    is_admin: bool


class MeResponse(BaseModel):
    email: str
    status: str
    is_admin: bool


@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest):
    if accounts_store.email_exists(request.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    admin = is_admin_email(request.email)
    status = "approved" if admin else "pending"
    try:
        account = accounts_store.create_account(request.email, hash_password(request.password), status)
    except Exception:
        logger.exception("Registration failed")
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")
    if admin:
        deepgram_sync.grant(account["project_id"])
    message = "Account created successfully!" if admin else "Account created. The admin will approve it soon."
    return AuthResponse(api_key=account["api_key"], message=message, email=request.email, status=status, is_admin=admin)


@router.post("/login", response_model=AuthResponse)
def login(request: RegisterRequest):
    user = accounts_store.find_login_user(request.email)
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    admin = is_admin_email(user["email"])
    status = "approved" if admin else (user["status"] or "pending")
    if status == "disabled":
        raise HTTPException(status_code=403, detail="Your account has been disabled.")
    try:
        api_key = accounts_store.rotate_api_key(user["project_id"])
    except Exception:
        logger.exception("Login failed")
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")
    return AuthResponse(api_key=api_key, message="Login successful!", email=user["email"], status=status, is_admin=admin)


@router.get("/me", response_model=MeResponse)
def me(caller: Caller = Depends(get_caller)):
    return MeResponse(email=caller.email, status=caller.status, is_admin=caller.is_admin)
```

- [ ] **Step 4: Run tests**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests -q` → all pass.

- [ ] **Step 5: Commit**

```bash
git add saar_ai/app/routers/auth.py saar_ai/tests/test_auth_router.py
git commit -m "feat(backend): pending signups, disabled logins, and /auth/me

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: LLM config from the settings store, 503 when unconfigured

**Files:**
- Modify: `saar_ai/app/services/llm_config.py` (rewrite)
- Modify: `saar_ai/app/routers/generate.py`
- Test: `saar_ai/tests/test_llm_config.py`, `saar_ai/tests/test_generate_router.py` (append)

**Interfaces:**
- Consumes: `settings_store.get_setting`.
- Produces: `DEFAULT_MODELS: dict[str, str]` (`{"openai": "gpt-4o-mini", "google": "gemini-1.5-flash"}`); `LLMNotConfigured(RuntimeError)`; `resolve_llm_settings() -> tuple[str, str, str]` (provider, model, key); `get_llm(temperature: float = 0.7)`. `generate.NOT_CONFIGURED` message string.

- [ ] **Step 1: Write the failing tests**

`saar_ai/tests/test_llm_config.py`:

```python
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
```

Append to `saar_ai/tests/test_generate_router.py`:

```python
def test_unconfigured_llm_returns_503_with_a_clear_message(client, store, monkeypatch):
    from app.services.llm_config import LLMNotConfigured

    def not_configured(u, p):
        raise LLMNotConfigured("No API key is set for openai.")

    monkeypatch.setattr(gen, "generate_mom", not_configured)
    r = client.post("/generate/mom/7")
    assert r.status_code == 503
    assert r.json()["detail"] == "AI provider is not configured. Ask the admin to add a key."
    all_r = client.post("/generate/all/7")
    assert all_r.status_code == 503
    assert not generation_lock.is_running(7)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests/test_llm_config.py tests/test_generate_router.py -q`
Expected: `AttributeError: ... has no attribute 'resolve_llm_settings'` and an `ImportError` for `LLMNotConfigured`.

- [ ] **Step 3: Rewrite `saar_ai/app/services/llm_config.py`**

```python
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
```

- [ ] **Step 4: Map `LLMNotConfigured` to 503 in `saar_ai/app/routers/generate.py`**

Add the import and constant near the top:

```python
from app.services.llm_config import LLMNotConfigured

NOT_CONFIGURED = "AI provider is not configured. Ask the admin to add a key."
```

In `_generate_single`, add an `except` before the generic one:

```python
    try:
        result = _run_one(bot_id, project_id, output_type, utterances, participants)
    except LLMNotConfigured as exc:
        raise HTTPException(status_code=503, detail=NOT_CONFIGURED) from exc
    except Exception as exc:
```

In `generate_all`, replace the `try/finally` block with:

```python
    try:
        for output_type in SECTIONS:
            try:
                _run_one(bot_id, project_id, output_type, utterances, participants)
                done.append(output_type)
            except LLMNotConfigured:
                raise  # no section can succeed without a key
            except Exception:  # one section failing must not stop the others
                logger.exception("Generating %s failed for bot %s", output_type, bot_id)
                failed[output_type] = "Could not generate this section."
    except LLMNotConfigured as exc:
        raise HTTPException(status_code=503, detail=NOT_CONFIGURED) from exc
    finally:
        generation_lock.release(bot_id)
```

- [ ] **Step 5: Run tests**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests -q` → all pass.

- [ ] **Step 6: Commit**

```bash
git add saar_ai/app/services/llm_config.py saar_ai/app/routers/generate.py saar_ai/tests/test_llm_config.py saar_ai/tests/test_generate_router.py
git commit -m "feat(backend): read LLM provider and key from admin settings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Admin API

**Files:**
- Create: `saar_ai/app/routers/admin.py`
- Modify: `saar_ai/app/main.py` (include router)
- Test: `saar_ai/tests/test_admin_router.py`

**Interfaces:**
- Consumes: `require_admin`, `is_admin_email`, `accounts_store.list_users / get_user / set_status / disable_api_keys`, `deepgram_sync.grant / revoke / sync_all`, `settings_store.get_setting / set_setting / masked_settings`, `llm_config.DEFAULT_MODELS`.
- Produces: `GET /admin/users` → `{"users": [{id, email, joined_at, status, decided_at, is_admin}]}`; `POST /admin/users/{id}/approve|enable|disable` → `{"id", "status"}`; `GET /admin/settings` and `PUT /admin/settings` → masked settings.

- [ ] **Step 1: Write the failing tests**

`saar_ai/tests/test_admin_router.py`:

```python
from datetime import datetime

import pytest

from app.routers import admin as admin_router

USERS = {
    1: {"id": 1, "email": "admin@example.com", "project_id": 11, "status": "approved"},
    2: {"id": 2, "email": "wait@example.com", "project_id": 12, "status": "pending"},
}


@pytest.fixture
def backend(monkeypatch):
    log = {"status": [], "grant": [], "revoke": [], "keys_off": [], "set": [], "sync": 0}
    stored = {}
    store = admin_router.accounts_store
    monkeypatch.setattr(store, "list_users", lambda: [
        {"id": 2, "email": "wait@example.com", "joined_at": datetime(2026, 9, 25), "status": "pending", "decided_at": None},
        {"id": 1, "email": "admin@example.com", "joined_at": datetime(2026, 9, 1), "status": "pending", "decided_at": None},
    ])
    monkeypatch.setattr(store, "get_user", lambda uid: USERS.get(uid))
    monkeypatch.setattr(store, "set_status", lambda uid, status, by: log["status"].append((uid, status, by)))
    monkeypatch.setattr(store, "disable_api_keys", lambda pid: log["keys_off"].append(pid))
    sync = admin_router.deepgram_sync
    monkeypatch.setattr(sync, "grant", lambda pid: log["grant"].append(pid) or True)
    monkeypatch.setattr(sync, "revoke", lambda pid: log["revoke"].append(pid))

    def sync_all():
        log["sync"] += 1
        return 1

    monkeypatch.setattr(sync, "sync_all", sync_all)
    settings = admin_router.settings_store

    def set_setting(key, value, uid):
        stored[key] = value
        log["set"].append((key, value))

    monkeypatch.setattr(settings, "set_setting", set_setting)
    monkeypatch.setattr(settings, "get_setting", lambda key: stored.get(key))
    monkeypatch.setattr(settings, "masked_settings", lambda: {"llm_provider": stored.get("llm_provider")})
    log["stored"] = stored
    return log


@pytest.fixture
def as_admin(as_caller):
    return as_caller(user_id=1, project_id=11, email="admin@example.com", is_admin=True)


@pytest.mark.parametrize("method,path", [
    ("GET", "/admin/users"), ("POST", "/admin/users/2/approve"), ("POST", "/admin/users/2/disable"),
    ("POST", "/admin/users/2/enable"), ("GET", "/admin/settings"), ("PUT", "/admin/settings"),
])
def test_non_admin_is_refused(api, as_caller, backend, method, path):
    as_caller()
    r = api.request(method, path, json={})
    assert (r.status_code, r.json()["detail"]) == (403, "admin_only")


def test_list_users_marks_the_admin_approved(api, as_admin, backend):
    users = api.get("/admin/users").json()["users"]
    assert [u["id"] for u in users] == [2, 1]
    assert users[1]["is_admin"] is True and users[1]["status"] == "approved"
    assert users[0]["is_admin"] is False and users[0]["status"] == "pending"


def test_approve_grants_deepgram(api, as_admin, backend):
    assert api.post("/admin/users/2/approve").json() == {"id": 2, "status": "approved"}
    assert backend["status"] == [(2, "approved", 1)]
    assert backend["grant"] == [12]


def test_enable_is_approve(api, as_admin, backend):
    assert api.post("/admin/users/2/enable").json() == {"id": 2, "status": "approved"}
    assert backend["grant"] == [12]


def test_disable_revokes_and_kills_keys(api, as_admin, backend):
    assert api.post("/admin/users/2/disable").json() == {"id": 2, "status": "disabled"}
    assert backend["status"] == [(2, "disabled", 1)]
    assert backend["revoke"] == [12] and backend["keys_off"] == [12]


def test_admin_cannot_disable_themselves(api, as_admin, backend):
    r = api.post("/admin/users/1/disable")
    assert r.status_code == 400
    assert backend["status"] == []


def test_unknown_user_is_404(api, as_admin, backend):
    assert api.post("/admin/users/99/approve").status_code == 404


def test_put_settings_ignores_blank_fields(api, as_admin, backend):
    api.put("/admin/settings", json={"openai_api_key": "sk-new", "google_api_key": "  ", "deepgram_api_key": ""})
    assert backend["set"] == [("openai_api_key", "sk-new")]
    assert backend["sync"] == 0


def test_put_deepgram_key_syncs_all_projects(api, as_admin, backend):
    api.put("/admin/settings", json={"deepgram_api_key": " dg-new "})
    assert backend["set"] == [("deepgram_api_key", "dg-new")]
    assert backend["sync"] == 1


def test_switching_provider_resets_the_model(api, as_admin, backend):
    backend["stored"].update(llm_provider="openai", llm_model="gpt-4o-mini")
    api.put("/admin/settings", json={"llm_provider": "google"})
    assert backend["stored"]["llm_model"] == "gemini-1.5-flash"


def test_provider_with_explicit_model_keeps_it(api, as_admin, backend):
    api.put("/admin/settings", json={"llm_provider": "google", "llm_model": "gemini-2.0-flash"})
    assert backend["stored"]["llm_model"] == "gemini-2.0-flash"


def test_unknown_provider_is_422(api, as_admin, backend):
    assert api.put("/admin/settings", json={"llm_provider": "anthropic"}).status_code == 422
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests/test_admin_router.py -q`
Expected: `ImportError: cannot import name 'admin'`.

- [ ] **Step 3: Implement `saar_ai/app/routers/admin.py`**

```python
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
```

In `saar_ai/app/main.py`, change the router import to `from app.routers import admin, auth, meetings, generate` and add `app.include_router(admin.router)` after the other includes.

- [ ] **Step 4: Run tests**

Run: `cd saar_ai && ../.venv/bin/python -m pytest tests -q` → all pass.

- [ ] **Step 5: Commit**

```bash
git add saar_ai/app/routers/admin.py saar_ai/app/main.py saar_ai/tests/test_admin_router.py
git commit -m "feat(backend): admin routes for approvals and keys

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Frontend API client and auth state

**Files:**
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/context/AuthContext.tsx`
- Create: `frontend/src/test/auth.ts`
- Modify: `frontend/src/pages/__tests__/auth-pages.test.tsx` (signup mock and storage expectation)
- Test: `frontend/src/context/__tests__/AuthContext.test.tsx`

**Interfaces:**
- Produces in `api.ts`: `AccountStatus = "pending" | "approved" | "disabled"`; `AuthResponse`; `Me = { email; status; is_admin }`; `ACCESS_EVENT = "saarai:access"` (CustomEvent detail `"account_pending" | "account_disabled"`); `authApi.me()`; `AdminUser`, `KeyState`, `LlmProvider = "openai" | "google"`, `SecretKey = "openai_api_key" | "google_api_key" | "deepgram_api_key"`, `AdminSettings`, `SettingsUpdate`, `DEFAULT_MODELS`, `adminApi.{users, approve, disable, enable, settings, saveSettings}`.
- Produces in `AuthContext`: `AuthUser = { email; name?; status: AccountStatus; isAdmin: boolean }`; `login` and `signup` resolve to `AuthUser`; `refresh(): Promise<AuthUser | null>`.
- Produces in `test/auth.ts`: `signInAs(user: { email?: string; status?: AccountStatus; isAdmin?: boolean })` which seeds storage and mocks `authApi.me`.

- [ ] **Step 1: Add the API surface to `frontend/src/api.ts`**

Below `ApiError`, add:

```ts
export type AccountStatus = "pending" | "approved" | "disabled";

/** Fired when the API says the account is pending or disabled; AuthContext listens. */
export const ACCESS_EVENT = "saarai:access";
const ACCESS_DETAILS = new Set(["account_pending", "account_disabled"]);
```

In `apiFetch`, right before `throw new ApiError(res.status, message);`:

```ts
        if (res.status === 403 && ACCESS_DETAILS.has(message)) {
            window.dispatchEvent(new CustomEvent(ACCESS_EVENT, { detail: message }));
        }
```

Replace the Auth block:

```ts
/* ---------- Auth ---------- */
export type AuthResponse = { api_key: string; message: string; email: string; status: AccountStatus; is_admin: boolean };
export type Me = { email: string; status: AccountStatus; is_admin: boolean };

export const authApi = {
    register: (email: string, password: string) =>
        apiFetch<AuthResponse>("/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),

    login: (email: string, password: string) =>
        apiFetch<AuthResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),

    me: () => apiFetch<Me>("/auth/me"),
};
```

Append at the end of the file:

```ts
/* ---------- Admin ---------- */
export type AdminUser = {
    id: number;
    email: string;
    status: AccountStatus;
    joined_at: string;
    decided_at: string | null;
    is_admin: boolean;
};
export type KeyState = { set: boolean; last4: string | null; updated_at: string | null };
export type LlmProvider = "openai" | "google";
export type SecretKey = "openai_api_key" | "google_api_key" | "deepgram_api_key";
export type AdminSettings = { llm_provider: LlmProvider | null; llm_model: string | null } & Record<SecretKey, KeyState>;
export type SettingsUpdate = Partial<{ llm_provider: LlmProvider; llm_model: string } & Record<SecretKey, string>>;

export const DEFAULT_MODELS: Record<LlmProvider, string> = { openai: "gpt-4o-mini", google: "gemini-1.5-flash" };

export const adminApi = {
    users: () => apiFetch<{ users: AdminUser[] }>("/admin/users"),
    approve: (id: number) => apiFetch<{ id: number; status: AccountStatus }>(`/admin/users/${id}/approve`, { method: "POST" }),
    disable: (id: number) => apiFetch<{ id: number; status: AccountStatus }>(`/admin/users/${id}/disable`, { method: "POST" }),
    enable: (id: number) => apiFetch<{ id: number; status: AccountStatus }>(`/admin/users/${id}/enable`, { method: "POST" }),
    settings: () => apiFetch<AdminSettings>("/admin/settings"),
    saveSettings: (body: SettingsUpdate) =>
        apiFetch<AdminSettings>("/admin/settings", { method: "PUT", body: JSON.stringify(body) }),
};
```

- [ ] **Step 2: Create the test helper `frontend/src/test/auth.ts`**

```ts
import { vi } from "vitest";
import * as api from "../api";
import type { AccountStatus } from "../api";

type SignIn = { email?: string; status?: AccountStatus; isAdmin?: boolean };

/** Seed a stored session and make /auth/me agree with it. */
export function signInAs({ email = "user@example.com", status = "approved", isAdmin = false }: SignIn = {}) {
  window.localStorage.setItem("saarai_api_key", "k");
  window.localStorage.setItem("saarai_auth_user", JSON.stringify({ email, status, isAdmin }));
  return vi.spyOn(api.authApi, "me").mockResolvedValue({ email, status, is_admin: isAdmin });
}
```

- [ ] **Step 3: Write the failing AuthContext tests**

`frontend/src/context/__tests__/AuthContext.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import * as api from "../../api";
import { signInAs } from "../../test/auth";

function Probe() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p>loading</p>;
  return <p data-testid="user">{user ? `${user.email}|${user.status}|${user.isAdmin}` : "signed out"}</p>;
}

const renderProbe = () => render(<AuthProvider><Probe /></AuthProvider>);

describe("AuthContext", () => {
  it("refreshes status and admin flag from /auth/me on load", async () => {
    signInAs({ email: "a@example.com", status: "pending" });
    vi.spyOn(api.authApi, "me").mockResolvedValue({ email: "a@example.com", status: "approved", is_admin: true });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("a@example.com|approved|true"));
    expect(JSON.parse(window.localStorage.getItem("saarai_auth_user") ?? "{}")).toMatchObject({ status: "approved", isAdmin: true });
  });

  it("signs out when /auth/me rejects the key", async () => {
    signInAs();
    vi.spyOn(api.authApi, "me").mockRejectedValue(new api.ApiError(401, "Invalid or disabled API key"));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("signed out"));
    expect(window.localStorage.getItem("saarai_api_key")).toBeNull();
  });

  it("keeps the stored session when /auth/me cannot be reached", async () => {
    signInAs({ email: "a@example.com" });
    vi.spyOn(api.authApi, "me").mockRejectedValue(new TypeError("Failed to fetch"));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("a@example.com|approved|false"));
  });

  it("moves to pending when the API reports account_pending", async () => {
    signInAs({ email: "a@example.com" });
    renderProbe();
    await screen.findByText("a@example.com|approved|false");
    act(() => {
      window.dispatchEvent(new CustomEvent(api.ACCESS_EVENT, { detail: "account_pending" }));
    });
    expect(screen.getByTestId("user")).toHaveTextContent("a@example.com|pending|false");
  });

  it("signs out when the API reports account_disabled", async () => {
    signInAs({ email: "a@example.com" });
    renderProbe();
    await screen.findByText("a@example.com|approved|false");
    act(() => {
      window.dispatchEvent(new CustomEvent(api.ACCESS_EVENT, { detail: "account_disabled" }));
    });
    expect(screen.getByTestId("user")).toHaveTextContent("signed out");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/context/__tests__/AuthContext.test.tsx`
Expected: failures (status is not tracked; `/auth/me` is never called).

- [ ] **Step 5: Rewrite `frontend/src/context/AuthContext.tsx`**

```tsx
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ACCESS_EVENT, type AccountStatus, ApiError, authApi, clearApiKey, hasApiKey, setApiKey } from "../api";

type AuthUser = {
  email: string;
  name?: string;
  status: AccountStatus;
  isAdmin: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (email: string, password: string, name?: string) => Promise<AuthUser>;
  logout: () => void;
  /** Re-read status from the API; resolves to the updated user, or null if signed out. */
  refresh: () => Promise<AuthUser | null>;
};

const AUTH_STORAGE_KEY = "saarai_auth_user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUser(res: { email: string; status: AccountStatus; is_admin: boolean }, name?: string): AuthUser {
  const user: AuthUser = { email: res.email, status: res.status, isAdmin: res.is_admin };
  return name ? { ...user, name } : user;
}

function readStoredUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw || !hasApiKey()) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed.email) return null;
    // Sessions stored before approvals existed have no status; /auth/me corrects it on load.
    const user: AuthUser = { email: parsed.email, status: parsed.status ?? "approved", isAdmin: parsed.isAdmin ?? false };
    return parsed.name ? { ...user, name: parsed.name } : user;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<AuthUser | null>(null);
  userRef.current = user;

  const writeUser = (nextUser: AuthUser | null) => {
    if (!nextUser || nextUser.status === "disabled") {
      setUser(null);
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      clearApiKey();
      return;
    }
    setUser(nextUser);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
  };

  useEffect(() => {
    const stored = readStoredUser();
    if (!stored) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      setIsLoading(false);
      return;
    }
    setUser(stored);
    let cancelled = false;
    authApi
      .me()
      .then((me) => {
        if (!cancelled) writeUser(toUser(me, stored.name));
      })
      .catch((err) => {
        // Offline or server trouble keeps the stored session; a rejected key ends it.
        if (!cancelled && err instanceof ApiError && err.status === 401) writeUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onAccess = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      const current = userRef.current;
      if (!current) return;
      writeUser(detail === "account_disabled" ? null : { ...current, status: "pending" });
    };
    window.addEventListener(ACCESS_EVENT, onAccess);
    return () => window.removeEventListener(ACCESS_EVENT, onAccess);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setApiKey(res.api_key);
    const next = toUser(res);
    writeUser(next);
    return next;
  };

  const signup = async (email: string, password: string, name?: string) => {
    const res = await authApi.register(email, password);
    setApiKey(res.api_key);
    const next = toUser(res, name?.trim() || undefined);
    writeUser(next);
    return next;
  };

  const logout = () => {
    writeUser(null);
  };

  const refresh = async () => {
    try {
      const next = toUser(await authApi.me(), userRef.current?.name);
      writeUser(next);
      return next.status === "disabled" ? null : next;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        writeUser(null);
        return null;
      }
      throw err;
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      signup,
      logout,
      refresh,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

export default AuthContext;
```

- [ ] **Step 6: Update the existing signup test**

In `frontend/src/pages/__tests__/auth-pages.test.tsx`, test "stores the name locally after registering":
- mock: `.mockResolvedValueOnce({ api_key: "k", message: "ok", email: "p@b.com", status: "pending", is_admin: false })`
- expectation: `.toEqual({ email: "p@b.com", name: "Priya", status: "pending", isAdmin: false })`

- [ ] **Step 7: Run frontend tests and types**

Run: `cd frontend && npx vitest run && npx tsc -b`
Expected: all pass, no type errors. If another test mocks `authApi.register`/`login` with only `{ api_key, message }`, add `email`, `status: "approved"`, `is_admin: false` to the mock.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/api.ts frontend/src/context/AuthContext.tsx frontend/src/test/auth.ts frontend/src/context/__tests__/AuthContext.test.tsx frontend/src/pages/__tests__/auth-pages.test.tsx
git commit -m "feat(frontend): track account status and admin flag in auth state

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Pending page, route guards, admin nav, login and settings changes

**Files:**
- Create: `frontend/src/pages/Pending.tsx`
- Create: `frontend/src/components/auth/AdminRoute.tsx`
- Create: `frontend/src/pages/Admin.tsx` (placeholder shell here; tabs land in Tasks 12-13)
- Modify: `frontend/src/components/auth/ProtectedRoute.tsx`
- Modify: `frontend/src/router/AppRouter.tsx`
- Modify: `frontend/src/components/layout/Rail.tsx`
- Modify: `frontend/src/pages/Login.tsx`
- Modify: `frontend/src/pages/Settings.tsx`
- Test: `frontend/src/components/auth/__tests__/guards.test.tsx`, `frontend/src/pages/__tests__/Pending.test.tsx`, append to `Rail.test.tsx`, `auth-pages.test.tsx`, `app-pages.test.tsx`

**Interfaces:**
- Consumes: `useAuth().user.status / isAdmin / refresh / logout`, `signInAs`.
- Produces: routes `/pending` (inside `ProtectedRoute`) and `/admin` (inside `ProtectedRoute` → `AdminRoute`); default export `Admin` page component (Tasks 12-13 fill it).

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/auth/__tests__/guards.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../../../test/render";
import { signInAs } from "../../../test/auth";
import ProtectedRoute from "../ProtectedRoute";
import AdminRoute from "../AdminRoute";

function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<p>dashboard page</p>} />
        <Route path="/pending" element={<p>pending page</p>} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<p>admin page</p>} />
        </Route>
      </Route>
    </Routes>
  );
}

describe("route guards", () => {
  it("sends a pending user to /pending", async () => {
    signInAs({ status: "pending" });
    renderWithProviders(<App />, { route: "/dashboard" });
    expect(await screen.findByText("pending page")).toBeInTheDocument();
  });

  it("lets an approved user through", async () => {
    signInAs();
    renderWithProviders(<App />, { route: "/dashboard" });
    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
  });

  it("sends a non-admin away from /admin", async () => {
    signInAs();
    renderWithProviders(<App />, { route: "/admin" });
    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
  });

  it("lets the admin into /admin", async () => {
    signInAs({ isAdmin: true });
    renderWithProviders(<App />, { route: "/admin" });
    expect(await screen.findByText("admin page")).toBeInTheDocument();
  });
});
```

`frontend/src/pages/__tests__/Pending.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../../test/render";
import { signInAs } from "../../test/auth";
import Pending from "../Pending";

function App() {
  return (
    <Routes>
      <Route path="/pending" element={<Pending />} />
      <Route path="/dashboard" element={<p>dashboard page</p>} />
    </Routes>
  );
}

describe("Pending", () => {
  it("explains the wait", async () => {
    signInAs({ status: "pending" });
    renderWithProviders(<App />, { route: "/pending" });
    expect(await screen.findByRole("heading", { name: "Waiting for approval" })).toBeInTheDocument();
  });

  it("says so when the account is still pending", async () => {
    signInAs({ status: "pending" });
    renderWithProviders(<App />, { route: "/pending" });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Check again" }));
    expect(await screen.findByText("Still waiting. Check again later.")).toBeInTheDocument();
  });

  it("moves to the dashboard once approved", async () => {
    const me = signInAs({ status: "pending" });
    renderWithProviders(<App />, { route: "/pending" });
    const button = await screen.findByRole("button", { name: "Check again" });
    me.mockResolvedValue({ email: "user@example.com", status: "approved", is_admin: false });
    await userEvent.setup().click(button);
    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
  });
});
```

Append to `frontend/src/components/layout/__tests__/Rail.test.tsx` (add `import { signInAs } from "../../../test/auth";` at the top):

```tsx
describe("Rail admin link", () => {
  it("is hidden from regular users", async () => {
    signInAs();
    renderWithProviders(<Rail />, { route: "/dashboard" });
    await screen.findAllByRole("link", { name: "Dashboard" });
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("is shown to the admin", async () => {
    signInAs({ isAdmin: true });
    renderWithProviders(<Rail />, { route: "/dashboard" });
    expect(await screen.findAllByRole("link", { name: "Admin" })).toHaveLength(2);
  });
});
```

Append inside `describe("Login", ...)` in `auth-pages.test.tsx`:

```tsx
  it("shows the disabled-account message from the API", async () => {
    vi.spyOn(api.authApi, "login").mockRejectedValueOnce(new ApiError(403, "Your account has been disabled."));
    const user = userEvent.setup();
    renderWithProviders(<Login />, { route: "/login" });
    await user.type(screen.getByLabelText("Work email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Your account has been disabled."));
  });
```

Append inside the describe that holds "Settings exposes the theme toggle" in `app-pages.test.tsx`:

```tsx
  it("Settings has no API keys tab", () => {
    renderWithProviders(<Settings />, { route: "/settings" });
    expect(screen.queryByRole("button", { name: "API keys" })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/auth src/pages/__tests__/Pending.test.tsx src/components/layout/__tests__/Rail.test.tsx src/pages/__tests__/auth-pages.test.tsx src/pages/__tests__/app-pages.test.tsx`
Expected: failures (missing `AdminRoute` and `Pending` modules, no Admin link, credential copy shown instead of the disabled message, API keys tab present).

- [ ] **Step 3: Guards**

`frontend/src/components/auth/ProtectedRoute.tsx`:

```tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingThread from "../ui/LoadingThread";
import { useAuth } from "../../context/AuthContext";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingThread />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.status === "pending" && location.pathname !== "/pending") {
    return <Navigate to="/pending" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
```

`frontend/src/components/auth/AdminRoute.tsx`:

```tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/** Nested inside ProtectedRoute, so loading and sign-in are already handled. */
export function AdminRoute() {
  const { user } = useAuth();

  if (!user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default AdminRoute;
```

- [ ] **Step 4: Pending page `frontend/src/pages/Pending.tsx`**

```tsx
import { useState } from "react";
import { Navigate } from "react-router-dom";
import Button from "../components/ui/Button";
import ErrorNotice from "../components/ui/ErrorNotice";
import PageHeader from "../components/ui/PageHeader";
import { useAuth } from "../context/AuthContext";
import { NETWORK_ERROR } from "./Login";

export function Pending() {
  const { user, refresh, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (user && user.status !== "pending") {
    return <Navigate to="/dashboard" replace />;
  }

  const check = async () => {
    setChecking(true);
    setNotice(null);
    setError(null);
    try {
      const next = await refresh();
      if (next?.status === "pending") setNotice("Still waiting. Check again later.");
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 py-10">
      <PageHeader
        title="Waiting for approval"
        subtitle="Your account is created. The admin will approve it soon, then you can send SaarAI to your meetings."
      />
      {notice ? <p className="text-body text-ink-2">{notice}</p> : null}
      {error ? <ErrorNotice message={error} /> : null}
      <div className="flex gap-3">
        <Button onClick={() => void check()} disabled={checking}>
          {checking ? "Checking" : "Check again"}
        </Button>
        <Button variant="secondary" onClick={logout}>
          Log out
        </Button>
      </div>
    </div>
  );
}

export default Pending;
```

Confirm `NETWORK_ERROR` is exported from `pages/Login.tsx` (Signup already imports it).

- [ ] **Step 5: Admin page shell and routes**

`frontend/src/pages/Admin.tsx`:

```tsx
import PageHeader from "../components/ui/PageHeader";

export function Admin() {
  return (
    <div className="space-y-6">
      <PageHeader title="Admin" subtitle="Approve accounts and manage the keys SaarAI runs on." />
    </div>
  );
}

export default Admin;
```

In `frontend/src/router/AppRouter.tsx`, import `AdminRoute`, `Admin`, and `Pending`, then change the protected children to:

```tsx
        children: [
          { path: "dashboard", element: <Dashboard /> },
          { path: "meetings", element: <Meetings /> },
          { path: "meetings/:botId", element: <MeetingDetail /> },
          { path: "meetings/:botId/transcript", element: <TranscriptRedirect /> },
          { path: "chat", element: <Chat /> },
          { path: "settings", element: <Settings /> },
          { path: "pending", element: <Pending /> },
          {
            element: <AdminRoute />,
            children: [{ path: "admin", element: <Admin /> }],
          },
        ],
```

- [ ] **Step 6: Admin link in `frontend/src/components/layout/Rail.tsx`**

Add `import { useAuth } from "../../context/AuthContext";`. Below the `items` array add:

```tsx
const adminItem: Item = {
  to: "/admin",
  label: "Admin",
  icon: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
};
```

At the top of `Rail()`:

```tsx
  const { user } = useAuth();
  const navItems = user?.isAdmin ? [...items, adminItem] : items;
```

Replace both `items.map(` calls in `Rail()` with `navItems.map(`.

- [ ] **Step 7: Login shows the disabled message**

In `frontend/src/pages/Login.tsx` `submit`'s `catch`, put this branch first:

```tsx
      if (err instanceof ApiError && err.status === 403) {
        // A disabled account: the API's message says so; the credential copy would mislead.
        setError({ message: err.message, retry: false });
      } else if (isCredentialError(err)) {
```

(the existing `if (isCredentialError(err))` becomes `else if`).

- [ ] **Step 8: Remove the API keys tab from `frontend/src/pages/Settings.tsx`**

- Delete `{ key: "apikeys", label: "API keys" },` from `tabs`.
- Delete the whole `{/* API Keys Tab */}` block (`{activeTab === "apikeys" && ( ... )}`).
- Change the subtitle to `"Manage your profile and organization."`.

- [ ] **Step 9: Run frontend tests and types**

Run: `cd frontend && npx vitest run && npx tsc -b` → all pass.

- [ ] **Step 10: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): pending page, admin route and nav, disabled-login message

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Admin page, Users tab

**Files:**
- Create: `frontend/src/components/admin/UsersPanel.tsx`
- Modify: `frontend/src/pages/Admin.tsx`
- Test: `frontend/src/pages/__tests__/Admin.test.tsx`

**Interfaces:**
- Consumes: `adminApi.users / approve / disable / enable`, `AdminUser`, `AccountStatus`.
- Produces: `UsersPanel` component; `Admin` page with tabs `Users` and `AI and keys` (the second renders `KeysPanel` after Task 13; until then it renders nothing).

- [ ] **Step 1: Write the failing tests**

`frontend/src/pages/__tests__/Admin.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/render";
import { signInAs } from "../../test/auth";
import * as api from "../../api";
import Admin from "../Admin";

const USERS: api.AdminUser[] = [
  { id: 2, email: "wait@example.com", status: "pending", joined_at: "2026-09-25T10:00:00", decided_at: null, is_admin: false },
  { id: 3, email: "gone@example.com", status: "disabled", joined_at: "2026-09-20T10:00:00", decided_at: null, is_admin: false },
  { id: 1, email: "admin@example.com", status: "approved", joined_at: "2026-09-01T10:00:00", decided_at: null, is_admin: true },
];

function row(email: string) {
  return screen.getByRole("row", { name: new RegExp(email) });
}

describe("Admin users", () => {
  it("lists accounts with a waiting count and plain-text status", async () => {
    signInAs({ isAdmin: true, email: "admin@example.com" });
    vi.spyOn(api.adminApi, "users").mockResolvedValue({ users: USERS });
    renderWithProviders(<Admin />, { route: "/admin" });
    expect(await screen.findByText("1 waiting for approval")).toBeInTheDocument();
    expect(within(row("wait@example.com")).getByText("Waiting")).toBeInTheDocument();
    expect(within(row("gone@example.com")).getByText("Disabled")).toBeInTheDocument();
    expect(within(row("admin@example.com")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("approves a pending account", async () => {
    signInAs({ isAdmin: true });
    vi.spyOn(api.adminApi, "users").mockResolvedValue({ users: USERS });
    const approve = vi.spyOn(api.adminApi, "approve").mockResolvedValue({ id: 2, status: "approved" });
    renderWithProviders(<Admin />, { route: "/admin" });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Approve wait@example.com" }));
    expect(approve).toHaveBeenCalledWith(2);
    expect(await within(row("wait@example.com")).findByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("No one is waiting for approval.")).toBeInTheDocument();
  });

  it("re-enables a disabled account", async () => {
    signInAs({ isAdmin: true });
    vi.spyOn(api.adminApi, "users").mockResolvedValue({ users: USERS });
    const enable = vi.spyOn(api.adminApi, "enable").mockResolvedValue({ id: 3, status: "approved" });
    renderWithProviders(<Admin />, { route: "/admin" });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Enable gone@example.com" }));
    expect(enable).toHaveBeenCalledWith(3);
  });

  it("shows an error when an action fails", async () => {
    signInAs({ isAdmin: true });
    vi.spyOn(api.adminApi, "users").mockResolvedValue({ users: USERS });
    vi.spyOn(api.adminApi, "disable").mockRejectedValue(new api.ApiError(500, "Server error"));
    renderWithProviders(<Admin />, { route: "/admin" });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Disable wait@example.com" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
    expect(within(row("wait@example.com")).getByText("Waiting")).toBeInTheDocument();
  });

  it("shows a retry when the list fails to load", async () => {
    signInAs({ isAdmin: true });
    vi.spyOn(api.adminApi, "users").mockRejectedValueOnce(new api.ApiError(503, "Service unavailable")).mockResolvedValue({ users: USERS });
    renderWithProviders(<Admin />, { route: "/admin" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("1 waiting for approval")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/pages/__tests__/Admin.test.tsx`
Expected: failures (no table rendered).

- [ ] **Step 3: Implement `frontend/src/components/admin/UsersPanel.tsx`**

```tsx
import { useCallback, useEffect, useState } from "react";
import { type AccountStatus, type AdminUser, adminApi } from "../../api";
import Button from "../ui/Button";
import Card from "../ui/Card";
import ErrorNotice from "../ui/ErrorNotice";
import LoadingThread from "../ui/LoadingThread";

type Action = "approve" | "disable" | "enable";

const STATUS_LABEL: Record<AccountStatus, string> = { pending: "Waiting", approved: "Approved", disabled: "Disabled" };

const ACTIONS: Record<AccountStatus, { action: Action; label: string; variant: "primary" | "secondary" }[]> = {
  pending: [
    { action: "approve", label: "Approve", variant: "primary" },
    { action: "disable", label: "Disable", variant: "secondary" },
  ],
  approved: [{ action: "disable", label: "Disable", variant: "secondary" }],
  disabled: [{ action: "enable", label: "Enable", variant: "secondary" }],
};

const joinedFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setUsers((await adminApi.users()).users);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load accounts.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (user: AdminUser, action: Action) => {
    setBusyId(user.id);
    setActionError(null);
    try {
      const res = await adminApi[action](user.id);
      setUsers((current) => current?.map((u) => (u.id === user.id ? { ...u, status: res.status } : u)) ?? current);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update the account.");
    } finally {
      setBusyId(null);
    }
  };

  if (loadError) return <ErrorNotice message={loadError} onRetry={() => void load()} />;
  if (!users) return <LoadingThread />;

  const waiting = users.filter((u) => u.status === "pending").length;
  const others = users.filter((u) => !u.is_admin).length;

  return (
    <Card>
      <h3 className="text-h3 text-ink">Accounts</h3>
      <p className="mt-0.5 text-small text-ink-2">
        {waiting === 0 ? "No one is waiting for approval." : `${waiting} waiting for approval`}
      </p>
      {actionError ? <ErrorNotice className="mt-4" message={actionError} /> : null}
      {others === 0 ? <p className="mt-4 text-body text-ink-2">No one else has signed up yet.</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-body">
          <thead className="text-small text-ink-2">
            <tr>
              <th scope="col" className="py-2 pr-4 font-normal">Email</th>
              <th scope="col" className="py-2 pr-4 font-normal">Joined</th>
              <th scope="col" className="py-2 pr-4 font-normal">Status</th>
              <th scope="col" className="py-2 font-normal"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-line">
                <td className="py-3 pr-4 text-ink">{user.is_admin ? `${user.email} (you)` : user.email}</td>
                <td className="py-3 pr-4 text-ink-2">{joinedFormat.format(new Date(user.joined_at))}</td>
                <td className="py-3 pr-4 text-ink-2">{STATUS_LABEL[user.status]}</td>
                <td className="py-3">
                  {user.is_admin ? null : (
                    <div className="flex justify-end gap-2">
                      {ACTIONS[user.status].map(({ action, label, variant }) => (
                        <Button
                          key={action}
                          variant={variant}
                          aria-label={`${label} ${user.email}`}
                          disabled={busyId === user.id}
                          onClick={() => void act(user, action)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default UsersPanel;
```

- [ ] **Step 4: Tabs in `frontend/src/pages/Admin.tsx`**

```tsx
import { useState } from "react";
import UsersPanel from "../components/admin/UsersPanel";
import PageHeader from "../components/ui/PageHeader";

const tabs = [
  { key: "users", label: "Users" },
  { key: "keys", label: "AI and keys" },
] as const;

type TabKey = typeof tabs[number]["key"];

export function Admin() {
  const [activeTab, setActiveTab] = useState<TabKey>("users");

  return (
    <div className="space-y-6">
      <PageHeader title="Admin" subtitle="Approve accounts and manage the keys SaarAI runs on." />

      <div className="flex gap-6 border-b border-line">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={[
              "-mb-px px-1 py-2 text-small transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground",
              activeTab === key ? "text-ink border-b-2 border-violet" : "text-ink-2 hover:text-ink",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "users" && <UsersPanel />}
    </div>
  );
}

export default Admin;
```

- [ ] **Step 5: Run tests and types**

Run: `cd frontend && npx vitest run && npx tsc -b` → all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/admin/UsersPanel.tsx frontend/src/pages/Admin.tsx frontend/src/pages/__tests__/Admin.test.tsx
git commit -m "feat(frontend): admin users tab with approve, disable, enable

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Admin page, AI and keys tab

**Files:**
- Create: `frontend/src/components/admin/KeysPanel.tsx`
- Modify: `frontend/src/pages/Admin.tsx`
- Test: `frontend/src/pages/__tests__/Admin.test.tsx` (append)

**Interfaces:**
- Consumes: `adminApi.settings / saveSettings`, `AdminSettings`, `KeyState`, `LlmProvider`, `SecretKey`, `SettingsUpdate`, `DEFAULT_MODELS`.
- Produces: `KeysPanel` component.

- [ ] **Step 1: Write the failing tests**

Append to `frontend/src/pages/__tests__/Admin.test.tsx`:

```tsx
const SETTINGS: api.AdminSettings = {
  llm_provider: "openai",
  llm_model: "gpt-4o-mini",
  openai_api_key: { set: true, last4: "a1b2", updated_at: "2026-09-26T12:00:00" },
  google_api_key: { set: false, last4: null, updated_at: null },
  deepgram_api_key: { set: false, last4: null, updated_at: null },
};

async function openKeys() {
  signInAs({ isAdmin: true });
  vi.spyOn(api.adminApi, "users").mockResolvedValue({ users: [] });
  vi.spyOn(api.adminApi, "settings").mockResolvedValue(SETTINGS);
  renderWithProviders(<Admin />, { route: "/admin" });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "AI and keys" }));
  await screen.findByLabelText("OpenAI API key");
  return user;
}

describe("Admin keys", () => {
  it("shows whether each key is set without filling it in", async () => {
    await openKeys();
    expect(screen.getByText("Set, ends in a1b2. Updated 26 Sept 2026.")).toBeInTheDocument();
    expect(screen.getAllByText("Not set")).toHaveLength(2);
    expect(screen.getByLabelText("OpenAI API key")).toHaveValue("");
  });

  it("saves only the keys that were typed", async () => {
    const user = await openKeys();
    const save = vi.spyOn(api.adminApi, "saveSettings").mockResolvedValue({
      ...SETTINGS,
      deepgram_api_key: { set: true, last4: "9z9z", updated_at: "2026-09-26T13:00:00" },
    });
    await user.type(screen.getByLabelText("Deepgram API key"), "dg-new-9z9z");
    await user.click(screen.getByRole("button", { name: "Save keys" }));
    expect(save).toHaveBeenCalledWith({ llm_provider: "openai", llm_model: "gpt-4o-mini", deepgram_api_key: "dg-new-9z9z" });
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(screen.getByLabelText("Deepgram API key")).toHaveValue("");
  });

  it("resets the model when the provider changes and warns about a missing key", async () => {
    const user = await openKeys();
    await user.selectOptions(screen.getByLabelText("Provider"), "google");
    expect(screen.getByLabelText("Model")).toHaveValue("gemini-1.5-flash");
    expect(screen.getByText("Add a Gemini API key, or generation will fail.")).toBeInTheDocument();
  });

  it("shows the save error", async () => {
    const user = await openKeys();
    vi.spyOn(api.adminApi, "saveSettings").mockRejectedValue(new api.ApiError(500, "Server error"));
    await user.click(screen.getByRole("button", { name: "Save keys" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
  });
});
```

Note: `en-GB` formats September as `Sept` in current ICU. If the test environment prints `Sep`, change the expected string to match what `Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })` returns there; the formatter is the source of truth.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/pages/__tests__/Admin.test.tsx`
Expected: the new tests fail (no key fields).

- [ ] **Step 3: Implement `frontend/src/components/admin/KeysPanel.tsx`**

```tsx
import { type FormEvent, useCallback, useEffect, useId, useState } from "react";
import {
  type AdminSettings,
  type KeyState,
  type LlmProvider,
  type SecretKey,
  type SettingsUpdate,
  DEFAULT_MODELS,
  adminApi,
} from "../../api";
import Button from "../ui/Button";
import Card from "../ui/Card";
import ErrorNotice from "../ui/ErrorNotice";
import FormField from "../ui/FormField";
import LoadingThread from "../ui/LoadingThread";

const KEY_FIELDS: { key: SecretKey; label: string; note?: string }[] = [
  { key: "openai_api_key", label: "OpenAI API key" },
  { key: "google_api_key", label: "Gemini API key" },
  { key: "deepgram_api_key", label: "Deepgram API key", note: "Saving updates transcription for every approved account." },
];

const PROVIDER_LABEL: Record<LlmProvider, string> = { openai: "OpenAI", google: "Gemini" };
const PROVIDER_KEY: Record<LlmProvider, SecretKey> = { openai: "openai_api_key", google: "google_api_key" };
const EMPTY_KEYS: Record<SecretKey, string> = { openai_api_key: "", google_api_key: "", deepgram_api_key: "" };

const updatedFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function keyHint(state: KeyState): string {
  if (!state.set) return "Not set";
  const updated = state.updated_at ? ` Updated ${updatedFormat.format(new Date(state.updated_at))}.` : "";
  return `Set, ends in ${state.last4}.${updated}`;
}

export function KeysPanel() {
  const providerId = useId();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [provider, setProvider] = useState<LlmProvider>("openai");
  const [model, setModel] = useState("");
  const [keys, setKeys] = useState<Record<SecretKey, string>>(EMPTY_KEYS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const apply = (next: AdminSettings) => {
    const nextProvider = next.llm_provider ?? "openai";
    setSettings(next);
    setProvider(nextProvider);
    setModel(next.llm_model ?? DEFAULT_MODELS[nextProvider]);
  };

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      apply(await adminApi.settings());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load settings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeProvider = (next: LlmProvider) => {
    setProvider(next);
    setModel(DEFAULT_MODELS[next]);
    setSaved(false);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    const body: SettingsUpdate = { llm_provider: provider, llm_model: model.trim() || DEFAULT_MODELS[provider] };
    for (const { key } of KEY_FIELDS) {
      const value = keys[key].trim();
      if (value) body[key] = value;
    }
    try {
      apply(await adminApi.saveSettings(body));
      setKeys(EMPTY_KEYS);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save the keys.");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <ErrorNotice message={loadError} onRetry={() => void load()} />;
  if (!settings) return <LoadingThread />;

  const providerKeyMissing = !settings[PROVIDER_KEY[provider]].set && !keys[PROVIDER_KEY[provider]].trim();

  return (
    <Card title="AI and keys" subtitle="Every approved account uses these keys. Saved keys are never shown again.">
      <form onSubmit={(event) => void save(event)} className="max-w-md space-y-4">
        <div>
          <label htmlFor={providerId} className="mb-1.5 block text-small text-ink-2">
            Provider
          </label>
          <select
            id={providerId}
            value={provider}
            onChange={(event) => changeProvider(event.target.value as LlmProvider)}
            className="w-full rounded-control border border-line bg-raised px-3 py-2 text-body text-ink focus-visible:outline-none focus-visible:border-violet focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
          >
            <option value="openai">OpenAI</option>
            <option value="google">Gemini</option>
          </select>
          {providerKeyMissing ? (
            <span className="mt-1.5 block text-small text-danger">
              Add a {PROVIDER_LABEL[provider]} API key, or generation will fail.
            </span>
          ) : null}
        </div>
        <FormField label="Model" value={model} onChange={(event) => setModel(event.target.value)} />
        {KEY_FIELDS.map(({ key, label, note }) => (
          <div key={key}>
            <FormField
              label={label}
              type="password"
              autoComplete="off"
              hint={keyHint(settings[key])}
              value={keys[key]}
              onChange={(event) => {
                setKeys((current) => ({ ...current, [key]: event.target.value }));
                setSaved(false);
              }}
            />
            {/* The note sits outside the hint so the hint reads exactly "Not set" or "Set, ends in ...". */}
            {note ? <p className="mt-1 text-small text-ink-2">{note}</p> : null}
          </div>
        ))}
        {saveError ? <ErrorNotice message={saveError} /> : null}
        {saved ? <p className="text-small text-ink-2">Saved.</p> : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving keys" : "Save keys"}
        </Button>
      </form>
    </Card>
  );
}

export default KeysPanel;
```

- [ ] **Step 4: Render it in `frontend/src/pages/Admin.tsx`**

Add `import KeysPanel from "../components/admin/KeysPanel";` and below the users line:

```tsx
      {activeTab === "keys" && <KeysPanel />}
```

- [ ] **Step 5: Run tests and types**

Run: `cd frontend && npx vitest run && npx tsc -b` → all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/admin/KeysPanel.tsx frontend/src/pages/Admin.tsx frontend/src/pages/__tests__/Admin.test.tsx
git commit -m "feat(frontend): admin keys tab with masked key status

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: README and an end-to-end run against the local stack

**Files:**
- Modify: `README.md` (env table and a new "Admin setup" section)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Update the README**

Replace the `saar_ai/.env needs:` table with:

```markdown
Copy `saar_ai/.env.example` to `saar_ai/.env` and fill it in:

| Variable | Required | Purpose |
|---|---|---|
| `DB_HOST`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | yes | Attendee's Postgres (defaults are in `attendee/dev.docker-compose.yaml`) |
| `CREDENTIALS_ENCRYPTION_KEY` | yes | Must equal the value in `attendee/.env`. Encrypts stored keys. |
| `ADMIN_EMAIL` | yes | The account that signs up with this email is the admin |
| `ALLOWED_ORIGINS` | no | Comma-separated web origins allowed to call the API (default `http://localhost:5173`) |
| `ATTENDEE_API_URL` | no | Attendee's API (default `http://localhost:8000`) |
| `OPENAI_API_KEY`, `GOOGLE_API_KEY` | no | Local-dev fallback. Keys saved on the admin page take precedence. |

If a required variable is missing, or Postgres is not running, the API exits with a one-line message saying what to fix.
```

Add after the "Run the web app" section:

```markdown
### 4. Admin setup

1. Set `ADMIN_EMAIL` in `saar_ai/.env` and restart the API.
2. Sign up in the web app with that email. On a public deploy, do this before sharing the link: emails are not verified, so whoever registers that address first is the admin.
3. Open **Admin** in the left rail.
   - **AI and keys:** choose OpenAI or Gemini, set the model, and paste the LLM key and the Deepgram key. Keys are stored encrypted and never shown again, only their last four characters.
   - **Users:** new signups wait here. Approve them to let them send bots and generate minutes, insights, and strategy. Disable an account to sign it out and stop its bots from transcribing.

Accounts that existed before approvals were added are approved automatically.
```

- [ ] **Step 2: Run the full suites**

```bash
cd saar_ai && ../.venv/bin/python -m pytest tests -q
cd saar_ai && SAARAI_DB_TESTS=1 ../.venv/bin/python -m pytest tests/test_accounts_store_db.py -q
cd frontend && npx vitest run && npx tsc -b
```

Expected: all pass.

- [ ] **Step 3: End-to-end against the local API and Postgres**

Uses throwaway accounts and a throwaway admin email so the developer's real `.env` and accounts are untouched. It does not save any key, so existing Deepgram credentials are not overwritten.

```bash
cd saar_ai
export E2E_ADMIN="e2e-admin-$RANDOM@example.com" E2E_USER="e2e-user-$RANDOM@example.com"
ADMIN_EMAIL="$E2E_ADMIN" \
CREDENTIALS_ENCRYPTION_KEY="$(grep '^CREDENTIALS_ENCRYPTION_KEY=' ../attendee/.env | cut -d= -f2-)" \
../.venv/bin/uvicorn app.main:app --port 8011 &
SERVER_PID=$!
sleep 4
B=http://localhost:8011
ADMIN_KEY=$(curl -s -X POST $B/auth/register -H 'Content-Type: application/json' -d "{\"email\":\"$E2E_ADMIN\",\"password\":\"password123\"}" | ../.venv/bin/python -c 'import sys,json; d=json.load(sys.stdin); assert d["status"]=="approved" and d["is_admin"], d; print(d["api_key"])')
USER_KEY=$(curl -s -X POST $B/auth/register -H 'Content-Type: application/json' -d "{\"email\":\"$E2E_USER\",\"password\":\"password123\"}" | ../.venv/bin/python -c 'import sys,json; d=json.load(sys.stdin); assert d["status"]=="pending", d; print(d["api_key"])')
curl -s -o /dev/null -w "pending meetings: %{http_code}\n" $B/meetings -H "Authorization: Bearer $USER_KEY"
curl -s -o /dev/null -w "user on admin: %{http_code}\n" $B/admin/users -H "Authorization: Bearer $USER_KEY"
USER_ID=$(curl -s $B/admin/users -H "Authorization: Bearer $ADMIN_KEY" | ../.venv/bin/python -c "import sys,json; print([u['id'] for u in json.load(sys.stdin)['users'] if u['email']=='$E2E_USER'][0])")
curl -s -X POST $B/admin/users/$USER_ID/approve -H "Authorization: Bearer $ADMIN_KEY"; echo
curl -s -o /dev/null -w "approved meetings: %{http_code}\n" $B/meetings -H "Authorization: Bearer $USER_KEY"
curl -s $B/admin/settings -H "Authorization: Bearer $ADMIN_KEY"; echo
curl -s -X POST $B/admin/users/$USER_ID/disable -H "Authorization: Bearer $ADMIN_KEY"; echo
curl -s -o /dev/null -w "disabled key: %{http_code}\n" $B/auth/me -H "Authorization: Bearer $USER_KEY"
curl -s -o /dev/null -w "disabled login: %{http_code}\n" -X POST $B/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$E2E_USER\",\"password\":\"password123\"}"
kill $SERVER_PID
```

Expected output, in order: `pending meetings: 403`, `user on admin: 403`, `{"id":…,"status":"approved"}`, `approved meetings: 200`, a masked settings JSON with no key values, `{"id":…,"status":"disabled"}`, `disabled key: 401`, `disabled login: 403`.

Then delete the two e2e accounts:

```bash
cd saar_ai && ../.venv/bin/python - <<'PY'
import os
from sqlalchemy import text
from app.db.connection import SessionLocal

db = SessionLocal()
for email in (os.environ["E2E_ADMIN"], os.environ["E2E_USER"]):
    row = db.execute(
        text("SELECT u.organization_id, p.id FROM accounts_user u JOIN bots_project p ON p.organization_id = u.organization_id WHERE u.email = :e"),
        {"e": email},
    ).first()
    if not row:
        continue
    org_id, pid = row
    db.execute(text("DELETE FROM bots_apikey WHERE project_id = :p"), {"p": pid})
    db.execute(text("DELETE FROM bots_credentials WHERE project_id = :p"), {"p": pid})
    db.execute(text("DELETE FROM accounts_user WHERE organization_id = :o"), {"o": org_id})
    db.execute(text("DELETE FROM bots_project WHERE id = :p"), {"p": pid})
    db.execute(text("DELETE FROM accounts_organization WHERE id = :o"), {"o": org_id})
db.commit()
db.close()
print("cleaned up")
PY
```

If any expected line differs, stop and fix the cause (usually SQL in `accounts_store` or `deepgram_sync`) with a failing test first.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: admin setup and required env in README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
