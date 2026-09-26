import pytest

from app.auth.utils import hash_password
from app.routers import auth as auth_router

PASSWORD = "password123"
HASHED = hash_password(PASSWORD)


@pytest.fixture
def store(monkeypatch):
    calls = {"create": [], "grant": [], "rotate": []}
    users = {}

    def create_account(email, password_hash, status):
        calls["create"].append((email, status))
        return {"user_id": 5, "project_id": 8, "api_key": "new-key"}

    monkeypatch.setattr(auth_router.accounts_store, "email_exists", lambda email: email.lower() in users)
    monkeypatch.setattr(auth_router.accounts_store, "create_account", create_account)
    monkeypatch.setattr(auth_router.accounts_store, "find_login_user", lambda email: users.get(email.lower()))
    monkeypatch.setattr(auth_router.accounts_store, "rotate_api_key", lambda pid: calls["rotate"].append(pid) or "login-key")
    monkeypatch.setattr(auth_router.deepgram_sync, "grant", lambda pid: calls["grant"].append(pid) or True)

    def add_user(email, status):
        users[email.lower()] = {"user_id": 5, "email": email, "password": HASHED, "project_id": 8, "status": status}

    calls["add_user"] = add_user
    return calls


def test_register_creates_a_pending_account(api, store):
    r = api.post("/auth/register", json={"email": "new@example.com", "password": PASSWORD})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "pending" and body["is_admin"] is False and body["api_key"] == "new-key"
    assert store["create"] == [("new@example.com", "pending")]
    assert store["grant"] == []


def test_register_with_admin_email_is_approved_and_granted_deepgram(api, store):
    r = api.post("/auth/register", json={"email": "Admin@Example.com", "password": PASSWORD})
    body = r.json()
    assert body["status"] == "approved" and body["is_admin"] is True
    assert store["create"][0][1] == "approved"
    assert store["grant"] == [8]


def test_register_rejects_a_taken_email(api, store):
    store["add_user"]("taken@example.com", "approved")
    r = api.post("/auth/register", json={"email": "Taken@example.com", "password": PASSWORD})
    assert r.status_code == 400


def test_login_pending_user_gets_a_key_and_status(api, store):
    store["add_user"]("wait@example.com", "pending")
    r = api.post("/auth/login", json={"email": "wait@example.com", "password": PASSWORD})
    assert r.status_code == 200
    assert r.json()["status"] == "pending"
    assert store["rotate"] == [8]


def test_login_disabled_user_is_refused_without_a_key(api, store):
    store["add_user"]("gone@example.com", "disabled")
    r = api.post("/auth/login", json={"email": "gone@example.com", "password": PASSWORD})
    assert r.status_code == 403
    assert r.json()["detail"] == "Your account has been disabled."
    assert store["rotate"] == []


def test_login_admin_is_approved_even_without_an_access_row(api, store):
    store["add_user"]("admin@example.com", None)
    body = api.post("/auth/login", json={"email": "admin@example.com", "password": PASSWORD}).json()
    assert body["status"] == "approved" and body["is_admin"] is True


def test_login_wrong_password(api, store):
    store["add_user"]("u@example.com", "approved")
    r = api.post("/auth/login", json={"email": "u@example.com", "password": "wrongpassword"})
    assert r.status_code == 401


def test_me_reports_the_caller(api, as_caller):
    as_caller(email="wait@example.com", status="pending")
    assert api.get("/auth/me").json() == {"email": "wait@example.com", "status": "pending", "is_admin": False}
