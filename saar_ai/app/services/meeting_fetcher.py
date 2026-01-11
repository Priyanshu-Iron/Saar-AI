from sqlalchemy import text
from app.db.connection import SessionLocal, get_db_session

def get_all_completed_meetings():
    db = SessionLocal()
    try:
        query = text("""
            SELECT id, object_id, name, meeting_url, state, created_at
            FROM bots_bot
            WHERE state = 9
            ORDER BY created_at DESC
        """)
        return db.execute(query).mappings().all()
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