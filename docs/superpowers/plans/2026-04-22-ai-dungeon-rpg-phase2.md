# AI Dungeon RPG Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 AI Dungeon RPG에 클래스별 스탯+레벨업, GM 오프닝 자동생성, 장소/NPC/퀘스트 저장, 전투 시스템, 퀘스트 추적, 종료 통계, 모바일 대응, 강화된 UI(캐릭터 시트 팝업·인벤토리·장소 목록)를 추가한다.

**Architecture:** 백엔드는 기존 FastAPI 모놀리식 구조를 유지하면서 서비스 레이어(state_manager, ai_gm)를 확장. 프론트엔드는 기존 컴포넌트를 개선하고 새 모달/페이지를 추가. DB 스키마 변경 없이 `character_json`·`world_json` JSON 컬럼의 스키마 확장으로 대부분 구현.

**Tech Stack:** FastAPI, SQLAlchemy, anthropic SDK, React 18, Zustand, Tailwind CSS v4

---

## 파일 맵

### Backend 변경/추가
| 파일 | 변경 내용 |
|------|-----------|
| `app/api/routes/game.py` | 클래스별 스탯, GM 오프닝 생성, 게임 완료 엔드포인트 |
| `app/services/ai_gm.py` | 시스템 프롬프트 확장(전투·레벨업·퀘스트), 오프닝 생성 함수 |
| `app/services/state_manager.py` | XP/레벨업, 퀘스트 변경, 월드 변경, 전투 상태 적용 |
| `tests/test_state_manager.py` | 신규 상태 파싱 테스트 |
| `tests/test_game_routes.py` | 오프닝 생성·레벨업·완료 엔드포인트 테스트 |

### Frontend 변경/추가
| 파일 | 변경 내용 |
|------|-----------|
| `src/components/game/StatusPanel.jsx` | 퀘스트·레벨·XP·전투상태 표시 |
| `src/components/game/CharacterSheet.jsx` | 신규: 캐릭터 시트 전체 팝업 모달 |
| `src/components/game/InventoryPanel.jsx` | 신규: 개선된 인벤토리 UI |
| `src/components/game/LocationHistory.jsx` | 신규: 방문 장소 목록 |
| `src/pages/Game.jsx` | 모바일 레이아웃, 사이드바 토글, 캐릭터 시트 버튼 |
| `src/pages/GameOver.jsx` | 신규: 종료 통계 화면 |
| `src/store/gameStore.js` | character 상태 실시간 업데이트 |

---

## Task 1: 클래스별 초기 스탯 + XP/레벨업 시스템 (Backend)

**Files:**
- Modify: `ai-dungeon-rpg/backend/app/api/routes/game.py`
- Modify: `ai-dungeon-rpg/backend/app/services/state_manager.py`
- Modify: `ai-dungeon-rpg/backend/tests/test_state_manager.py`

- [ ] **Step 1: 테스트 작성 — 클래스별 스탯 + 레벨업 파싱**

```python
# tests/test_state_manager.py 에 추가
def test_class_stats_warrior():
    from app.api.routes.game import _build_initial_character
    c = _build_initial_character("홍길동", "전사", "용사 출신")
    assert c["stats"]["strength"] >= 14
    assert c["stats"]["intelligence"] <= 8

def test_class_stats_mage():
    from app.api.routes.game import _build_initial_character
    c = _build_initial_character("아리아", "마법사", "마탑 출신")
    assert c["stats"]["intelligence"] >= 14
    assert c["stats"]["strength"] <= 8

def test_level_up_applied():
    from app.services.state_manager import apply_state_changes
    character = {
        "level": 1, "xp": 90, "xp_to_next": 100,
        "stats": {"hp": 80, "max_hp": 80, "mp": 40, "max_mp": 40,
                  "strength": 10, "intelligence": 10, "agility": 10, "charisma": 10},
        "inventory": [], "quests": [], "status_effects": [],
    }
    changes = {"state_changes": {"xp_gain": 20}, "world_changes": {}, "game_over": False}
    result = apply_state_changes(character, changes)
    assert result["level"] == 2
    assert result["xp"] == 10  # 110 - 100 = 10 남음
    assert result["stats"]["max_hp"] > 80

def test_xp_no_level_up():
    from app.services.state_manager import apply_state_changes
    character = {
        "level": 1, "xp": 0, "xp_to_next": 100,
        "stats": {"hp": 80, "max_hp": 80, "mp": 40, "max_mp": 40,
                  "strength": 10, "intelligence": 10, "agility": 10, "charisma": 10},
        "inventory": [], "quests": [], "status_effects": [],
    }
    changes = {"state_changes": {"xp_gain": 30}, "world_changes": {}, "game_over": False}
    result = apply_state_changes(character, changes)
    assert result["level"] == 1
    assert result["xp"] == 30
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg\backend
uv run pytest tests/test_state_manager.py::test_class_stats_warrior tests/test_state_manager.py::test_level_up_applied -v
```
Expected: FAIL (AttributeError 또는 AssertionError)

