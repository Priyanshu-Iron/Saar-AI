from datetime import datetime

import pytest

from app.routers import admin as admin_router

USERS = {
    1: {"id": 1, "email": "admin@example.com", "project_id": 11, "status": "approved"},
    2: {"id": 2, "email": "wait@example.com", "project_id": 12, "status": "pending"},
}


@pytest.fixture
def backend(monkeypatch):
    log = {"status": [], "grant": [], "revoke": [], "keys_off": [], "set": [], "sync": 0}
    stored = {}
    store = admin_router.accounts_store
    monkeypatch.setattr(store, "list_users", lambda: [
        {"id": 2, "email": "wait@example.com", "joined_at": datetime(2026, 9, 25), "status": "pending", "decided_at": None},
        {"id": 1, "email": "admin@example.com", "joined_at": datetime(2026, 9, 1), "status": "pending", "decided_at": None},
    ])
    monkeypatch.setattr(store, "get_user", lambda uid: USERS.get(uid))
    monkeypatch.setattr(store, "set_status", lambda uid, status, by: log["status"].append((uid, status, by)))
    monkeypatch.setattr(store, "disable_api_keys", lambda pid: log["keys_off"].append(pid))
    sync = admin_router.deepgram_sync
    monkeypatch.setattr(sync, "grant", lambda pid: log["grant"].append(pid) or True)
    monkeypatch.setattr(sync, "revoke", lambda pid: log["revoke"].append(pid))

    def sync_all():
        log["sync"] += 1
        return 1

    monkeypatch.setattr(sync, "sync_all", sync_all)
    settings = admin_router.settings_store

    def set_setting(key, value, uid):
        stored[key] = value
        log["set"].append((key, value))

    monkeypatch.setattr(settings, "set_setting", set_setting)
    monkeypatch.setattr(settings, "get_setting", lambda key: stored.get(key))
    monkeypatch.setattr(settings, "masked_settings", lambda: {"llm_provider": stored.get("llm_provider")})
    log["stored"] = stored
    return log


@pytest.fixture
def as_admin(as_caller):
    return as_caller(user_id=1, project_id=11, email="admin@example.com", is_admin=True)


@pytest.mark.parametrize("method,path", [
    ("GET", "/admin/users"), ("POST", "/admin/users/2/approve"), ("POST", "/admin/users/2/disable"),
    ("POST", "/admin/users/2/enable"), ("GET", "/admin/settings"), ("PUT", "/admin/settings"),
])
def test_non_admin_is_refused(api, as_caller, backend, method, path):
    as_caller()
    r = api.request(method, path, json={})
    assert (r.status_code, r.json()["detail"]) == (403, "admin_only")


def test_list_users_marks_the_admin_approved(api, as_admin, backend):
    users = api.get("/admin/users").json()["users"]
    assert [u["id"] for u in users] == [2, 1]
    assert users[1]["is_admin"] is True and users[1]["status"] == "approved"
    assert users[0]["is_admin"] is False and users[0]["status"] == "pending"


def test_approve_grants_deepgram(api, as_admin, backend):
    assert api.post("/admin/users/2/approve").json() == {"id": 2, "status": "approved"}
    assert backend["status"] == [(2, "approved", 1)]
    assert backend["grant"] == [12]


def test_enable_is_approve(api, as_admin, backend):
    assert api.post("/admin/users/2/enable").json() == {"id": 2, "status": "approved"}
    assert backend["grant"] == [12]


def test_disable_revokes_and_kills_keys(api, as_admin, backend):
    assert api.post("/admin/users/2/disable").json() == {"id": 2, "status": "disabled"}
    assert backend["status"] == [(2, "disabled", 1)]
    assert backend["revoke"] == [12] and backend["keys_off"] == [12]


def test_admin_cannot_disable_themselves(api, as_admin, backend):
    r = api.post("/admin/users/1/disable")
    assert r.status_code == 400
    assert backend["status"] == []


def test_unknown_user_is_404(api, as_admin, backend):
    assert api.post("/admin/users/99/approve").status_code == 404


def test_put_settings_ignores_blank_fields(api, as_admin, backend):
    api.put("/admin/settings", json={"openai_api_key": "sk-new", "google_api_key": "  ", "deepgram_api_key": ""})
    assert backend["set"] == [("openai_api_key", "sk-new")]
    assert backend["sync"] == 0


def test_put_deepgram_key_syncs_all_projects(api, as_admin, backend):
    api.put("/admin/settings", json={"deepgram_api_key": " dg-new "})
    assert backend["set"] == [("deepgram_api_key", "dg-new")]
    assert backend["sync"] == 1


def test_switching_provider_resets_the_model(api, as_admin, backend):
    backend["stored"].update(llm_provider="openai", llm_model="gpt-4o-mini")
    api.put("/admin/settings", json={"llm_provider": "google"})
    assert backend["stored"]["llm_model"] == "gemini-1.5-flash"


def test_provider_with_explicit_model_keeps_it(api, as_admin, backend):
    api.put("/admin/settings", json={"llm_provider": "google", "llm_model": "gemini-2.0-flash"})
    assert backend["stored"]["llm_model"] == "gemini-2.0-flash"


def test_unknown_provider_is_422(api, as_admin, backend):
    assert api.put("/admin/settings", json={"llm_provider": "anthropic"}).status_code == 422
