from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import verify_api_key
from app.schemas.essence import Insights, Minutes, Strategy
from app.services import generation_lock
from app.services.insight_generator import generate_insight
from app.services.meeting_fetcher import get_participants, get_transcript, verify_bot_access
from app.services.mom_generator import generate_mom
from app.services.outputs_store import get_done_types, save_output
from app.services.strategy_generator import generate_strategy

router = APIRouter(prefix="/generate", tags=["AI Generation"])

SECTIONS = ("mom", "insights", "strategy")


def _inputs(bot_id: int, project_id: int):
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    utterances = [dict(u) for u in get_transcript(bot_id)]
    if not utterances:
        raise HTTPException(status_code=400, detail="No transcript available for this meeting")
    participants = [dict(p) for p in get_participants(bot_id)]
    return utterances, participants


def _run_one(bot_id: int, project_id: int, output_type: str, utterances, participants):
    """Run one generator and save it. Raises on failure."""
    # Late lookup so tests can monkeypatch the module attributes.
    generator = {"mom": generate_mom, "insights": generate_insight, "strategy": generate_strategy}[output_type]
    result = generator(utterances, participants)
    save_output(bot_id, project_id, output_type, result.model_dump_json(), "json")
    return result


def _lock_or_409(bot_id: int):
    if not generation_lock.acquire(bot_id):
        raise HTTPException(status_code=409, detail="Generation already running")


def _generate_single(bot_id: int, project_id: int, output_type: str):
    utterances, participants = _inputs(bot_id, project_id)
    _lock_or_409(bot_id)
    try:
        result = _run_one(bot_id, project_id, output_type, utterances, participants)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not generate {output_type}: {exc}") from exc
    finally:
        generation_lock.release(bot_id)
    return {"bot_id": bot_id, "type": output_type, "format": "json", "content": result.model_dump()}


@router.post("/mom/{bot_id}")
def generate_meeting_mom(bot_id: int, project_id: int = Depends(verify_api_key)):
    return _generate_single(bot_id, project_id, "mom")


@router.post("/insights/{bot_id}")
def generate_meeting_insights(bot_id: int, project_id: int = Depends(verify_api_key)):
    return _generate_single(bot_id, project_id, "insights")


@router.post("/strategy/{bot_id}")
def generate_meeting_strategy(bot_id: int, project_id: int = Depends(verify_api_key)):
    return _generate_single(bot_id, project_id, "strategy")


@router.post("/all/{bot_id}")
def generate_all(bot_id: int, project_id: int = Depends(verify_api_key)):
    """Run all three generators, saving after each, and report what succeeded."""
    utterances, participants = _inputs(bot_id, project_id)
    _lock_or_409(bot_id)
    done: list[str] = []
    failed: dict[str, str] = {}
    try:
        for output_type in SECTIONS:
            try:
                _run_one(bot_id, project_id, output_type, utterances, participants)
                done.append(output_type)
            except Exception as exc:  # one section failing must not stop the others
                failed[output_type] = str(exc)
    finally:
        generation_lock.release(bot_id)
    if not done:
        raise HTTPException(status_code=502, detail={"failed": failed})
    return {"bot_id": bot_id, "done": done, "failed": failed}


@router.get("/status/{bot_id}")
def generation_status(bot_id: int, project_id: int = Depends(verify_api_key)):
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"running": generation_lock.is_running(bot_id), "done": get_done_types(bot_id, project_id)}