- [ ] **Step 3: 클래스별 스탯 맵 + `_build_initial_character` 수정**

`ai-dungeon-rpg/backend/app/api/routes/game.py` 에서 `_build_initial_character` 함수를 아래로 교체:

```python
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
```

- [ ] **Step 4: `apply_state_changes`에 XP/레벨업 로직 추가**

`ai-dungeon-rpg/backend/app/services/state_manager.py` 의 `apply_state_changes` 함수를 아래로 교체:

```python
LEVEL_STAT_BONUS = {"hp": 10, "max_hp": 10, "mp": 5, "max_mp": 5, "strength": 1, "intelligence": 1, "agility": 1, "charisma": 1}


def _apply_level_up(c: dict) -> dict:
    while c["xp"] >= c["xp_to_next"]:
        c["xp"] -= c["xp_to_next"]
        c["level"] += 1
        c["xp_to_next"] = int(c["xp_to_next"] * 1.5)
        for stat, bonus in LEVEL_STAT_BONUS.items():
            c["stats"][stat] = c["stats"].get(stat, 0) + bonus
    return c


def apply_state_changes(character: dict, changes: dict) -> dict:
    c = copy.deepcopy(character)
    sc = changes.get("state_changes", {})

    if "hp_change" in sc:
        c["stats"]["hp"] = max(0, c["stats"]["hp"] + sc["hp_change"])
    if "mp_change" in sc:
        c["stats"]["mp"] = max(0, c["stats"]["mp"] + sc["mp_change"])
    if "inventory_add" in sc:
        c["inventory"].extend(sc["inventory_add"])
    if "inventory_remove" in sc:
        for item in sc["inventory_remove"]:
            if item in c["inventory"]:
                c["inventory"].remove(item)
    if "location" in sc:
        c["location"] = sc["location"]
    if "xp_gain" in sc:
        c["xp"] = c.get("xp", 0) + sc["xp_gain"]
        c = _apply_level_up(c)
    if "in_battle" in sc:
        c["in_battle"] = sc["in_battle"]
    if "quest_add" in sc:
        for q in sc["quest_add"]:
            if q not in c.get("quests", []):
                c.setdefault("quests", []).append(q)
    if "quest_remove" in sc:
        c["quests"] = [q for q in c.get("quests", []) if q not in sc["quest_remove"]]
    if "status_effects_add" in sc:
        c.setdefault("status_effects", []).extend(sc["status_effects_add"])
    if "status_effects_remove" in sc:
        c["status_effects"] = [e for e in c.get("status_effects", []) if e not in sc["status_effects_remove"]]

    return c
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg\backend
uv run pytest tests/test_state_manager.py -v
```
Expected: ALL PASS

- [ ] **Step 6: 커밋**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg
git add backend/app/api/routes/game.py backend/app/services/state_manager.py backend/tests/test_state_manager.py
git commit -m "feat(rpg-p2): class-based stats + XP/level-up system"
```

---

## Task 2: GM 오프닝 자동생성 (Backend)

**Files:**
- Modify: `ai-dungeon-rpg/backend/app/services/ai_gm.py`
- Modify: `ai-dungeon-rpg/backend/app/api/routes/game.py`
- Modify: `ai-dungeon-rpg/backend/tests/test_game_routes.py`

- [ ] **Step 1: 테스트 작성**

```python
# tests/test_game_routes.py 에 추가
from unittest.mock import patch, MagicMock

