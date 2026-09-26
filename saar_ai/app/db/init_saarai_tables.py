import os
import sys

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app import config
from app.db.connection import engine


def _check_admin_email_unique(conn) -> None:
    """Exit if more than one accounts_user row matches ADMIN_EMAIL, case-insensitively.

    Before this branch registration was case-sensitive, so an existing DB may hold two
    accounts whose emails lowercase to the same ADMIN_EMAIL; both would otherwise be admin.
    """
    admin = config.admin_email()
    if not admin:
        return
    count = conn.execute(
        text("SELECT COUNT(*) FROM accounts_user WHERE lower(email) = :admin"),
        {"admin": admin},
    ).scalar()
    if count and count > 1:
        sys.exit(
            "More than one account matches ADMIN_EMAIL (case-insensitive). "
            "Remove or rename the extras."
        )


def init_saarai_tables():
    """Create SaarAI's own tables (safe to call multiple times)."""
    try:
        with engine.connect() as conn:
            access_table_is_new = conn.execute(
                text("SELECT to_regclass('saarai_user_access') IS NULL")
            ).scalar()

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS saarai_outputs (
                    id SERIAL PRIMARY KEY,
                    bot_id INTEGER NOT NULL,
                    project_id INTEGER NOT NULL,
                    output_type VARCHAR(20) NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(bot_id, project_id, output_type)
                )
            """))
            conn.execute(text("""
                ALTER TABLE saarai_outputs
                ADD COLUMN IF NOT EXISTS format VARCHAR(10) NOT NULL DEFAULT 'markdown'
            """))
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
            if access_table_is_new:
                # One-time backfill: accounts that predate approvals keep working.
                # Registration always writes its own row in the same transaction, so a new
                # signup is never touched by this, and it never runs again once the table
                # exists -- an account created outside SaarAI (e.g. via Attendee's own
                # signup) stays pending instead of getting silently approved on next boot.
                conn.execute(text("""
                    INSERT INTO saarai_user_access (user_id, status, decided_at)
                    SELECT id, 'approved', NOW() FROM accounts_user
                    ON CONFLICT (user_id) DO NOTHING
                """))
            conn.commit()
            _check_admin_email_unique(conn)
    except OperationalError as exc:
        host = os.getenv("DB_HOST", "localhost")
        sys.exit(
            f"SaarAI cannot reach Postgres at {host}:5432 ({exc.orig}).\n"
            "SaarAI shares Attendee's database. Start it and retry:\n"
            "  cd attendee && docker compose -f dev.docker-compose.yaml up -d postgres redis"
        )
