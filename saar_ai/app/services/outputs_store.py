import json

from sqlalchemy import text

from app.db.connection import SessionLocal

SECTION_ORDER = ("mom", "insights", "strategy")


def save_output(bot_id: int, project_id: int, output_type: str, content: str, fmt: str) -> None:
    db = SessionLocal()
    try:
        db.execute(
            text("""
                INSERT INTO saarai_outputs (bot_id, project_id, output_type, content, format)
                VALUES (:bot_id, :project_id, :output_type, :content, :fmt)
                ON CONFLICT (bot_id, project_id, output_type)
                DO UPDATE SET content = :content, format = :fmt, created_at = NOW()
            """),
            {"bot_id": bot_id, "project_id": project_id, "output_type": output_type, "content": content, "fmt": fmt},
        )
        db.commit()
    finally:
        db.close()


def get_outputs(bot_id: int, project_id: int) -> dict[str, dict]:
    db = SessionLocal()
    try:
        rows = db.execute(
            text("""
                SELECT output_type, content, format, created_at
                FROM saarai_outputs
                WHERE bot_id = :bot_id AND project_id = :project_id
            """),
            {"bot_id": bot_id, "project_id": project_id},
        ).mappings().all()
    finally:
        db.close()
    out = {}
    for row in rows:
        content = json.loads(row["content"]) if row["format"] == "json" else row["content"]
        out[row["output_type"]] = {"format": row["format"], "content": content, "created_at": str(row["created_at"])}
    return out


def get_done_types(bot_id: int, project_id: int) -> list[str]:
    outputs = get_outputs(bot_id, project_id)
    return [t for t in SECTION_ORDER if t in outputs and outputs[t]["format"] == "json"]
