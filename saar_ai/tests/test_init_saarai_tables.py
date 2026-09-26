import pytest

from app.db import init_saarai_tables as mod


class _FakeResult:
    def __init__(self, value):
        self._value = value

    def scalar(self):
        return self._value


class _FakeConn:
    """Stands in for a SQLAlchemy connection: records the query, returns a canned count."""

    def __init__(self, count):
        self.count = count
        self.calls = []

    def execute(self, statement, params=None):
        self.calls.append((str(statement), params))
        return _FakeResult(self.count)


def test_single_admin_match_is_fine(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAIL", "admin@example.com")
    conn = _FakeConn(1)
    mod._check_admin_email_unique(conn)  # no exception
    assert conn.calls[0][1] == {"admin": "admin@example.com"}


def test_no_admin_match_is_fine(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAIL", "admin@example.com")
    mod._check_admin_email_unique(_FakeConn(0))  # no exception


def test_missing_admin_email_skips_the_check(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAIL", "")
    conn = _FakeConn(5)
    mod._check_admin_email_unique(conn)  # no exception, no query
    assert conn.calls == []


def test_duplicate_admin_email_exits(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAIL", "admin@example.com")
    with pytest.raises(SystemExit, match="More than one account matches ADMIN_EMAIL"):
        mod._check_admin_email_unique(_FakeConn(2))
