from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import verify_api_key
from app.services.meeting_fetcher import (
    get_all_completed_meetings,
    get_meeting_detail,
    get_transcript,
    get_participants,
    get_chat_messages,
    verify_bot_access,
)

router = APIRouter(prefix="/meetings", tags=["Meetings"])

@router.get("")
def list_meetings(project_id: int = Depends(verify_api_key)):
    meetings = get_all_completed_meetings(project_id)
    return {
        "count": len(meetings),
        "meetings": [dict(m) for m in meetings]
    }

@router.get("/{bot_id}")
def meeting_detail(bot_id: int, project_id: int = Depends(verify_api_key)):
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting = get_meeting_detail(bot_id, project_id)
    participants = get_participants(bot_id)
    
    return {
        "meeting": dict(meeting),
        "participants": [dict(p) for p in participants]
    }

@router.get("/{bot_id}/transcript")
def meeting_transcript(bot_id: int, project_id: int = Depends(verify_api_key)):
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    transcript = get_transcript(bot_id)
    return {
        "bot_id": bot_id,
        "utterance_count": len(transcript),
        "transcript": [dict(t) for t in transcript]
    }

@router.get("/{bot_id}/chat")
def meeting_chat(bot_id: int, project_id: int = Depends(verify_api_key)):
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    messages = get_chat_messages(bot_id)
    return {
        "bot_id": bot_id,
        "message_count": len(messages),
        "messages": [dict(m) for m in messages]
    }
