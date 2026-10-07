from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app import security
from app.models import User


def signup(client, **overrides):
    body = {"name": "Ada Lovelace", "email": "ada@example.com", "password": "password123", **overrides}
    return client.post("/api/auth/signup", json=body)


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def test_signup_returns_token_and_user_and_hashes_password(anon_client, session_factory):
    r = signup(anon_client, email="  Ada@Example.COM ", name="  Ada Lovelace ")
    assert r.status_code == 201
    body = r.json()
    assert body["token_type"] == "bearer" and body["access_token"]
    assert body["user"]["email"] == "ada@example.com"
    assert body["user"]["name"] == "Ada Lovelace"
    assert set(body["user"]) == {"id", "name", "email", "created_at"}

    with session_factory() as db:
        stored = db.query(User).one()
        assert stored.password_hash != "password123"
        assert stored.password_hash.startswith("$argon2id$")


def test_signup_duplicate_email_is_case_insensitive(anon_client):
    assert signup(anon_client).status_code == 201
    r = signup(anon_client, email="ADA@example.com")
    assert r.status_code == 409
    assert r.json()["detail"] == "An account with this email already exists"


@pytest.mark.parametrize(
    "overrides, field",
    [
        ({"email": "not-an-email"}, "email"),
        ({"email": ""}, "email"),
        ({"password": "short"}, "password"),
        ({"password": "x" * 129}, "password"),
        ({"name": "   "}, "name"),
        ({"name": "x" * 101}, "name"),
    ],
)
def test_signup_validation(anon_client, overrides, field):
    r = signup(anon_client, **overrides)
    assert r.status_code == 422
    assert field in [e["field"] for e in r.json()["errors"]]


def test_login_and_me(anon_client):
    signup(anon_client)
    r = anon_client.post("/api/auth/login", json={"email": " ADA@example.com", "password": "password123"})
    assert r.status_code == 200
    me = anon_client.get("/api/auth/me", headers=bearer(r.json()["access_token"]))
    assert me.status_code == 200
    assert me.json()["name"] == "Ada Lovelace"


@pytest.mark.parametrize(
    "email, password",
    [("ada@example.com", "wrong-password"), ("nobody@example.com", "password123")],
)
def test_login_invalid_credentials_share_one_message(anon_client, email, password):
    signup(anon_client)
    r = anon_client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid email or password"


@pytest.mark.parametrize(
    "headers",
    [{}, bearer("not-a-token"), {"Authorization": "Basic YWRhOnBhc3N3b3Jk"}],
)
def test_protected_routes_reject_missing_or_bad_tokens(anon_client, headers):
    for r in (
        anon_client.get("/api/auth/me", headers=headers),
        anon_client.get("/api/tasks", headers=headers),
        anon_client.post("/api/tasks", json={"title": "Hello", "priority": "Low"}, headers=headers),
        anon_client.delete("/api/tasks/1", headers=headers),
    ):
        assert r.status_code == 401
        assert r.headers["www-authenticate"] == "Bearer"


def test_expired_and_forged_tokens_rejected(anon_client):
    user_id = signup(anon_client).json()["user"]["id"]
    now = datetime.now(timezone.utc)
    expired = jwt.encode(
        {"sub": str(user_id), "exp": now - timedelta(minutes=1)}, security.SECRET_KEY, algorithm=security.ALGORITHM
    )
    forged = jwt.encode(
        {"sub": str(user_id), "exp": now + timedelta(hours=1)}, "a-different-secret-key-of-32-bytes!!", algorithm="HS256"
    )
    for token in (expired, forged):
        assert anon_client.get("/api/auth/me", headers=bearer(token)).status_code == 401


def test_users_only_access_their_own_tasks(new_user_client):
    alice = new_user_client(email="alice@example.com", name="Alice")
    bob = new_user_client(email="bob@example.com", name="Bob")
    task = alice.post("/api/tasks", json={"title": "Alice's task", "priority": "High"}).json()
    url = f"/api/tasks/{task['id']}"

    assert bob.get("/api/tasks").json() == []
    assert bob.get(url).status_code == 404
    assert bob.put(url, json={"title": "Hijacked", "priority": "Low"}).status_code == 404
    assert bob.patch(f"{url}/complete").status_code == 404
    assert bob.delete(url).status_code == 404

    mine = alice.get("/api/tasks").json()
    assert [(t["title"], t["status"]) for t in mine] == [("Alice's task", "Pending")]


def test_timestamps_are_returned_in_utc(client):
    created = client.post("/api/tasks", json={"title": "Check time", "priority": "Low"}).json()
    assert created["created_at"].endswith(("Z", "+00:00"))
