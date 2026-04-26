import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.game import Game
from app.models.history import History
from app.services.ai_gm import stream_action, client as ai_client, generate_opening
from app.services.context_manager import context_mgr, estimate_tokens
from app.services.state_manager import apply_state_changes, apply_death_penalty

router = APIRouter()


class CreateGameRequest(BaseModel):
    world_description: str
    character_name:    str
    character_class:   str
    character_background: str
    hardcore_mode:     bool = False


class ActionRequest(BaseModel):
    text: str


def _check_game_limit(user: User, db: Session):
    if user.plan == "free":
        count = db.query(Game).filter(
            Game.user_id == user.id, Game.status == "active"
        ).count()
        if count >= 1:
            raise HTTPException(403, {"message": "무료 플랜은 활성 게임 1개만 가능합니다", "redirect": "/pricing"})


def _build_initial_world(description: str) -> dict:
    return {
        "name": "새 세계",
        "description": description,
        "rules": [],
        "locations": {},
        "npcs": {},
    }


CLASS_STATS = {
    "전사":  {"strength": 16, "intelligence": 6,  "agility": 10, "charisma": 8,  "hp": 120, "max_hp": 120, "mp": 40,  "max_mp": 40},
    "마법사": {"strength": 6,  "intelligence": 16, "agility": 8,  "charisma": 10, "hp": 60,  "max_hp": 60,  "mp": 160, "max_mp": 160},
    "도적":  {"strength": 10, "intelligence": 10, "agility": 16, "charisma": 8,  "hp": 80,  "max_hp": 80,  "mp": 60,  "max_mp": 60},
    "성직자": {"strength": 8,  "intelligence": 12, "agility": 8,  "charisma": 16, "hp": 90,  "max_hp": 90,  "mp": 120, "max_mp": 120},
    "궁수":  {"strength": 12, "intelligence": 8,  "agility": 14, "charisma": 10, "hp": 90,  "max_hp": 90,  "mp": 60,  "max_mp": 60},
}
DEFAULT_STATS = {"strength": 8, "intelligence": 8, "agility": 8, "charisma": 8, "hp": 80, "max_hp": 80, "mp": 100, "max_mp": 100}


def _build_initial_character(name: str, char_class: str, background: str) -> dict:
    stats = {**DEFAULT_STATS, **CLASS_STATS.get(char_class, {})}
    return {
        "name": name,
        "class": char_class,
        "background": background,
        "level": 1,
        "xp": 0,
        "xp_to_next": 100,
        "location": "출발 지점",
        "stats": {k: stats[k] for k in ("hp", "max_hp", "mp", "max_mp", "strength", "intelligence", "agility", "charisma")},
        "inventory": ["기본 무기", "포션 1개"],
        "skills": [],
        "quests": [],
        "status_effects": [],
        "in_battle": False,
    }


def _game_to_dict(game: Game) -> dict:
    return {
        "id":           str(game.id),
        "title":        game.title,
        "status":       game.status,
        "hardcore_mode": game.hardcore_mode,
        "turn_count":   game.turn_count,
        "character":    json.loads(game.character_json),
        "world":        json.loads(game.world_json),
        "created_at":   game.created_at.isoformat(),
        "last_played":  game.last_played.isoformat(),
    }


def _history_to_dict(h: History) -> dict:
    return {
        "id":      str(h.id),
        "turn":    h.turn,
        "role":    h.role,
        "content": h.content,
    }


def _get_owned_game(game_id: str, user: User, db: Session) -> Game:
    try:
        gid = uuid.UUID(game_id)
    except ValueError:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    game = db.query(Game).filter(Game.id == gid, Game.user_id == user.id).first()
    if not game:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    return game


