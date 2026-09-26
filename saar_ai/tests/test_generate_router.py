import pytest

from app.routers import generate as gen
from app.routers import meetings as meet
from app.schemas.essence import Cited, Insights, Minutes, Sentiment, Strategy
from app.services import generation_lock

ROWS = [{"speaker": "Ravi", "text": "We change vendor", "timestamp_ms": 0, "duration_ms": 1}]
PEOPLE = [{"full_name": "Ravi", "is_host": True}]


class Store:
    """In-memory stand-in for outputs_store."""

    def __init__(self):
        self.rows = {}

    def save_output(self, bot_id, project_id, output_type, content, fmt):
        self.rows[(bot_id, project_id, output_type)] = {"format": fmt, "content": content, "created_at": "2026-09-06"}

    def get_outputs(self, bot_id, project_id):
        import json
        out = {}
        for (b, p, t), row in self.rows.items():
            if b == bot_id and p == project_id:
                content = json.loads(row["content"]) if row["format"] == "json" else row["content"]
                out[t] = {"format": row["format"], "content": content, "created_at": row["created_at"]}
        return out

    def get_done_types(self, bot_id, project_id):
        return [t for t in ("mom", "insights", "strategy") if (bot_id, project_id, t) in self.rows and self.rows[(bot_id, project_id, t)]["format"] == "json"]


@pytest.fixture
def store(monkeypatch):
    s = Store()
    for module in (gen, meet):
        monkeypatch.setattr(module, "verify_bot_access", lambda bot_id, project_id: bot_id != 404)
        monkeypatch.setattr(module, "get_outputs", s.get_outputs, raising=False)
    monkeypatch.setattr(gen, "get_transcript", lambda bot_id: ROWS)
    monkeypatch.setattr(gen, "get_participants", lambda bot_id: PEOPLE)
    monkeypatch.setattr(gen, "save_output", s.save_output)
    monkeypatch.setattr(gen, "get_done_types", s.get_done_types)
    monkeypatch.setattr(gen, "generate_mom", lambda u, p: Minutes(summary="s", decisions=[Cited(text="d", refs=[0])]))
    monkeypatch.setattr(gen, "generate_insight", lambda u, p: Insights(sentiment=Sentiment(overall="neutral", note="n")))
    monkeypatch.setattr(gen, "generate_strategy", lambda u, p: Strategy())
    generation_lock._running.clear()
    return s


def test_per_type_endpoint_returns_structured_content(client, store):
    r = client.post("/generate/mom/7")
    assert r.status_code == 200
    body = r.json()
    assert body["type"] == "mom" and body["format"] == "json"
    assert body["content"]["decisions"][0]["refs"] == [0]
    assert store.rows[(7, 1, "mom")]["format"] == "json"


def test_all_saves_each_section_and_reports_failures(client, store, monkeypatch):
    def boom(u, p):
        raise RuntimeError("provider down")
    monkeypatch.setattr(gen, "generate_strategy", boom)
    r = client.post("/generate/all/7")
    assert r.status_code == 200
    assert r.json()["done"] == ["mom", "insights"]
    assert r.json()["failed"] == {"strategy": "Could not generate this section."}
    assert (7, 1, "mom") in store.rows and (7, 1, "strategy") not in store.rows


def test_all_returns_502_when_everything_fails(client, store, monkeypatch):
    def boom(u, p):
        raise RuntimeError("down")
    for name in ("generate_mom", "generate_insight", "generate_strategy"):
        monkeypatch.setattr(gen, name, boom)
    r = client.post("/generate/all/7")
    assert r.status_code == 502
    assert r.json()["detail"] == "Could not generate any section."


def test_lock_returns_409_and_clears_after_failure(client, store, monkeypatch):
    assert generation_lock.acquire(7)
    assert client.post("/generate/mom/7").status_code == 409
    assert client.get("/generate/status/7").json()["running"] is True
    generation_lock.release(7)

    def boom(u, p):
        raise RuntimeError("down")
    monkeypatch.setattr(gen, "generate_mom", boom)
    r = client.post("/generate/mom/7")
    assert r.status_code == 502
    assert isinstance(r.json()["detail"], str)
    assert r.json()["detail"] == "Could not generate mom."
    assert generation_lock.is_running(7) is False


def test_status_lists_done_json_sections(client, store):
    client.post("/generate/mom/7")
    body = client.get("/generate/status/7").json()
    assert body == {"running": False, "done": ["mom"]}


def test_outputs_endpoint_reports_both_formats(client, store):
    store.save_output(7, 1, "insights", "### old markdown", "markdown")
    client.post("/generate/mom/7")
    body = client.get("/meetings/7/outputs").json()
    assert body["has_outputs"] is True
    assert body["outputs"]["mom"]["format"] == "json"
    assert body["outputs"]["mom"]["content"]["summary"] == "s"
    assert body["outputs"]["insights"] == {"format": "markdown", "content": "### old markdown", "created_at": "2026-09-06"}


def test_outputs_has_outputs_false_with_only_markdown(client, store):
    store.save_output(7, 1, "mom", "### old", "markdown")
    assert client.get("/meetings/7/outputs").json()["has_outputs"] is False


def test_unknown_bot_is_404(client, store):
    assert client.post("/generate/mom/404").status_code == 404
    assert client.get("/generate/status/404").status_code == 404
