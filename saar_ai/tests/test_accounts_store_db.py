"""Runs every accounts_store query against the local Postgres. Opt in with SAARAI_DB_TESTS=1."""
import os
import uuid

import pytest
from sqlalchemy import text

pytestmark = pytest.mark.skipif(os.getenv("SAARAI_DB_TESTS") != "1", reason="set SAARAI_DB_TESTS=1 to run")


@pytest.fixture
def store():
    from app.db.init_saarai_tables import init_saarai_tables
    from app.services import accounts_store

    init_saarai_tables()
    return accounts_store


@pytest.fixture
def cleanup():
    project_ids = []
    yield project_ids
    from app.db.connection import SessionLocal

    db = SessionLocal()
    try:
        for pid in project_ids:
            org_id = db.execute(text("SELECT organization_id FROM bots_project WHERE id = :p"), {"p": pid}).scalar()
            db.execute(text("DELETE FROM bots_apikey WHERE project_id = :p"), {"p": pid})
            db.execute(text("DELETE FROM bots_credentials WHERE project_id = :p"), {"p": pid})
            db.execute(text("DELETE FROM accounts_user WHERE organization_id = :o"), {"o": org_id})
            db.execute(text("DELETE FROM bots_project WHERE id = :p"), {"p": pid})
            db.execute(text("DELETE FROM accounts_organization WHERE id = :o"), {"o": org_id})
        db.commit()
    finally:
        db.close()


def test_account_lifecycle(store, cleanup):
    from app.auth.utils import hash_api_key

    email = f"db-test-{uuid.uuid4().hex[:8]}@Example.com"
    account = store.create_account(email, "not-a-real-hash", "pending")
    cleanup.append(account["project_id"])

    assert store.email_exists(email.lower())
    login = store.find_login_user(email.upper())
    assert login["user_id"] == account["user_id"] and login["status"] == "pending"

    caller = store.lookup_caller(hash_api_key(account["api_key"]))
    assert caller == {"user_id": account["user_id"], "project_id": account["project_id"], "email": email, "status": "pending"}

    listed = {u["id"]: u for u in store.list_users()}
    assert listed[account["user_id"]]["status"] == "pending"

    store.set_status(account["user_id"], "approved", decided_by=None)
    assert store.get_user(account["user_id"])["status"] == "approved"

    new_key = store.rotate_api_key(account["project_id"])
    assert store.lookup_caller(hash_api_key(account["api_key"])) is None
    assert store.lookup_caller(hash_api_key(new_key))["status"] == "approved"

    store.disable_api_keys(account["project_id"])
    assert store.lookup_caller(hash_api_key(new_key)) is None
