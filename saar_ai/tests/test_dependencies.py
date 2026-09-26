import pytest
from fastapi import HTTPException

from app.auth import dependencies as deps
from app.auth.utils import hash_api_key
from app.main import app
from app.routers import generate as gen


def row(**overrides):
    return {"user_id": 2, "project_id": 9, "email": "user@example.com", "status": "approved", **overrides}


def test_get_caller_resolves_the_key(monkeypatch):
    seen = {}
    monkeypatch.setattr(deps.accounts_store, "lookup_caller", lambda h: seen.setdefault("hash", h) and row())
    caller = deps.get_caller("Bearer secret-key")
    assert seen["hash"] == hash_api_key("secret-key")
    assert caller == deps.Caller(user_id=2, project_id=9, email="user@example.com", status="approved", is_admin=False)


def test_get_caller_rejects_bad_header_and_unknown_key(monkeypatch):
    monkeypatch.setattr(deps.accounts_store, "lookup_caller", lambda h: None)
    with pytest.raises(HTTPException) as bad:
        deps.get_caller("Token abc")
    assert bad.value.status_code == 401
    with pytest.raises(HTTPException) as unknown:
        deps.get_caller("Bearer abc")
    assert unknown.value.status_code == 401


def test_missing_access_row_counts_as_pending(monkeypatch):
    monkeypatch.setattr(deps.accounts_store, "lookup_caller", lambda h: row(status=None))
    assert deps.get_caller("Bearer k").status == "pending"


def test_admin_email_is_always_approved(monkeypatch):
    monkeypatch.setattr(deps.accounts_store, "lookup_caller", lambda h: row(email=" Admin@Example.com", status="pending"))
    caller = deps.get_caller("Bearer k")
    assert caller.is_admin and caller.status == "approved"


@pytest.mark.parametrize("status", ["pending", "disabled"])
def test_require_approved_blocks(status):
    caller = deps.Caller(user_id=2, project_id=9, email="u@example.com", status=status, is_admin=False)
    with pytest.raises(HTTPException) as exc:
        deps.require_approved(caller)
    assert (exc.value.status_code, exc.value.detail) == (403, f"account_{status}")


def test_require_approved_returns_project():
    caller = deps.Caller(user_id=2, project_id=9, email="u@example.com", status="approved", is_admin=False)
    assert deps.require_approved(caller) == 9


def test_require_admin():
    user = deps.Caller(user_id=2, project_id=9, email="u@example.com", status="approved", is_admin=False)
    with pytest.raises(HTTPException) as exc:
        deps.require_admin(user)
    assert (exc.value.status_code, exc.value.detail) == (403, "admin_only")
    admin = deps.Caller(user_id=1, project_id=1, email="admin@example.com", status="approved", is_admin=True)
    assert deps.require_admin(admin) is admin


def data_routes():
    """Every /meetings and /generate route, with a sample path."""
    for route in app.routes:
        path = getattr(route, "path", "")
        if path.startswith(("/meetings", "/generate")):
            for method in route.methods - {"HEAD", "OPTIONS"}:
                yield method, path.replace("{bot_id}", "7")


@pytest.mark.parametrize("method,path", sorted(set(data_routes())))
def test_pending_user_is_blocked_on_every_data_route(api, as_caller, method, path):
    as_caller(status="pending")
    response = api.request(
        method, path, json={"meeting_url": "https://meet.example/x"}, headers={"Authorization": "Bearer k"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "account_pending"


def test_approved_user_passes_the_gate(api, as_caller, monkeypatch):
    as_caller(status="approved")
    monkeypatch.setattr(gen, "verify_bot_access", lambda bot_id, project_id: False)
    assert api.get("/generate/status/7").status_code == 404
