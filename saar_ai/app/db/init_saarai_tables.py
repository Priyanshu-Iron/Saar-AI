import os
import sys

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.db.connection import engine


def init_saarai_tables():
    """Create SaarAI's own tables (safe to call multiple times)."""
    try:
        with engine.connect() as conn:
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
            conn.commit()
    except OperationalError as exc:
        host = os.getenv("DB_HOST", "localhost")
        sys.exit(
            f"SaarAI cannot reach Postgres at {host}:5432 ({exc.orig}).\n"
            "SaarAI shares Attendee's database. Start it and retry:\n"
            "  cd attendee && docker compose -f dev.docker-compose.yaml up -d postgres redis"
        )
