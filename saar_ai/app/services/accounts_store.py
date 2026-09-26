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
