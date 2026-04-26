from app.core.security import create_token
from app.models.user import User
import uuid


def make_user(db):
    user = User(
        email="test@example.com",
        name="테스터",
        google_id="google_123",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_get_me_without_token(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_get_me_with_invalid_token(client):
    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.token.here"},
    )
    assert res.status_code == 401


def test_get_me_with_valid_token(client, db):
    user = make_user(db)
    token = create_token({"sub": str(user.id)})
    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "test@example.com"
    assert data["plan"] == "free"


def test_login_redirects_to_google(client):
    res = client.get("/api/v1/auth/login", follow_redirects=False)
    assert res.status_code in (302, 307)
    assert "accounts.google.com" in res.headers["location"]
