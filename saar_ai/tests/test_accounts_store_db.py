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


def test_deepgram_upsert_and_delete(store, cleanup):
    import json

    from app.config import fernet
    from app.db.connection import SessionLocal
    from app.services import deepgram_sync

    email = f"db-test-{uuid.uuid4().hex[:8]}@example.com"
    account = store.create_account(email, "not-a-real-hash", "approved")
    cleanup.append(account["project_id"])
    pid = account["project_id"]

    deepgram_sync._upsert([pid], deepgram_sync.encrypt_credential("first"))
    deepgram_sync._upsert([pid], deepgram_sync.encrypt_credential("second"))
    assert pid in deepgram_sync._approved_project_ids()

    db = SessionLocal()
    try:
        rows = db.execute(
            text("SELECT _encrypted_data FROM bots_credentials WHERE project_id = :p AND credential_type = 1"), {"p": pid}
        ).all()
    finally:
        db.close()
    assert len(rows) == 1
    assert json.loads(fernet().decrypt(bytes(rows[0][0]))) == {"api_key": "second"}

    deepgram_sync._delete(pid)
    db = SessionLocal()
    try:
        assert db.execute(text("SELECT 1 FROM bots_credentials WHERE project_id = :p"), {"p": pid}).first() is None
    finally:
        db.close()