@router.post("", status_code=201)
def create_game(
    req: CreateGameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_game_limit(current_user, db)
    world     = _build_initial_world(req.world_description)
    character = _build_initial_character(req.character_name, req.character_class, req.character_background)
    game = Game(
        user_id=current_user.id,
        title=f"{req.character_name}의 모험",
        world_json=json.dumps(world, ensure_ascii=False),
        character_json=json.dumps(character, ensure_ascii=False),
        hardcore_mode=req.hardcore_mode,
    )
    db.add(game)
    db.commit()
    db.refresh(game)

    opening_text = generate_opening(
        req.world_description, req.character_name, req.character_class, req.character_background
    )
    db.add(History(
        game_id=game.id,
        turn=0,
        role="gm",
        content=opening_text,
        token_count=estimate_tokens(opening_text),
    ))
    db.commit()

    result = _game_to_dict(game)
    result["opening"] = opening_text
    return result


@router.get("")
def list_games(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    games = db.query(Game).filter(Game.user_id == current_user.id).all()
    return [_game_to_dict(g) for g in games]


@router.get("/{game_id}")
def get_game(
    game_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    game = _get_owned_game(game_id, current_user, db)
    histories = db.query(History).filter(History.game_id == game.id).order_by(History.turn).all()
    return {**_game_to_dict(game), "histories": [_history_to_dict(h) for h in histories]}


@router.delete("/{game_id}", status_code=204)
def delete_game(
    game_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    game = _get_owned_game(game_id, current_user, db)
    db.delete(game)
    db.commit()


@router.post("/{game_id}/action")
async def take_action(
    game_id: str,
    req: ActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    game = _get_owned_game(game_id, current_user, db)
    if game.status != "active":
        raise HTTPException(400, "이미 종료된 게임입니다")

    histories = db.query(History).filter(
        History.game_id == game.id
    ).order_by(History.turn).all()

    async def generate():
        full_response = ""
        state_changes = {}
        token_count   = 0

        async for event_type, payload in stream_action(game, histories, req.text):
            if event_type == "text":
                full_response += payload
                yield f"data: {json.dumps({'text': payload})}\n\n"
            elif event_type == "done":
                full_response = payload["full_response"]
                state_changes = payload["state_changes"]
                token_count   = payload["token_count"]

        # 플레이어 입력 저장
        player_turn = game.turn_count
        db.add(History(
            game_id=game.id,
            turn=player_turn,
            role="player",
            content=req.text,
            token_count=estimate_tokens(req.text),
        ))
        game.turn_count += 1

        # GM 응답 저장
        db.add(History(
            game_id=game.id,
            turn=game.turn_count,
            role="gm",
            content=full_response,
            state_diff=json.dumps(state_changes),
            token_count=token_count,
        ))
        game.turn_count += 1
        game.last_played = datetime.utcnow()

        # 캐릭터 상태 업데이트
        character = json.loads(game.character_json)
        character = apply_state_changes(character, state_changes)

        # 게임오버 처리
        if state_changes.get("game_over") and game.hardcore_mode:
            game.status = "dead"
        elif character["stats"]["hp"] == 0 and not game.hardcore_mode:
            character = apply_death_penalty(character)

        game.character_json = json.dumps(character, ensure_ascii=False)
        db.commit()

        # 컨텍스트 압축 (필요 시)
        all_histories = db.query(History).filter(History.game_id == game.id).all()
        await context_mgr.compress_if_needed(game, all_histories, db, ai_client)

        yield f"data: {json.dumps({'done': True, 'state': state_changes, 'character': character, 'game_status': game.status})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/{game_id}/complete")
def complete_game(
    game_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    game = _get_owned_game(game_id, current_user, db)
    if game.status == "completed":
        raise HTTPException(400, "이미 완료된 게임입니다")

    game.status = "completed"
    play_minutes = int((datetime.utcnow() - game.created_at).total_seconds() / 60)
    character = json.loads(game.character_json)

    stats = {
        "turn_count": game.turn_count,
        "play_time_minutes": play_minutes,
        "final_level": character.get("level", 1),
        "final_hp": character.get("stats", {}).get("hp", 0),
        "quests_completed": len(character.get("quests", [])),
        "inventory_count": len(character.get("inventory", [])),
    }

    db.commit()
    return {**_game_to_dict(game), "stats": stats}
