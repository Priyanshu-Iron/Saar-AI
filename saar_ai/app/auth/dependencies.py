# app/auth/dependencies.py
import hashlib
from fastapi import Header, HTTPException
from sqlalchemy import text
from app.db.connection import SessionLocal

def verify_api_key(authorization: str = Header(...)) -> int:
    """
    Extract API key from 'Bearer <key>' header,
    verify against bots_apikey table,
    return project_id for data isolation.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    api_key = authorization.replace("Bearer ", "")
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    
    db = SessionLocal()
    try:
        result = db.execute(
            text("""
                SELECT project_id FROM bots_apikey 
                WHERE key_hash = :key_hash 
                AND disabled_at IS NULL
            """),
            {"key_hash": key_hash}
        ).mappings().first()
        
        if not result:
            raise HTTPException(status_code=401, detail="Invalid or disabled API key")
        
        return result["project_id"]
    finally:
        db.close()