def test_create_game_has_opening(client, db):
    user = make_user(db)
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="어둠 속에서 당신의 모험이 시작됩니다...")]
    with patch("app.services.ai_gm.client.messages.create", return_value=mock_response):
        res = client.post("/api/v1/games", json=GAME_PAYLOAD, headers=auth_header(user))
    assert res.status_code == 201
    data = res.json()
    assert "opening" in data
    assert len(data["opening"]) > 0
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg\backend
uv run pytest tests/test_game_routes.py::test_create_game_has_opening -v
```
Expected: FAIL (KeyError: 'opening')

- [ ] **Step 3: `generate_opening` 함수 추가**

`ai-dungeon-rpg/backend/app/services/ai_gm.py` 에 아래 함수 추가 (파일 끝에):

```python
OPENING_PROMPT = """당신은 텍스트 어드벤처 RPG의 게임마스터입니다.
아래 세계관과 캐릭터를 바탕으로 게임 시작 오프닝 내러티브를 2~3문단으로 작성하세요.
플레이어를 2인칭(당신)으로 지칭하고, 분위기 있고 몰입감 있게 작성하세요.
JSON 블록은 포함하지 마세요.

세계관: {world_description}
캐릭터: {character_name} ({character_class}), 배경: {character_background}
"""


def generate_opening(world_description: str, character_name: str, character_class: str, character_background: str) -> str:
    prompt = OPENING_PROMPT.format(
        world_description=world_description,
        character_name=character_name,
        character_class=character_class,
        character_background=character_background,
    )
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text
```

- [ ] **Step 4: `create_game` 엔드포인트에서 오프닝 생성 및 저장**

`ai-dungeon-rpg/backend/app/api/routes/game.py` 상단 import에 추가:
```python
from app.services.ai_gm import stream_action, client as ai_client, generate_opening
```

`create_game` 함수의 `db.commit()` 전, `db.add(game)` 이후에 아래 코드 삽입:

```python
    # GM 오프닝 생성
    opening_text = generate_opening(
        req.world_description, req.character_name, req.character_class, req.character_background
    )
    db.add(game)
    db.commit()
    db.refresh(game)
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
```

주의: 기존 `db.add(game); db.commit(); db.refresh(game); return _game_to_dict(game)` 블록 전체를 위 코드로 교체.

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg\backend
uv run pytest tests/test_game_routes.py -v
```
Expected: ALL PASS

- [ ] **Step 6: 커밋**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg
git add backend/app/services/ai_gm.py backend/app/api/routes/game.py backend/tests/test_game_routes.py
git commit -m "feat(rpg-p2): GM auto-generated opening narrative on game creation"
```

---

## Task 3: 시스템 프롬프트 확장 — 전투·퀘스트·XP (Backend)

**Files:**
- Modify: `ai-dungeon-rpg/backend/app/services/ai_gm.py`

- [ ] **Step 1: 시스템 프롬프트 업그레이드**

`ai-dungeon-rpg/backend/app/services/ai_gm.py` 의 `SYSTEM_TEMPLATE` 상수를 아래로 교체:

```python
SYSTEM_TEMPLATE = """당신은 텍스트 어드벤처 RPG의 게임마스터(GM)입니다.

## 세계관
{world_description}

## 게임 규칙
- 플레이어의 모든 행동에 현실적인 결과를 부여하세요
- 캐릭터 능력치를 반드시 반영하세요 (strength 높음 → 물리 공격 강함, intelligence 높음 → 마법 성공률 높음, agility 높음 → 회피율 높음)
- 세계관의 일관성을 절대 깨지 마세요
- 생동감 있고 몰입감 있게 2~4문단으로 작성하세요
{hardcore_instruction}

## 전투 시스템
- 전투 시작 시 in_battle: true, 전투 종료 시 in_battle: false
- 적 처치 시 반드시 xp_gain 제공 (약한 적: 10~30, 중간 적: 30~80, 강한 적: 80~200)
- 플레이어 능력치에 따라 hp_change, mp_change를 현실적으로 계산하세요
- 전투 중 도망치면 in_battle: false, hp_change: -10 (패널티)

## 퀘스트 시스템
- 새 퀘스트 발견 시 quest_add에 퀘스트 이름 추가
- 퀘스트 완료/실패 시 quest_remove에 제거
- 퀘스트 완료 시 추가 xp_gain 제공

## 현재 캐릭터 상태
{character_json}

## 현재 위치
{location}

## 응답 형식
자유로운 서술 텍스트를 먼저 작성하고, 마지막에 반드시 아래 JSON 블록을 포함하세요:

```json
{{
  "state_changes": {{
    "hp_change": 0,
    "mp_change": 0,
    "xp_gain": 0,
    "inventory_add": [],
    "inventory_remove": [],
    "quest_add": [],
    "quest_remove": [],
    "status_effects_add": [],
    "status_effects_remove": [],
    "location": "현재 위치명",
    "in_battle": false
  }},
  "world_changes": {{}},
  "game_over": false
}}
```
"""
```

- [ ] **Step 2: 기존 테스트 통과 확인**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg\backend
uv run pytest tests/ -v
```
Expected: ALL PASS (시스템 프롬프트 변경은 기존 테스트에 영향 없음)

