# SaarAI admin, account approvals, and keys in the database

Date: 2026-09-26
Status: approved in brainstorming, awaiting spec review
Scope: make SaarAI safe to publish and host. Cloud hosting itself (containers, provider, domain, Attendee workers) is a separate follow-up.

## Context

SaarAI is going public (LinkedIn post, cloud deploy). Today:

- `/auth/register` gives anyone a working account immediately, with Attendee `role='admin'` and a Deepgram credential. A stranger on the hosted URL can spend the owner's OpenAI and Deepgram credit.
- `saar_ai/app/routers/auth.py:17-18` hardcodes a Deepgram API key and `CREDENTIALS_ENCRYPTION_KEY` as `os.getenv` defaults. Both were committed in `a02a7302` and are in the public GitHub history.
- The LLM key is read implicitly by LangChain from `OPENAI_API_KEY` / `GOOGLE_API_KEY` in the environment (`app/services/llm_config.py`).
- `app/routers/meetings.py:30` hardcodes a personal ngrok `WEBHOOK_URL` that nothing uses.
- CORS allows every origin.
- The Settings page's "API keys" tab is a static mockup.

Decisions made during brainstorming:

- The admin is the account whose email equals the `ADMIN_EMAIL` env var.
- New accounts start `pending`. Pending users can log in but only see a waiting screen; every data and paid endpoint is blocked server-side.
- Rejecting an account disables it (reversible); it is never deleted.
- One global set of keys (LLM provider, model, OpenAI key, Gemini key, Deepgram key) serves every approved user. No per-user keys, no quotas.
- Approval state and keys live in SaarAI-owned tables. Attendee's schema is not changed.
- Accounts that exist when this ships are approved by a one-time backfill.

## Secrets that stay in the environment

Two things cannot move into the database: the database's own credentials, and the key that encrypts the settings table. On a cloud host these go in the provider's secret settings.

| Variable | Required | Purpose |
|---|---|---|
| `DB_HOST`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | yes | Attendee's Postgres |
| `CREDENTIALS_ENCRYPTION_KEY` | yes | Fernet key. Encrypts `saarai_settings` and Attendee's `bots_credentials`. Must equal Attendee's value. |
| `ADMIN_EMAIL` | yes | Email of the admin account |
| `ALLOWED_ORIGINS` | no, default `http://localhost:5173` | Comma-separated CORS origins |
| `ATTENDEE_API_URL` | no, default `http://localhost:8000` | Attendee's API |
| `OPENAI_API_KEY`, `GOOGLE_API_KEY` | no | Local-dev fallback only, used when the DB has no value |

At startup, if `CREDENTIALS_ENCRYPTION_KEY` or `ADMIN_EMAIL` is missing (or the encryption key is not a valid Fernet key), the API exits with a one-line message naming the variable, the same way it handles an unreachable database. Skipped when `SAARAI_SKIP_DB_INIT=1` (tests).

## Data model

Created in `app/db/init_saarai_tables.py`, idempotent, alongside `saarai_outputs`.

```sql
CREATE TABLE IF NOT EXISTS saarai_user_access (
    user_id     INTEGER PRIMARY KEY REFERENCES accounts_user(id) ON DELETE CASCADE,
    status      VARCHAR(10) NOT NULL CHECK (status IN ('pending', 'approved', 'disabled')),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    decided_at  TIMESTAMP,
    decided_by  INTEGER REFERENCES accounts_user(id)
);

CREATE TABLE IF NOT EXISTS saarai_settings (
    key              VARCHAR(40) PRIMARY KEY,
    value_encrypted  BYTEA NOT NULL,
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by       INTEGER REFERENCES accounts_user(id)
);

-- Backfill: every user without a row is approved.
INSERT INTO saarai_user_access (user_id, status, decided_at)
SELECT id, 'approved', NOW() FROM accounts_user
ON CONFLICT (user_id) DO NOTHING;
```

The backfill runs on every startup but only inserts for users with no row, and registration always inserts a row in the same transaction as the user, so a new signup is never auto-approved by it.

Setting keys: `llm_provider` (`openai` | `google`), `llm_model`, `openai_api_key`, `google_api_key`, `deepgram_api_key`. All values are encrypted, including the non-secret provider and model, so the table has one code path.

## Backend

### Settings store: `app/services/settings_store.py`

