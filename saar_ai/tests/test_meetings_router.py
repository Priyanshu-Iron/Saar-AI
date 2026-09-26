from app.routers import meetings as meet
from app.services.outputs_store import teaser_from_minutes


def test_recent_returns_teasers(client, monkeypatch):
    rows = [
        {"meeting": {"id": 3, "object_id": "b3", "name": "Q3 vendor review", "meeting_url": "u", "state": 9, "created_at": "2026-09-02"}, "teaser": "Change vendor for Q3"},
        {"meeting": {"id": 2, "object_id": "b2", "name": "Hiring sync", "meeting_url": "u", "state": 9, "created_at": "2026-09-01"}, "teaser": None},
    ]
    monkeypatch.setattr(meet, "get_recent_with_teasers", lambda project_id, limit: rows[:limit])
    body = client.get("/meetings/recent?limit=1").json()
    assert body["count"] == 1
    assert body["meetings"][0]["teaser"] == "Change vendor for Q3"


def test_recent_limit_is_bounded(client, monkeypatch):
    seen = {}
    monkeypatch.setattr(meet, "get_recent_with_teasers", lambda project_id, limit: seen.setdefault("limit", limit) and [])
    client.get("/meetings/recent?limit=500")
    assert seen["limit"] == 20


def test_teaser_prefers_first_decision_then_summary():
    assert teaser_from_minutes({"summary": "S", "decisions": [{"text": "D", "refs": []}]}) == "D"
    assert teaser_from_minutes({"summary": "S", "decisions": []}) == "S"
    assert teaser_from_minutes(None) is None


def test_list_returns_live_and_finished_meetings(client, monkeypatch):
    rows = [
        {"id": 5, "object_id": "b5", "name": "Live standup", "meeting_url": "u", "state": 4, "created_at": "2026-09-03"},
        {"id": 3, "object_id": "b3", "name": "Q3 vendor review", "meeting_url": "u", "state": 9, "created_at": "2026-09-02"},
    ]
    monkeypatch.setattr(meet, "get_all_bots", lambda project_id: rows)
    body = client.get("/meetings").json()
    assert body["count"] == 2
    assert [m["state"] for m in body["meetings"]] == [4, 9]
