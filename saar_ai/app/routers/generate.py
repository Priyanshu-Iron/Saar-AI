from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from app.auth.dependencies import verify_api_key
from app.db.connection import SessionLocal
from app.services.meeting_fetcher import (
    verify_bot_access,
    get_full_transcript_text,
    get_participants,
    get_transcript,
)
from app.services.mom_generator import generate_mom
from app.services.insight_generator import generate_insight
from app.services.strategy_generator import generate_strategy

router = APIRouter(prefix="/generate", tags=["AI Generation"])

def _save_output(bot_id: int, project_id: int, output_type: str, content: str):
    """Save or update a generated output in saarai_outputs."""
    db = SessionLocal()
    try:
        db.execute(
            text("""
                INSERT INTO saarai_outputs (bot_id, project_id, output_type, content)
                VALUES (:bot_id, :project_id, :output_type, :content)
                ON CONFLICT (bot_id, project_id, output_type)
                DO UPDATE SET content = :content, created_at = NOW()
            """),
            {"bot_id": bot_id, "project_id": project_id, "output_type": output_type, "content": content},
        )
        db.commit()
    finally:
        db.close()


@router.post("/mom/{bot_id}")
def generate_meeting_mom(bot_id: int, project_id: int = Depends(verify_api_key)):
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    transcript = get_full_transcript_text(bot_id)
    if not transcript:
        raise HTTPException(status_code=400, detail="No transcript available for this meeting")
    
    participants = [dict(p) for p in get_participants(bot_id)]
    result = generate_mom(transcript, participants)
    _save_output(bot_id, project_id, "mom", result)
    
    return {"bot_id": bot_id, "type": "mom", "content": result}

@router.post("/insights/{bot_id}")
def generate_meeting_insights(bot_id: int, project_id: int = Depends(verify_api_key)):
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    transcript = get_full_transcript_text(bot_id)
    if not transcript:
        raise HTTPException(status_code=400, detail="No transcript available for this meeting")
    
    participants = [dict(p) for p in get_participants(bot_id)]
    utterance_count = len(get_transcript(bot_id))
    result = generate_insight(transcript, participants, utterance_count)
    _save_output(bot_id, project_id, "insights", result)
    
    return {"bot_id": bot_id, "type": "insights", "content": result}

@router.post("/strategy/{bot_id}")
def generate_meeting_strategy(bot_id: int, project_id: int = Depends(verify_api_key)):
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    transcript = get_full_transcript_text(bot_id)
    if not transcript:
        raise HTTPException(status_code=400, detail="No transcript available for this meeting")
    
    participants = [dict(p) for p in get_participants(bot_id)]
    result = generate_strategy(transcript, participants)
    _save_output(bot_id, project_id, "strategy", result)
    
    return {"bot_id": bot_id, "type": "strategy", "content": result}

@router.post("/all/{bot_id}")
def generate_all(bot_id: int, project_id: int = Depends(verify_api_key)):
    """Generate MOM, Insights, and Strategy — save all to DB."""
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    transcript = get_full_transcript_text(bot_id)
    if not transcript:
        raise HTTPException(status_code=400, detail="No transcript available for this meeting")
    
    participants = [dict(p) for p in get_participants(bot_id)]
    utterance_count = len(get_transcript(bot_id))
    
    mom = generate_mom(transcript, participants)
    insights = generate_insight(transcript, participants, utterance_count)
    strat = generate_strategy(transcript, participants)
    
    _save_output(bot_id, project_id, "mom", mom)
    _save_output(bot_id, project_id, "insights", insights)
    _save_output(bot_id, project_id, "strategy", strat)
    
    return {
        "bot_id": bot_id,
        "mom": mom,
        "insights": insights,
        "strategy": strat,
    }
