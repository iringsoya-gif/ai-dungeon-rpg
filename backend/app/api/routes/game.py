import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.game import Game
from app.models.history import History
from app.services.ai_gm import stream_action, client as ai_client, generate_opening, generate_summary
from app.services.context_manager import context_mgr, estimate_tokens
from app.services.state_manager import apply_state_changes, apply_death_penalty, apply_world_changes

router = APIRouter()


class CreateGameRequest(BaseModel):
    world_description: str
    character_name:    str
    character_class:   str
    character_background: str
    hardcore_mode:     bool = False


class ActionRequest(BaseModel):
    text: str


_INJECTION_PATTERNS = [
    "ignore previous", "ignore all", "disregard", "forget instructions",
    "system prompt", "new instructions", "pretend you are", "act as",
    "you are now", "override", "jailbreak", "DAN", "do anything now",
]


def _check_injection(text: str):
    lower = text.lower()
    for pattern in _INJECTION_PATTERNS:
        if pattern.lower() in lower:
            raise HTTPException(400, "유효하지 않은 입력입니다")


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
    # 판타지
    "전사":      {"strength": 16, "intelligence": 6,  "agility": 8,  "charisma": 8,  "hp": 120, "max_hp": 120, "mp": 40,  "max_mp": 40},
    "마법사":    {"strength": 6,  "intelligence": 16, "agility": 8,  "charisma": 10, "hp": 60,  "max_hp": 60,  "mp": 160, "max_mp": 160},
    "도적":      {"strength": 10, "intelligence": 10, "agility": 16, "charisma": 8,  "hp": 80,  "max_hp": 80,  "mp": 60,  "max_mp": 60},
    "성직자":    {"strength": 8,  "intelligence": 12, "agility": 8,  "charisma": 16, "hp": 90,  "max_hp": 90,  "mp": 120, "max_mp": 120},
    "궁수":      {"strength": 12, "intelligence": 8,  "agility": 14, "charisma": 10, "hp": 90,  "max_hp": 90,  "mp": 60,  "max_mp": 60},
    # SF
    "전투병":    {"strength": 16, "intelligence": 6,  "agility": 8,  "charisma": 8,  "hp": 120, "max_hp": 120, "mp": 40,  "max_mp": 40},
    "해커":      {"strength": 6,  "intelligence": 16, "agility": 10, "charisma": 8,  "hp": 60,  "max_hp": 60,  "mp": 160, "max_mp": 160},
    "의무관":    {"strength": 8,  "intelligence": 12, "agility": 8,  "charisma": 16, "hp": 90,  "max_hp": 90,  "mp": 120, "max_mp": 120},
    "정찰병":    {"strength": 10, "intelligence": 10, "agility": 16, "charisma": 8,  "hp": 80,  "max_hp": 80,  "mp": 60,  "max_mp": 60},
    "엔지니어":  {"strength": 10, "intelligence": 14, "agility": 10, "charisma": 10, "hp": 80,  "max_hp": 80,  "mp": 100, "max_mp": 100},
    # 공포
    "탐정":      {"strength": 8,  "intelligence": 16, "agility": 8,  "charisma": 12, "hp": 70,  "max_hp": 70,  "mp": 100, "max_mp": 100},
    "오컬티스트": {"strength": 6,  "intelligence": 14, "agility": 8,  "charisma": 16, "hp": 60,  "max_hp": 60,  "mp": 160, "max_mp": 160},
    "생존자":    {"strength": 14, "intelligence": 8,  "agility": 12, "charisma": 6,  "hp": 110, "max_hp": 110, "mp": 40,  "max_mp": 40},
    "의사":      {"strength": 8,  "intelligence": 14, "agility": 8,  "charisma": 12, "hp": 80,  "max_hp": 80,  "mp": 120, "max_mp": 120},
    "저널리스트": {"strength": 6,  "intelligence": 12, "agility": 10, "charisma": 16, "hp": 70,  "max_hp": 70,  "mp": 80,  "max_mp": 80},
    # 현대
    "군인":      {"strength": 16, "intelligence": 8,  "agility": 10, "charisma": 8,  "hp": 120, "max_hp": 120, "mp": 40,  "max_mp": 40},
    "형사":      {"strength": 10, "intelligence": 14, "agility": 8,  "charisma": 12, "hp": 80,  "max_hp": 80,  "mp": 80,  "max_mp": 80},
    "사이버해커": {"strength": 6,  "intelligence": 16, "agility": 10, "charisma": 8,  "hp": 60,  "max_hp": 60,  "mp": 160, "max_mp": 160},
    "특수요원":  {"strength": 12, "intelligence": 10, "agility": 14, "charisma": 8,  "hp": 100, "max_hp": 100, "mp": 60,  "max_mp": 60},
    "운동선수":  {"strength": 14, "intelligence": 8,  "agility": 16, "charisma": 6,  "hp": 100, "max_hp": 100, "mp": 40,  "max_mp": 40},
}
DEFAULT_STATS = {"strength": 10, "intelligence": 10, "agility": 10, "charisma": 10, "hp": 90, "max_hp": 90, "mp": 90, "max_mp": 90}


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
        "id":            str(game.id),
        "title":         game.title,
        "status":        game.status,
        "hardcore_mode": game.hardcore_mode,
        "turn_count":    game.turn_count,
        "snapshot_turn": game.snapshot_turn,
        "character":     json.loads(game.character_json),
        "world":         json.loads(game.world_json),
        "created_at":    game.created_at.isoformat(),
        "last_played":   game.last_played.isoformat(),
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
@limiter.limit("15/minute")
async def take_action(
    request: Request,
    game_id: str,
    req: ActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_injection(req.text)
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
            elif event_type == "error":
                yield f"data: {json.dumps({'error': payload})}\n\n"
                return
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
        try:
            character = apply_state_changes(character, state_changes)
        except Exception:
            pass  # 파싱 오류 시 원본 캐릭터 유지

        # 세계 상태 누적 (NPC·장소 메모리)
        try:
            world = json.loads(game.world_json)
            world = apply_world_changes(world, state_changes)
            game.world_json = json.dumps(world, ensure_ascii=False)
        except Exception:
            pass

        # 게임오버 처리
        if state_changes.get("game_over") and game.hardcore_mode:
            game.status = "dead"
        elif character["stats"]["hp"] == 0 and not game.hardcore_mode:
            try:
                character = apply_death_penalty(character)
            except Exception:
                pass

        game.character_json = json.dumps(character, ensure_ascii=False)

        # 10턴마다 스냅샷 저장
        if game.turn_count % 10 == 0:
            world_now = json.loads(game.world_json)
            game.snapshot_json = json.dumps({
                "character": character,
                "world": world_now,
            }, ensure_ascii=False)
            game.snapshot_turn = game.turn_count

        db.commit()

        # 컨텍스트 압축 (필요 시)
        all_histories = db.query(History).filter(History.game_id == game.id).all()
        await context_mgr.compress_if_needed(game, all_histories, db, ai_client)

        world_state = json.loads(game.world_json)
        yield f"data: {json.dumps({'done': True, 'state': state_changes, 'character': character, 'world': world_state, 'snapshot_turn': game.snapshot_turn, 'game_status': game.status})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/{game_id}/story")
