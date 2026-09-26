import json

import pytest

from app.config import fernet
from app.services import deepgram_sync, settings_store


@pytest.fixture
def calls(monkeypatch):
    log = {"upsert": [], "delete": []}
    monkeypatch.setattr(deepgram_sync, "_upsert", lambda ids, blob: log["upsert"].append((list(ids), blob)))
    monkeypatch.setattr(deepgram_sync, "_delete", lambda pid: log["delete"].append(pid))
    monkeypatch.setattr(deepgram_sync, "_approved_project_ids", lambda: [3, 5])
    return log


def use_key(monkeypatch, value):
    monkeypatch.setattr(settings_store, "get_setting", lambda key: value if key == "deepgram_api_key" else None)


def test_credential_uses_attendees_format():
    blob = deepgram_sync.encrypt_credential("dg-key")
    assert json.loads(fernet().decrypt(blob)) == {"api_key": "dg-key"}


def test_grant_writes_the_stored_key(monkeypatch, calls):
    use_key(monkeypatch, "dg-key")
    assert deepgram_sync.grant(7) is True
    [(ids, blob)] = calls["upsert"]
    assert ids == [7]
    assert json.loads(fernet().decrypt(blob)) == {"api_key": "dg-key"}


def test_grant_without_a_key_does_nothing(monkeypatch, calls):
    use_key(monkeypatch, None)
    assert deepgram_sync.grant(7) is False
    assert calls["upsert"] == []


def test_revoke_deletes(calls):
    deepgram_sync.revoke(7)
    assert calls["delete"] == [7]


def test_sync_all_writes_every_approved_project(monkeypatch, calls):
    use_key(monkeypatch, "dg-new")
    assert deepgram_sync.sync_all() == 2
    assert calls["upsert"][0][0] == [3, 5]


def test_sync_all_without_a_key_does_nothing(monkeypatch, calls):
    use_key(monkeypatch, None)
    assert deepgram_sync.sync_all() == 0
    assert calls["upsert"] == []