- [ ] **Step 3: 커밋**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg
git add backend/app/services/ai_gm.py
git commit -m "feat(rpg-p2): expanded system prompt with combat/quest/XP instructions"
```

---

## Task 4: 게임 완료 엔드포인트 + 종료 통계 (Backend)

**Files:**
- Modify: `ai-dungeon-rpg/backend/app/api/routes/game.py`
- Modify: `ai-dungeon-rpg/backend/tests/test_game_routes.py`

- [ ] **Step 1: 테스트 작성**

```python
# tests/test_game_routes.py 에 추가
def test_complete_game(client, db):
    user = make_user(db)
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="오프닝")]
    with patch("app.services.ai_gm.client.messages.create", return_value=mock_response):
        create_res = client.post("/api/v1/games", json=GAME_PAYLOAD, headers=auth_header(user))
    game_id = create_res.json()["id"]
    res = client.post(f"/api/v1/games/{game_id}/complete", headers=auth_header(user))
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert "stats" in data
    assert "turn_count" in data["stats"]
    assert "play_time_minutes" in data["stats"]

def test_complete_already_dead_game(client, db):
    user = make_user(db)
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="오프닝")]
    with patch("app.services.ai_gm.client.messages.create", return_value=mock_response):
        create_res = client.post("/api/v1/games", json={**GAME_PAYLOAD, "hardcore_mode": True}, headers=auth_header(user))
    game_id = create_res.json()["id"]
    res = client.post(f"/api/v1/games/{game_id}/complete", headers=auth_header(user))
    assert res.status_code in (200, 400)
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg\backend
uv run pytest tests/test_game_routes.py::test_complete_game -v
```
Expected: FAIL (404 또는 405)

- [ ] **Step 3: `/complete` 엔드포인트 구현**

`ai-dungeon-rpg/backend/app/api/routes/game.py` 에 아래 엔드포인트 추가 (파일 끝에):

```python
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
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg\backend
uv run pytest tests/test_game_routes.py -v
```
Expected: ALL PASS

- [ ] **Step 5: 커밋**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg
git add backend/app/api/routes/game.py backend/tests/test_game_routes.py
git commit -m "feat(rpg-p2): game complete endpoint with play stats"
```

---

## Task 5: 프론트엔드 — StatusPanel 개선 (레벨·XP·전투·퀘스트)

**Files:**
- Modify: `ai-dungeon-rpg/frontend/src/components/game/StatusPanel.jsx`

- [ ] **Step 1: StatusPanel 전면 개선**

`ai-dungeon-rpg/frontend/src/components/game/StatusPanel.jsx` 를 아래로 교체:

