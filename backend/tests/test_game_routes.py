from app.core.security import create_token
from app.models.user import User


def make_user(db):
    user = User(email="gamer@test.com", name="게이머", google_id="g_game_123")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def auth_header(user):
    token = create_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


GAME_PAYLOAD = {
    "world_description": "중세 판타지 세계",
    "character_name":    "아리아",
    "character_class":   "마법사",
    "character_background": "고아 출신 마법사",
    "hardcore_mode":     False,
}


def test_create_game(client, db):
    user = make_user(db)
    res  = client.post("/api/v1/games", json=GAME_PAYLOAD, headers=auth_header(user))
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert data["status"] == "active"
    assert data["hardcore_mode"] is False


def test_list_games_empty(client, db):
    user = make_user(db)
    res  = client.get("/api/v1/games", headers=auth_header(user))
    assert res.status_code == 200
    assert res.json() == []


def test_list_games_after_create(client, db):
    user = make_user(db)
    client.post("/api/v1/games", json=GAME_PAYLOAD, headers=auth_header(user))
    res = client.get("/api/v1/games", headers=auth_header(user))
    assert len(res.json()) == 1


def test_free_user_cannot_create_second_game(client, db):
    user = make_user(db)
    client.post("/api/v1/games", json=GAME_PAYLOAD, headers=auth_header(user))
    res  = client.post("/api/v1/games", json=GAME_PAYLOAD, headers=auth_header(user))
    assert res.status_code == 403


def test_get_game(client, db):
    user = make_user(db)
    create_res = client.post("/api/v1/games", json=GAME_PAYLOAD, headers=auth_header(user))
    game_id = create_res.json()["id"]
    res = client.get(f"/api/v1/games/{game_id}", headers=auth_header(user))
    assert res.status_code == 200
    assert res.json()["character"]["name"] == "아리아"


def test_get_game_not_found(client, db):
    user = make_user(db)
    import uuid
    res  = client.get(f"/api/v1/games/{uuid.uuid4()}", headers=auth_header(user))
    assert res.status_code == 404


def test_delete_game(client, db):
    user = make_user(db)
    create_res = client.post("/api/v1/games", json=GAME_PAYLOAD, headers=auth_header(user))
    game_id = create_res.json()["id"]
    res = client.delete(f"/api/v1/games/{game_id}", headers=auth_header(user))
    assert res.status_code == 204


def test_cannot_access_other_users_game(client, db):
    user1 = make_user(db)
    user2 = User(email="other@test.com", name="타인", google_id="g_other")
    db.add(user2)
    db.commit()
    db.refresh(user2)

    create_res = client.post("/api/v1/games", json=GAME_PAYLOAD, headers=auth_header(user1))
    game_id = create_res.json()["id"]
    res = client.get(f"/api/v1/games/{game_id}", headers=auth_header(user2))
    assert res.status_code == 404


from unittest.mock import patch, MagicMock


def test_create_game_has_opening(client, db):
    user = make_user(db)
    mock_msg = MagicMock()
    mock_msg.content = [MagicMock(text="어둠 속에서 당신의 모험이 시작됩니다...")]
    with patch("app.services.ai_gm.client.messages.create", return_value=mock_msg):
        res = client.post("/api/v1/games", json=GAME_PAYLOAD, headers=auth_header(user))
    assert res.status_code == 201
    data = res.json()
    assert "opening" in data
    assert len(data["opening"]) > 0


def test_complete_game(client, db):
    user = make_user(db)
    mock_msg = MagicMock()
    mock_msg.content = [MagicMock(text="오프닝 텍스트")]
    with patch("app.services.ai_gm.client.messages.create", return_value=mock_msg):
        create_res = client.post("/api/v1/games", json=GAME_PAYLOAD, headers=auth_header(user))
    game_id = create_res.json()["id"]
    res = client.post(f"/api/v1/games/{game_id}/complete", headers=auth_header(user))
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert "stats" in data
    assert "turn_count" in data["stats"]
    assert "play_time_minutes" in data["stats"]


def test_complete_game_twice_fails(client, db):
    user = make_user(db)
    mock_msg = MagicMock()
    mock_msg.content = [MagicMock(text="오프닝")]
    with patch("app.services.ai_gm.client.messages.create", return_value=mock_msg):
        create_res = client.post("/api/v1/games", json=GAME_PAYLOAD, headers=auth_header(user))
    game_id = create_res.json()["id"]
    client.post(f"/api/v1/games/{game_id}/complete", headers=auth_header(user))
    res = client.post(f"/api/v1/games/{game_id}/complete", headers=auth_header(user))
    assert res.status_code == 400
