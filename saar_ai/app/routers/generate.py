from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import verify_api_key
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

@router.post("/mom/{bot_id}")
def generate_meeting_mom(bot_id: int, project_id: int = Depends(verify_api_key)):
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    transcript = get_full_transcript_text(bot_id)
    if not transcript:
        raise HTTPException(status_code=400, detail="No transcript available for this meeting")
    
    participants = [dict(p) for p in get_participants(bot_id)]
    result = generate_mom(transcript, participants)
    
    return {
        "bot_id": bot_id,
        "type": "mom",
        "content": result
    }

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
    
    return {
        "bot_id": bot_id,
        "type": "insights",
        "content": result
    }

@router.post("/strategy/{bot_id}")
def generate_meeting_strategy(bot_id: int, project_id: int = Depends(verify_api_key)):
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    transcript = get_full_transcript_text(bot_id)
    if not transcript:
        raise HTTPException(status_code=400, detail="No transcript available for this meeting")
    
    participants = [dict(p) for p in get_participants(bot_id)]
    result = generate_strategy(transcript, participants)
    
    return {
        "bot_id": bot_id,
        "type": "strategy",
        "content": result
    }

@router.post("/all/{bot_id}")
def generate_all(bot_id: int, project_id: int = Depends(verify_api_key)):
    """Generate MOM, Insights, and Strategy in one call."""
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    transcript = get_full_transcript_text(bot_id)
    if not transcript:
        raise HTTPException(status_code=400, detail="No transcript available for this meeting")
    
    participants = [dict(p) for p in get_participants(bot_id)]
    utterance_count = len(get_transcript(bot_id))
    
    return {
        "bot_id": bot_id,
        "mom": generate_mom(transcript, participants),
        "insights": generate_insight(transcript, participants, utterance_count),
        "strategy": generate_strategy(transcript, participants)
    }