def get_story(game_id: str, db: Session = Depends(get_db)):
    """인증 없이 접근 가능한 공개 모험 기록 (완료/사망 게임만)"""
    try:
        gid = uuid.UUID(game_id)
    except ValueError:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    game = db.query(Game).filter(Game.id == gid).first()
    if not game or game.status not in ("completed", "dead"):
        raise HTTPException(404, "공유할 수 없는 게임입니다")
    histories = db.query(History).filter(History.game_id == game.id).order_by(History.turn).all()
    return {**_game_to_dict(game), "histories": [_history_to_dict(h) for h in histories]}


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


@router.post("/{game_id}/summary")
async def summarize_game(
    game_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    game = _get_owned_game(game_id, current_user, db)
    histories = db.query(History).filter(History.game_id == game.id).order_by(History.turn).all()
    summary = await generate_summary(game, histories)
    game.summary = summary
    db.commit()
    return {"summary": summary}


@router.post("/{game_id}/rollback")
def rollback_game(
    game_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    game = _get_owned_game(game_id, current_user, db)
    if not game.snapshot_json or game.snapshot_turn is None:
        raise HTTPException(400, "저장된 스냅샷이 없습니다")

    snapshot = json.loads(game.snapshot_json)
    game.character_json = json.dumps(snapshot["character"], ensure_ascii=False)
    game.world_json     = json.dumps(snapshot["world"], ensure_ascii=False)
    game.turn_count     = game.snapshot_turn
    game.status         = "active"

    # 스냅샷 이후 히스토리 제거
    db.query(History).filter(
        History.game_id == game.id,
        History.turn > game.snapshot_turn,
    ).delete()
    game.snapshot_json = None
    game.snapshot_turn = None
    db.commit()

    histories = db.query(History).filter(History.game_id == game.id).order_by(History.turn).all()
    return {**_game_to_dict(game), "histories": [_history_to_dict(h) for h in histories]}
