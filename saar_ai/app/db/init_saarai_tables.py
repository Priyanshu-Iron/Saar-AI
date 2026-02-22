from sqlalchemy import text
from app.db.connection import engine

def init_saarai_tables():
    """Create SaarAI's own tables (safe to call multiple times)."""
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
        conn.commit()