- `get_setting(key) -> str | None` and `set_setting(key, value, user_id)`.
- Fernet with `CREDENTIALS_ENCRYPTION_KEY`.
- In-process cache of decrypted values with a 30-second TTL; `set_setting` clears it.
- `masked_settings() -> dict`: for each secret key `{set: bool, last4: str | None, updated_at}`; provider and model are returned in full. This is the only shape that reaches the browser.
- A value that fails to decrypt (key was rotated) is treated as not set and logged once. The admin re-enters it.

### Deepgram sync: `app/services/deepgram_sync.py`

Writes Attendee's credential format: `bots_credentials` row with `credential_type = 1`, `_encrypted_data = Fernet(CREDENTIALS_ENCRYPTION_KEY).encrypt(json.dumps({"api_key": key}))`, upserted on the `(project_id, credential_type)` unique constraint.

- `grant(project_id)`: upsert using the stored Deepgram key. No-op if none is set.
- `revoke(project_id)`: delete the row.
- `sync_all()`: upsert for every project whose owning user is approved. Called when the Deepgram key is saved.

### Auth: `app/auth/dependencies.py`

`verify_api_key` is kept (still returns `project_id`) and gains a sibling that resolves the full caller:

```python
@dataclass
class Caller:
    user_id: int
    project_id: int
    email: str
    status: str      # pending | approved | disabled
    is_admin: bool
```

The key resolves to a project, the project to its organization, the organization to its user (one user per organization, as registration creates them). `is_admin` is `email.lower() == ADMIN_EMAIL.lower()`, and an admin's status is always reported as `approved`.

- `get_caller`: any valid key.
- `require_approved`: 403 `{"detail": "account_pending"}` or `{"detail": "account_disabled"}` unless approved. Returns `project_id`, so existing endpoint signatures keep working.
- `require_admin`: 403 `{"detail": "admin_only"}` unless `is_admin`.

Every endpoint in `routers/meetings.py` and `routers/generate.py` switches from `verify_api_key` to `require_approved`.

### Auth routes: `app/routers/auth.py`

- Remove the hardcoded defaults and the Deepgram credential creation from registration.
- Attendee `role='admin'` stays: it means admin of the user's own single-user organization, which Attendee needs for project access. It grants nothing across organizations.
- Registration inserts the `saarai_user_access` row: `approved` if the email is the admin's (and calls `deepgram_sync.grant`), otherwise `pending`.
- Login: a `disabled` account gets 403 "Your account has been disabled." before a key is issued.
- Register and login both respond with `{api_key, message, email, status, is_admin}`.
- New `GET /auth/me` (`get_caller`) returns `{email, status, is_admin}`.

### Admin routes: `app/routers/admin.py`

All use `require_admin`.

| Route | Effect |
|---|---|
| `GET /admin/users` | `[{id, email, status, joined_at, decided_at}]`, pending first, then newest first |
| `POST /admin/users/{id}/approve` | status `approved`, `deepgram_sync.grant` |
| `POST /admin/users/{id}/disable` | status `disabled`, `deepgram_sync.revoke`, set `disabled_at` on the user's `bots_apikey` rows. 400 for the admin's own account. |
| `POST /admin/users/{id}/enable` | status `approved`, `deepgram_sync.grant`. The user logs in again for a new key. |
| `GET /admin/settings` | `masked_settings()` |
| `PUT /admin/settings` | Body fields all optional: `llm_provider`, `llm_model`, `openai_api_key`, `google_api_key`, `deepgram_api_key`. Missing or empty strings leave the value unchanged. Saving `deepgram_api_key` calls `deepgram_sync.sync_all`. Returns `masked_settings()`. |

Unknown user id returns 404. `llm_provider` outside `openai`/`google` returns 422.

### LLM config: `app/services/llm_config.py`

`get_llm(temperature)` reads provider, model and key from the settings store (env fallback for local dev) and passes the key explicitly (`api_key=` / `google_api_key=`). Defaults: provider `openai`, model `gpt-4o-mini` for OpenAI and `gemini-1.5-flash` for Google. No key for the chosen provider raises `LLMNotConfigured`, which `routers/generate.py` maps to 503 "AI provider is not configured. Ask the admin to add a key." instead of the generic 502.

### Other cleanup

- `routers/meetings.py`: delete `WEBHOOK_URL` and the `print("[DEBUG] ...")` line.
- `main.py`: CORS origins from `ALLOWED_ORIGINS`; include the admin router; startup env check.
- `saar_ai/.env.example`: every variable above, no values.
- README: replace the env table; add an "Admin setup" section (set `ADMIN_EMAIL`, sign up with that email, open Admin, add keys).

