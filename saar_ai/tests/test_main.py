"""CORS: auth is a Bearer header, not cookies, so credentialed CORS must stay off.

With allow_credentials=True and ALLOWED_ORIGINS=*, Starlette reflects any Origin back
in Access-Control-Allow-Origin, which combined with allow_credentials would let any
site read authenticated responses via a browser that happened to hold a session cookie.
SaarAI never uses cookies, so this should simply be off.
"""
from app.main import app


def test_cors_does_not_allow_credentials(client):
    r = client.get("/", headers={"Origin": "http://localhost:5173"})
    assert r.headers.get("access-control-allow-credentials") is None


def test_cors_middleware_is_configured_without_credentials():
    cors = next(m for m in app.user_middleware if m.cls.__name__ == "CORSMiddleware")
    assert cors.kwargs["allow_credentials"] is False
