from sqlalchemy import text
from app.db.connection import SessionLocal

def get_all_completed_meetings(project_id: int):
    db = SessionLocal()
    try:
        query = text("""
            SELECT id, object_id, name, meeting_url, state, created_at
            FROM bots_bot
            WHERE state = 9 AND project_id = :project_id
            ORDER BY created_at DESC
        """)
        return db.execute(query, {"project_id": project_id}).mappings().all()
    finally:
        db.close()

def get_meeting_detail(bot_id: int, project_id: int):
    db = SessionLocal()
    try:
        query = text("""
            SELECT b.id, b.object_id, b.name, b.meeting_url, b.state, b.created_at,
                   r.transcription_state
            FROM bots_bot b
            LEFT JOIN bots_recording r ON r.bot_id = b.id
            WHERE b.id = :bot_id AND b.project_id = :project_id
        """)
        return db.execute(query, {"bot_id": bot_id, "project_id": project_id}).mappings().first()
    finally:
        db.close()

def verify_bot_access(bot_id: int, project_id: int) -> bool:
    db = SessionLocal()
    try:
        result = db.execute(
            text("SELECT id FROM bots_bot WHERE id = :bot_id AND project_id = :project_id"),
            {"bot_id": bot_id, "project_id": project_id}
        ).first()
        return result is not None
    finally:
        db.close()

def get_transcript(bot_id: int):
    db = SessionLocal()
    try:
        query = text("""
            SELECT
                p.full_name AS speaker,
                u.timestamp_ms,
                u.duration_ms,
                TRIM(u.transcription::jsonb ->> 'transcript') AS text
            FROM bots_utterance u
            JOIN bots_recording r ON u.recording_id = r.id
            JOIN bots_participant p ON u.participant_id = p.id
            WHERE r.bot_id = :bot_id
              AND u.transcription IS NOT NULL
              AND TRIM(u.transcription::jsonb ->> 'transcript') <> ''
            ORDER BY u.timestamp_ms
        """)
        return db.execute(query, {"bot_id": bot_id}).mappings().all()
    finally:
        db.close()

def get_full_transcript_text(bot_id: int) -> str:
    rows = get_transcript(bot_id)
    return "\n".join([f"[{r['speaker']}]: {r['text']}" for r in rows])

def get_participants(bot_id: int):
    db = SessionLocal()
    try:
        query = text("""
            SELECT id, full_name, email, is_host
            FROM bots_participant
            WHERE bot_id = :bot_id
        """)
        return db.execute(query, {"bot_id": bot_id}).mappings().all()
    finally:
        db.close()

def get_chat_messages(bot_id: int):
    db = SessionLocal()
    try:
        query = text("""
            SELECT
                p.full_name AS sender,
                c.timestamp,
                c.created_at,
                c.text,
                c.to AS to_type
            FROM bots_chatmessage c
            LEFT JOIN bots_participant p ON c.participant_id = p.id
            WHERE c.bot_id = :bot_id
            ORDER BY c.timestamp
        """)
        return db.execute(query, {"bot_id": bot_id}).mappings().all()
    finally:
        db.close()