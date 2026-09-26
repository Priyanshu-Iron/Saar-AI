import os

from cryptography.fernet import Fernet

os.environ["SAARAI_SKIP_DB_INIT"] = "1"
# Set before app import; load_dotenv never overrides existing variables.
os.environ["ADMIN_EMAIL"] = "admin@example.com"
os.environ["CREDENTIALS_ENCRYPTION_KEY"] = Fernet.generate_key().decode()

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import Caller, get_caller, require_approved
from app.main import app

BASE_CALLER = {"user_id": 2, "project_id": 1, "email": "user@example.com", "status": "approved", "is_admin": False}


@pytest.fixture
def client():
    """Client for route tests that don't care about auth: every call is project 1."""
    app.dependency_overrides[require_approved] = lambda: 1
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def api():
    """Client with real auth gates; pair with as_caller."""
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def as_caller():
    def use(**overrides) -> Caller:
        caller = Caller(**{**BASE_CALLER, **overrides})
        app.dependency_overrides[get_caller] = lambda: caller
        return caller

    yield use
    app.dependency_overrides.clear()
