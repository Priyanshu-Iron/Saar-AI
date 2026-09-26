import os

from cryptography.fernet import Fernet

os.environ["SAARAI_SKIP_DB_INIT"] = "1"
# Set before app import; load_dotenv never overrides existing variables.
os.environ["ADMIN_EMAIL"] = "admin@example.com"
os.environ["CREDENTIALS_ENCRYPTION_KEY"] = Fernet.generate_key().decode()

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import verify_api_key
from app.main import app


@pytest.fixture
def client():
    app.dependency_overrides[verify_api_key] = lambda: 1
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