## Frontend

### Auth state

- `AuthUser` gains `status` and `isAdmin`. Login and signup store them from the response.
- On load, if a key exists, `AuthContext` calls `/auth/me` and refreshes the stored user. A 401 logs out.
- `api.ts`: a 403 with `account_pending` or `account_disabled` dispatches an event that `AuthContext` handles (pending: update status; disabled: log out with a message).
- `ProtectedRoute`: a pending user is redirected to `/pending`.
- New `AdminRoute`: non-admins are redirected to `/dashboard`.

### Pending page: `/pending`

Inside the shell, reached only while authenticated. Heading "Waiting for approval", text "Your account is created. The admin will approve it soon, then you can send SaarAI to your meetings." Buttons "Check again" (calls `/auth/me`, goes to the dashboard once approved) and "Log out". An approved user landing here is sent to the dashboard.

Signup sends a non-admin user straight to `/pending`.

### Admin page: `/admin`

Rail item "Admin", rendered only when `isAdmin`. Two tabs, same tab pattern as Settings.

**Users.** A table: email, joined, status, action. Status is plain text, following the identity spec's no-pill rule. A heading line states the count ("2 waiting for approval"). Actions by status: pending shows Approve and Disable, approved shows Disable, disabled shows Enable. The admin's own row has no action. Buttons show a pending state while the request runs; errors use `ErrorNotice`. Empty state when there are no other users.

**AI and keys.** Provider select (OpenAI, Gemini), model field. Three password fields, OpenAI key, Gemini key, Deepgram key, each with a helper line "Set, ends in a1b2 · updated 26 Sep" or "Not set". Fields start empty; typing replaces the stored key. "Save keys" button; on success the fields clear and helper lines refresh; errors inline. A note under the Deepgram field: "Saving updates transcription for every approved account."

### Settings

Remove the "API keys" tab.

## Error handling summary

| Case | Response | UI |
|---|---|---|
| Pending user calls a data endpoint | 403 `account_pending` | redirect to `/pending` |
| Disabled user logs in | 403 "Your account has been disabled." | message on the login form |
| Disabled user's old key | 401 (key disabled) | logged out |
| Non-admin calls `/admin/*` | 403 `admin_only` | route guard already hides it |
| No LLM key set | 503 with the not-configured message | existing generation error display shows the message |
| No Deepgram key set, bot sent | Attendee fails transcription | out of scope; admin page shows "Not set" |
| Stored value fails to decrypt | treated as not set | admin page shows "Not set" |

## Testing

Backend (pytest, extending `tests/conftest.py` with overrides for `get_caller`):

- `require_approved`: pending and disabled get 403 with the right detail; approved and admin pass.
- `require_admin`: non-admin gets 403; admin passes.
- Login: disabled account gets 403 and no key is created.
- Registration: normal email creates a `pending` row; `ADMIN_EMAIL` creates `approved`.
- Settings store: round trip, `masked_settings` never contains the full value, cache cleared on write, undecryptable value reads as not set.
- Admin routes: approve calls `grant`, disable calls `revoke` and disables keys, disabling self returns 400, `PUT /admin/settings` ignores empty fields and calls `sync_all` only when the Deepgram key changes.
- `get_llm`: raises `LLMNotConfigured` with no key; the generate route maps it to 503.

Frontend (vitest + Testing Library):

- Pending user is redirected to `/pending`; "Check again" moves an approved user to the dashboard.
- The Admin rail item renders only for admins; `/admin` redirects non-admins.
- Users tab: Approve calls the API and updates the row's status text.
- Keys tab: shows "Set, ends in …" from the masked response and never pre-fills a key.

## Owner actions outside the code

1. Revoke the Deepgram key that is in the git history, create a new one, and enter it on the admin page.
2. Generate a new `CREDENTIALS_ENCRYPTION_KEY` (`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`) and set it for both SaarAI and Attendee. Existing Deepgram credentials encrypted with the old key stop decrypting; saving the Deepgram key on the admin page rewrites them for every approved account.
3. Set `ADMIN_EMAIL`, then sign up with that email right after the first deploy, before sharing the URL. SaarAI does not verify emails, so whoever registers that address first holds the admin role.

## Out of scope

- Cloud hosting: container images, provider choice, domain, running Attendee's workers, and keeping Attendee's API off the public internet.
- Rewriting git history to purge the old keys. Rotation makes them worthless.
- Email notifications on signup or approval.
- Per-user keys or usage limits.