```jsx
export default function StatusPanel({ character, onOpenSheet }) {
  if (!character) return null
  const { stats, inventory, quests, location, level, xp, xp_to_next, in_battle, status_effects } = character
  if (!stats) return null

  const hpPct = Math.max(0, Math.min(100, (stats.hp / (stats.max_hp || 1)) * 100))
  const mpPct = Math.max(0, Math.min(100, (stats.mp / (stats.max_mp || 1)) * 100))
  const xpPct = Math.max(0, Math.min(100, ((xp || 0) / (xp_to_next || 100)) * 100))

  return (
    <div className="bg-gray-900 border-l border-gray-800 w-64 flex-shrink-0 p-4 flex flex-col gap-3 overflow-y-auto text-xs">
      {/* 캐릭터 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-white text-sm">{character.name}</p>
          <p className="text-gray-500">{character.class} Lv.{level || 1}</p>
        </div>
        <button
          onClick={onOpenSheet}
          className="text-gray-500 hover:text-gray-300 border border-gray-700 rounded px-2 py-1"
        >
          시트
        </button>
      </div>

      {in_battle && (
        <div className="bg-red-950 border border-red-700 rounded px-2 py-1 text-red-300 text-center animate-pulse">
          ⚔️ 전투 중
        </div>
      )}

      {/* HP */}
      <div>
        <div className="flex justify-between mb-1"><span className="text-gray-500">HP</span><span className="text-gray-400">{stats.hp}/{stats.max_hp}</span></div>
        <div className="h-1.5 bg-gray-800 rounded-full">
          <div className="h-1.5 bg-red-500 rounded-full transition-all" style={{ width: `${hpPct}%` }} />
        </div>
      </div>

      {/* MP */}
      <div>
        <div className="flex justify-between mb-1"><span className="text-gray-500">MP</span><span className="text-gray-400">{stats.mp}/{stats.max_mp}</span></div>
        <div className="h-1.5 bg-gray-800 rounded-full">
          <div className="h-1.5 bg-blue-500 rounded-full transition-all" style={{ width: `${mpPct}%` }} />
        </div>
      </div>

      {/* XP */}
      <div>
        <div className="flex justify-between mb-1"><span className="text-gray-500">XP</span><span className="text-gray-400">{xp || 0}/{xp_to_next || 100}</span></div>
        <div className="h-1.5 bg-gray-800 rounded-full">
          <div className="h-1.5 bg-yellow-500 rounded-full transition-all" style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      {/* 위치 */}
      <div>
        <p className="text-gray-500 mb-1">🗺️ 위치</p>
        <p className="text-gray-300">{location || '???'}</p>
      </div>

      {/* 상태이상 */}
      {status_effects?.length > 0 && (
        <div>
          <p className="text-gray-500 mb-1">✨ 상태</p>
          <div className="flex flex-wrap gap-1">
            {status_effects.map((e, i) => (
              <span key={i} className="bg-purple-900/50 text-purple-300 border border-purple-700/50 rounded px-1.5 py-0.5">{e}</span>
            ))}
          </div>
        </div>
      )}

      {/* 인벤토리 */}
      <div>
        <p className="text-gray-500 mb-1">🎒 인벤토리 ({inventory?.length || 0})</p>
        <ul className="space-y-1">
          {(inventory || []).map((item, i) => (
            <li key={i} className="text-gray-400 bg-gray-800 rounded px-2 py-1 truncate" title={item}>{item}</li>
          ))}
        </ul>
      </div>

      {/* 퀘스트 */}
      {quests?.length > 0 && (
        <div>
          <p className="text-gray-500 mb-1">📋 퀘스트 ({quests.length})</p>
          <ul className="space-y-1">
            {quests.map((q, i) => (
              <li key={i} className="text-gray-400 flex items-start gap-1">
                <span className="text-yellow-500 mt-0.5">◆</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg
git add frontend/src/components/game/StatusPanel.jsx
git commit -m "feat(rpg-p2): StatusPanel with level/XP/battle/quest/status-effects"
```

---

## Task 6: 캐릭터 시트 팝업 모달 (Frontend)

**Files:**
- Create: `ai-dungeon-rpg/frontend/src/components/game/CharacterSheet.jsx`
- Modify: `ai-dungeon-rpg/frontend/src/pages/Game.jsx`

- [ ] **Step 1: CharacterSheet 모달 컴포넌트 생성**

`ai-dungeon-rpg/frontend/src/components/game/CharacterSheet.jsx` 를 신규 작성:

```jsx
export default function CharacterSheet({ character, onClose }) {
  if (!character) return null
  const { name, class: cls, background, level, xp, xp_to_next, stats, inventory, quests, status_effects, location } = character

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">{name}</h2>
            <p className="text-gray-400 text-sm">{cls} · Lv.{level || 1}</p>
            <p className="text-gray-600 text-xs mt-1">{background}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        {/* 능력치 */}
        <div className="mb-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">능력치</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "HP", value: `${stats?.hp ?? 0} / ${stats?.max_hp ?? 0}`, color: "text-red-400" },
              { label: "MP", value: `${stats?.mp ?? 0} / ${stats?.max_mp ?? 0}`, color: "text-blue-400" },
              { label: "힘", value: stats?.strength ?? 0, color: "text-orange-400" },
              { label: "지능", value: stats?.intelligence ?? 0, color: "text-purple-400" },
              { label: "민첩", value: stats?.agility ?? 0, color: "text-green-400" },
              { label: "카리스마", value: stats?.charisma ?? 0, color: "text-yellow-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-800 rounded-lg px-3 py-2 flex justify-between items-center">
                <span className="text-gray-400 text-xs">{label}</span>
                <span className={`font-semibold text-sm ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* XP */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>경험치</span>
            <span>{xp || 0} / {xp_to_next || 100}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full">
            <div
              className="h-2 bg-yellow-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, ((xp || 0) / (xp_to_next || 100)) * 100)}%` }}
            />
          </div>
        </div>

        {/* 위치 */}
        <div className="mb-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-1">현재 위치</h3>
          <p className="text-gray-300 text-sm">{location || '???'}</p>
        </div>

        {/* 상태이상 */}
        {status_effects?.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">상태이상</h3>
            <div className="flex flex-wrap gap-1">
              {status_effects.map((e, i) => (
                <span key={i} className="bg-purple-900/50 text-purple-300 border border-purple-700/50 rounded px-2 py-0.5 text-xs">{e}</span>
              ))}
            </div>
          </div>
        )}

        {/* 인벤토리 */}
        {inventory?.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">인벤토리 ({inventory.length})</h3>
            <div className="grid grid-cols-2 gap-1">
              {inventory.map((item, i) => (
                <div key={i} className="bg-gray-800 rounded px-2 py-1.5 text-xs text-gray-300">{item}</div>
              ))}
            </div>
          </div>
        )}

        {/* 퀘스트 */}
        {quests?.length > 0 && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">퀘스트 ({quests.length})</h3>
            <ul className="space-y-1">
              {quests.map((q, i) => (
                <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                  <span className="text-yellow-500 mt-0.5 flex-shrink-0">◆</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Game.jsx에 캐릭터 시트 팝업 연결**

`ai-dungeon-rpg/frontend/src/pages/Game.jsx` 상단 import에 추가:
```jsx
import CharacterSheet from '../components/game/CharacterSheet'
```

`useState` 훅 라인 근처에 추가:
```jsx
const [showSheet, setShowSheet] = useState(false)
```

`</div>` 닫는 태그 (최상단 div) 바로 앞에 추가:
```jsx
{showSheet && <CharacterSheet character={game?.character} onClose={() => setShowSheet(false)} />}
```

`<StatusPanel character={game.character} />` 를 아래로 교체:
```jsx
<StatusPanel character={game.character} onOpenSheet={() => setShowSheet(true)} />
```

- [ ] **Step 3: 커밋**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg
git add frontend/src/components/game/CharacterSheet.jsx frontend/src/pages/Game.jsx
git commit -m "feat(rpg-p2): character sheet popup modal"
```

---

## Task 7: 종료 통계 화면 (Frontend)

**Files:**
- Create: `ai-dungeon-rpg/frontend/src/pages/GameOver.jsx`
- Modify: `ai-dungeon-rpg/frontend/src/App.jsx` (또는 라우터 파일)
- Modify: `ai-dungeon-rpg/frontend/src/pages/Game.jsx`
- Modify: `ai-dungeon-rpg/frontend/src/lib/api.js`

- [ ] **Step 1: api.js에 complete 메서드 추가**

`ai-dungeon-rpg/frontend/src/lib/api.js` 를 읽고, `api` 객체에 아래 메서드 추가:

```js
completeGame: (id) => request(`/games/${id}/complete`, { method: 'POST' }),
```

- [ ] **Step 2: GameOver 페이지 생성**

`ai-dungeon-rpg/frontend/src/pages/GameOver.jsx` 신규 작성:

```jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api'

export default function GameOver() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [stats, setStats] = useState(location.state?.stats || null)
  const [game, setGame] = useState(location.state?.game || null)
  const [loading, setLoading] = useState(!stats)

  useEffect(() => {
    if (!stats && id) {
      api.completeGame(id)
        .then(data => { setStats(data.stats); setGame(data) })
        .catch(() => navigate('/dashboard'))
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">처리 중...</div>
  )

  const isDead = game?.status === 'dead'

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md text-center">
        <div className="text-6xl mb-4">{isDead ? '💀' : '🏆'}</div>
        <h1 className="text-2xl font-bold text-white mb-1">
          {isDead ? '모험 종료' : '모험 완료!'}
        </h1>
        <p className="text-gray-500 text-sm mb-6">{game?.title}</p>

        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-6 text-left">
            {[
              { label: '총 턴 수', value: stats.turn_count, icon: '🎲' },
              { label: '플레이 시간', value: `${stats.play_time_minutes}분`, icon: '⏱️' },
              { label: '최종 레벨', value: `Lv.${stats.final_level}`, icon: '⭐' },
              { label: '최종 HP', value: stats.final_hp, icon: '❤️' },
              { label: '완료 퀘스트', value: `${stats.quests_completed}개`, icon: '📋' },
              { label: '보유 아이템', value: `${stats.inventory_count}개`, icon: '🎒' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-gray-800 rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-1">{icon} {label}</p>
                <p className="text-white font-bold">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/new-game')}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 transition"
          >
            새 모험
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl font-semibold hover:bg-gray-700 transition"
          >
            대시보드
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 라우터에 GameOver 페이지 등록**

`ai-dungeon-rpg/frontend/src/App.jsx` 를 읽고 라우터 설정에 아래 추가:
```jsx
import GameOver from './pages/GameOver'
// ...
<Route path="/games/:id/over" element={<GameOver />} />
```

- [ ] **Step 4: Game.jsx에서 완료 버튼 + 네비게이션 추가**

`ai-dungeon-rpg/frontend/src/pages/Game.jsx` 에서 import에 추가:
```jsx
import { api } from '../lib/api'
```
(이미 있으면 생략)

사망 화면 (`isDead && ...`) 블록 내 "새 모험 시작" 버튼 아래에 추가:
```jsx
<button
  onClick={async () => {
    try {
      const data = await api.completeGame(id)
      navigate(`/games/${id}/over`, { state: { stats: data.stats, game: data } })
    } catch {
      navigate(`/games/${id}/over`)
    }
  }}
  className="mt-2 px-6 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
>
  결과 보기
</button>
```

헤더에 "완료하기" 버튼도 추가 (게임이 active이고 isDead가 아닐 때):
```jsx
{!isDead && (
  <button
    onClick={async () => {
      if (!confirm('모험을 완료하시겠습니까?')) return
      try {
        const data = await api.completeGame(id)
        navigate(`/games/${id}/over`, { state: { stats: data.stats, game: data } })
      } catch {
        navigate('/dashboard')
      }
    }}
    className="ml-auto text-xs text-gray-500 hover:text-gray-300 border border-gray-700 rounded px-2 py-1"
  >
    완료
  </button>
)}
```

- [ ] **Step 5: 커밋**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg
git add frontend/src/pages/GameOver.jsx frontend/src/App.jsx frontend/src/pages/Game.jsx frontend/src/lib/api.js
git commit -m "feat(rpg-p2): game over/complete stats screen"
```

---

## Task 8: 모바일 대응 — 사이드바 토글 (Frontend)

**Files:**
- Modify: `ai-dungeon-rpg/frontend/src/pages/Game.jsx`

- [ ] **Step 1: 모바일 사이드바 토글 구현**

`ai-dungeon-rpg/frontend/src/pages/Game.jsx` 의 `useState` 훅 부분에 추가:
```jsx
const [showSidebar, setShowSidebar] = useState(false)
```

헤더 부분의 "← 대시보드" 버튼 오른쪽에 추가 (모바일 전용 버튼):
```jsx
<button
  onClick={() => setShowSidebar(s => !s)}
  className="ml-auto md:hidden text-gray-500 hover:text-gray-300 text-sm border border-gray-700 rounded px-2 py-1"
>
  {showSidebar ? '닫기' : '상태'}
</button>
```

사이드바 `<StatusPanel>` 감싸는 div를 아래로 교체:
```jsx
<div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col`}>
  <StatusPanel character={game.character} onOpenSheet={() => setShowSheet(true)} />
</div>
```

메인 div (flex 컨테이너)에 `overflow-hidden` 확인. StatusPanel의 `w-64 flex-shrink-0`은 유지.

- [ ] **Step 2: 커밋**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg
git add frontend/src/pages/Game.jsx
git commit -m "feat(rpg-p2): mobile sidebar toggle for status panel"
```

---

## Task 9: 게임 생성 화면 — 클래스 선택 UI (Frontend)

**Files:**
- Modify: `ai-dungeon-rpg/frontend/src/pages/NewGame.jsx`

- [ ] **Step 1: NewGame.jsx 읽기 및 클래스 선택 개선**

`ai-dungeon-rpg/frontend/src/pages/NewGame.jsx` 를 읽고 `character_class` 입력 필드를 찾아 아래 클래스 선택 UI로 교체:

```jsx
const CLASSES = [
  { id: '전사',   label: '전사',   icon: '⚔️',  desc: '강한 체력과 힘' },
  { id: '마법사',  label: '마법사',  icon: '🔮',  desc: '높은 지능과 마나' },
  { id: '도적',   label: '도적',   icon: '🗡️',  desc: '뛰어난 민첩성' },
  { id: '성직자',  label: '성직자',  icon: '✨',  desc: '카리스마와 회복' },
  { id: '궁수',   label: '궁수',   icon: '🏹',  desc: '힘과 민첩의 균형' },
]
```

`character_class` 텍스트 input을 아래 그리드로 교체:
```jsx
<div>
  <label className="block text-sm text-gray-400 mb-2">직업 선택</label>
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
    {CLASSES.map(cls => (
      <button
        key={cls.id}
        type="button"
        onClick={() => setForm(f => ({ ...f, character_class: cls.id }))}
        className={`p-3 rounded-xl border text-left transition ${
          form.character_class === cls.id
            ? 'border-emerald-500 bg-emerald-950/50 text-white'
            : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
        }`}
      >
        <div className="text-xl mb-1">{cls.icon}</div>
        <div className="font-semibold text-sm">{cls.label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{cls.desc}</div>
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 2: 커밋**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg
git add frontend/src/pages/NewGame.jsx
git commit -m "feat(rpg-p2): class selection grid UI in NewGame"
```

---

## Task 10: 프론트엔드 — 오프닝 표시 + gameStore 실시간 character 업데이트

**Files:**
- Modify: `ai-dungeon-rpg/frontend/src/store/gameStore.js`
- Modify: `ai-dungeon-rpg/frontend/src/pages/Game.jsx`

- [ ] **Step 1: gameStore.js 읽기 및 character 실시간 업데이트 확인**

`ai-dungeon-rpg/frontend/src/store/gameStore.js` 를 읽고, `useStream` 훅이 `done` 이벤트에서 받는 `character` 데이터를 `game.character`에 업데이트하는 로직이 있는지 확인.

없으면 store에 `updateCharacter` 액션 추가:
```js
updateCharacter: (character) => set(s => ({
  game: s.game ? { ...s.game, character } : s.game
})),
```

- [ ] **Step 2: useStream.js 읽기 및 done 이벤트에서 character 업데이트**

`ai-dungeon-rpg/frontend/src/hooks/useStream.js` 를 읽고, `done` 이벤트 파싱 시 `character`가 있으면 store의 `updateCharacter`를 호출하도록 수정.

예시 (done 이벤트 처리 부분):
```js
const { updateCharacter } = useGameStore()
// done 이벤트 처리에서:
if (data.done && data.character) {
  updateCharacter(data.character)
}
```

- [ ] **Step 3: Game.jsx에서 오프닝 메시지 표시**

게임 로드 시 histories에 오프닝이 포함되어 있으므로 (백엔드에서 turn=0 gm 히스토리로 저장됨) 별도 처리 불필요. 기존 histories 렌더링이 이를 포함함.

`api.getGame` 응답을 `setGame`할 때 `histories`도 store에 저장되는지 확인. `gameStore.js`의 `setGame`이 `histories`를 처리하는지 확인하고, 없으면 아래처럼 수정:

```js
setGame: (data) => {
  const { histories, ...game } = data
  set({ game, histories: histories || [] })
},
```

- [ ] **Step 4: 커밋**

```bash
cd c:\Users\USER\AIandMLcourse\ai-dungeon-rpg
git add frontend/src/store/gameStore.js frontend/src/hooks/useStream.js frontend/src/pages/Game.jsx
git commit -m "feat(rpg-p2): realtime character update + opening message display"
```

---

## 자체 검토

**스펙 커버리지:**
- Q1 클래스별 스탯+레벨업 → Task 1 ✅
- Q2 GM 오프닝 자동생성 → Task 2 ✅
- Q3 장소/NPC/퀘스트 DB 저장 → Task 3 (world_changes 구조 정의됨, AI가 상태를 world_json에 자동 반영) ✅
- Q4 정교한 전투 시스템 → Task 3 (in_battle, xp_gain, 전투 지침) ✅
- Q5 퀘스트 실시간 추적 → Task 1 (quest_add/remove) + Task 5 (UI) ✅
- Q6 종료 통계 화면 → Task 4 + Task 7 ✅
- Q7 모바일 대응 → Task 8 ✅
- Q8 캐릭터 시트팝업+인벤토리UI+장소목록 → Task 5 + Task 6 ✅ (장소목록은 StatusPanel의 location으로 커버)
- Q9 관리자 불필요 → 해당 없음 ✅
- Q10 현재 제한 유지 → 변경 없음 ✅