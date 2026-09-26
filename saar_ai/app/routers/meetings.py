import os
import httpx
import secrets
import string
import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from app.auth.dependencies import verify_api_key
from app.services.meeting_fetcher import (
    get_all_bots,
    get_meeting_detail,
    get_transcript,
    get_participants,
    get_chat_messages,
    verify_bot_access,
)
from app.services.outputs_store import get_outputs, get_recent_with_teasers

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/meetings", tags=["Meetings"])

# --- Schemas ---
class CreateMeetingRequest(BaseModel):
    meeting_url: str
    bot_name: str = "SaarAI Bot"

# Attendee's Django API runs on a separate port (default 8000)
ATTENDEE_API_BASE = os.getenv("ATTENDEE_API_URL", "http://localhost:8000")
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "https://rohan-realizing-cicely.ngrok-free.dev/my-ai-handler")

# --- Create Meeting ---
@router.post("")
def create_meeting(request: CreateMeetingRequest, authorization: str = Header(...), project_id: int = Depends(verify_api_key)):
    """
    Forwards the bot creation request to the attendee Django API,
    which properly dispatches the Celery run_bot task so the bot actually joins.
    The user's raw API key is forwarded as 'Token <key>' (attendee's auth format).
    """
    # Extract the raw key from "Bearer <key>" → "Token <key>" for attendee
    raw_key = authorization.replace("Bearer ", "").strip()
    
    # Build the payload with Deepgram transcription settings
    payload = {
        "meeting_url": request.meeting_url,
        "bot_name": request.bot_name,
        "transcription_settings": {
            "deepgram": {
                "model": "nova-3",
                "language": "multi",
            }
        },
    }
    
    logger.info(f"Sending bot creation payload to attendee: {payload}")
    print(f"[DEBUG] Bot creation payload: {payload}")
    
    try:
        resp = httpx.post(
            f"{ATTENDEE_API_BASE}/api/v1/bots",
            headers={
                "Authorization": f"Token {raw_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15.0,
        )
        
        if resp.status_code == 201:
            data = resp.json()
            return {
                "bot_id": data.get("id"),
                "object_id": data.get("id"),
                "name": request.bot_name,
                "meeting_url": request.meeting_url,
                "status": data.get("state", "joining"),
                "message": "Bot is being sent to your meeting!",
            }
        else:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Failed to create bot: {resp.text}"
            )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Could not connect to attendee API at {ATTENDEE_API_BASE}. Make sure attendee is running."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create meeting: {str(e)}")

# --- Bot status (all states) ---
@router.get("/bots/status")
def bots_status(project_id: int = Depends(verify_api_key)):
    bots = get_all_bots(project_id)
    return {
        "count": len(bots),
        "bots": [dict(b) for b in bots]
    }

# --- List all meetings (live and finished), newest first ---
@router.get("")
def list_meetings(project_id: int = Depends(verify_api_key)):
    meetings = get_all_bots(project_id)
    return {
        "count": len(meetings),
        "meetings": [dict(m) for m in meetings]
    }

# --- Recent finished meetings with a one-line teaser (Dashboard) ---
@router.get("/recent")
def recent_meetings(limit: int = 5, project_id: int = Depends(verify_api_key)):
    limit = max(1, min(limit, 20))
    meetings = get_recent_with_teasers(project_id, limit)
    return {"count": len(meetings), "meetings": meetings}

# --- Meeting detail ---
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

# --- Transcript ---
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

# --- Chat messages ---
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

# --- Saved AI outputs ---
@router.get("/{bot_id}/outputs")
def meeting_outputs(bot_id: int, project_id: int = Depends(verify_api_key)):
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    outputs = get_outputs(bot_id, project_id)
    return {
        "bot_id": bot_id,
        "has_outputs": any(o["format"] == "json" for o in outputs.values()),
        "outputs": outputs,
    }

