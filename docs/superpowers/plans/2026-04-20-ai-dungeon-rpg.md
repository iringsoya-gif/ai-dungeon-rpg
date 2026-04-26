# AI Dungeon RPG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Claude가 GM 역할을 하는 텍스트 어드벤처 RPG 웹앱을 구축한다 (Google OAuth + Polar.sh 결제 + PostgreSQL + SSE 스트리밍).

**Architecture:** FastAPI 모놀리식 백엔드 (Railway) + React SPA 프론트엔드 (Vercel). Claude API를 SSE로 스트리밍하여 실시간 타이핑 효과 구현. 토큰 기반 컨텍스트 압축으로 긴 게임 세션 지원.

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL, python-jose, httpx, anthropic SDK, React 18, Vite, Tailwind CSS v4, Zustand, React Router v6

---

## 파일 맵

### Backend (`ai-dungeon-rpg/backend/`)
| 파일 | 역할 |
|------|------|
| `pyproject.toml` | uv 패키지 설정 |
| `.env` | 환경변수 |
| `app/main.py` | FastAPI 앱 + 미들웨어 |
| `app/core/config.py` | 환경변수 로드 |
| `app/core/database.py` | PostgreSQL 연결 + Base |
| `app/core/security.py` | JWT 생성/검증 |
| `app/api/deps.py` | 인증 의존성 |
| `app/api/routes/auth.py` | Google OAuth 라우터 |
| `app/api/routes/game.py` | 게임 CRUD + SSE 액션 |
| `app/api/routes/payment.py` | Polar.sh 결제 |
| `app/models/user.py` | User 모델 |
| `app/models/game.py` | Game 모델 |
| `app/models/history.py` | History 모델 |
| `app/models/payment.py` | Payment 모델 |
| `app/services/ai_gm.py` | Claude API + 시스템 프롬프트 |
| `app/services/context_manager.py` | 토큰 기반 컨텍스트 압축 |
| `app/services/state_manager.py` | AI 응답 파싱 + 상태 적용 |
| `tests/conftest.py` | 테스트 DB 설정 |
| `tests/test_state_manager.py` | 상태 파싱 테스트 |
| `tests/test_context_manager.py` | 컨텍스트 압축 테스트 |
| `tests/test_game_routes.py` | 게임 API 테스트 |

### Frontend (`ai-dungeon-rpg/frontend/`)
| 파일 | 역할 |
|------|------|
| `src/lib/api.js` | fetch 래퍼 |
| `src/store/authStore.js` | 인증 Zustand 스토어 |
| `src/store/gameStore.js` | 게임 상태 Zustand 스토어 |
| `src/hooks/useStream.js` | SSE 스트림 훅 |
| `src/hooks/useAuth.js` | 인증 훅 |
| `src/components/ui/StreamText.jsx` | 타이핑 효과 컴포넌트 |
| `src/components/game/StoryPanel.jsx` | 스토리 출력 패널 |
| `src/components/game/InputPanel.jsx` | 텍스트 입력 패널 |
| `src/components/game/StatusPanel.jsx` | 캐릭터 상태 패널 |
| `src/pages/Landing.jsx` | 랜딩 페이지 |
| `src/pages/Dashboard.jsx` | 캐릭터 목록 |
| `src/pages/NewGame.jsx` | 세계관 + 캐릭터 생성 |
| `src/pages/Game.jsx` | 메인 게임 화면 |
| `src/pages/Pricing.jsx` | 요금제 |
| `src/pages/auth/Callback.jsx` | OAuth 콜백 처리 |

---

## Task 1: 백엔드 프로젝트 스캐폴딩

**Files:**
- Create: `ai-dungeon-rpg/backend/pyproject.toml`
- Create: `ai-dungeon-rpg/backend/.env`
- Create: `ai-dungeon-rpg/backend/app/__init__.py`
- Create: `ai-dungeon-rpg/backend/app/main.py`
- Create: `ai-dungeon-rpg/backend/app/core/__init__.py`
- Create: `ai-dungeon-rpg/backend/app/core/config.py`
- Create: `ai-dungeon-rpg/backend/app/core/database.py`
- Create: `ai-dungeon-rpg/backend/app/core/security.py`
- Create: `ai-dungeon-rpg/backend/app/api/__init__.py`
- Create: `ai-dungeon-rpg/backend/app/api/deps.py`
- Create: `ai-dungeon-rpg/backend/app/api/routes/__init__.py`
- Create: `ai-dungeon-rpg/backend/app/models/__init__.py`
- Create: `ai-dungeon-rpg/backend/app/services/__init__.py`

- [ ] **Step 1: 프로젝트 디렉토리 생성 및 uv 초기화**

```bash
cd C:\Users\USER\AIandMLcourse\ai-dungeon-rpg
mkdir backend && cd backend
uv init --no-readme
uv add fastapi uvicorn[standard] sqlalchemy psycopg2-binary python-jose[cryptography] httpx python-dotenv anthropic pydantic
uv add --dev pytest pytest-asyncio httpx
```

- [ ] **Step 2: pyproject.toml 확인 — 의존성이 추가됐는지 확인**

```bash
cat pyproject.toml
```
Expected: `fastapi`, `anthropic`, `sqlalchemy`, `psycopg2-binary` 등이 `[project.dependencies]` 에 존재

- [ ] **Step 3: 디렉토리 구조 생성**

```bash
mkdir -p app/core app/api/routes app/models app/services tests
touch app/__init__.py app/core/__init__.py app/api/__init__.py
touch app/api/routes/__init__.py app/models/__init__.py app/services/__init__.py
touch tests/__init__.py
```

- [ ] **Step 4: `app/core/config.py` 작성**

```python
import os
from dotenv import load_dotenv

load_dotenv(encoding="utf-8")

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:5173")
SECRET_KEY           = os.getenv("SECRET_KEY", "changeme")
DATABASE_URL         = os.getenv("DATABASE_URL")
ANTHROPIC_API_KEY    = os.getenv("ANTHROPIC_API_KEY")

POLAR_ACCESS_TOKEN   = os.getenv("POLAR_ACCESS_TOKEN")
POLAR_PRODUCT_ID     = os.getenv("POLAR_PRODUCT_ID")
POLAR_WEBHOOK_SECRET = os.getenv("POLAR_WEBHOOK_SECRET")

ALGORITHM                   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7일
```

- [ ] **Step 5: `app/core/database.py` 작성**

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
```

- [ ] **Step 6: `app/core/security.py` 작성**

```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
```

- [ ] **Step 7: `app/api/deps.py` 작성**

```python
from fastapi import HTTPException, Header, Depends
from sqlalchemy.orm import Session
from app.core.security import decode_token
from app.core.database import get_db
from app.models.user import User


def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "로그인이 필요합니다")
    payload = decode_token(authorization.replace("Bearer ", ""))
    if not payload:
        raise HTTPException(401, "유효하지 않은 토큰입니다")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(404, "유저를 찾을 수 없습니다")
    return user
```

- [ ] **Step 8: `app/main.py` 작성**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import create_tables
from app.api.routes import auth, game, payment

app = FastAPI(title="AI Dungeon RPG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,    prefix="/api/v1/auth",    tags=["인증"])
app.include_router(game.router,    prefix="/api/v1/games",   tags=["게임"])
app.include_router(payment.router, prefix="/api/v1/payment", tags=["결제"])


@app.on_event("startup")
def startup():
    create_tables()


@app.get("/")
def root():
    return {"status": "ok", "service": "AI Dungeon RPG"}
```

- [ ] **Step 9: `.env` 파일 작성**

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/callback
FRONTEND_URL=http://localhost:5173
SECRET_KEY=your-secret-key-change-this
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/dungeon_rpg
ANTHROPIC_API_KEY=sk-ant-your-key
POLAR_ACCESS_TOKEN=polar_at_xxx
POLAR_PRODUCT_ID=prod_xxx
POLAR_WEBHOOK_SECRET=whs_xxx
```

- [ ] **Step 10: PostgreSQL DB 생성**

PowerShell에서:
```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE dungeon_rpg;"
```

- [ ] **Step 11: 서버 기동 확인**

```bash
cd C:\Users\USER\AIandMLcourse\ai-dungeon-rpg\backend
uv run uvicorn app.main:app --reload --port 8000
```
Expected: `http://localhost:8000` 에서 `{"status": "ok", "service": "AI Dungeon RPG"}` 응답

- [ ] **Step 12: Commit**

```bash
git add ai-dungeon-rpg/backend/
git commit -m "feat(rpg): backend scaffold — FastAPI + PostgreSQL + config"
```

---

## Task 2: DB 모델 정의

**Files:**
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/game.py`
- Create: `backend/app/models/history.py`
- Create: `backend/app/models/payment.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: `app/models/user.py` 작성**

```python
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email      = Column(String, unique=True, nullable=False)
    name       = Column(String)
    picture    = Column(String)
    google_id  = Column(String, unique=True)
    plan       = Column(String, default="free")  # free | paid
    created_at = Column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 2: `app/models/game.py` 작성**

```python
from sqlalchemy import Column, String, DateTime, Integer, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class Game(Base):
    __tablename__ = "games"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title          = Column(String)
    world_json     = Column(Text, nullable=False)    # 세계관 JSON 문자열
    character_json = Column(Text, nullable=False)    # 캐릭터 상태 JSON 문자열
    summary        = Column(Text)                    # 컨텍스트 압축 요약
    turn_count     = Column(Integer, default=0)
    hardcore_mode  = Column(Boolean, default=False)
    status         = Column(String, default="active")  # active | dead | completed
    created_at     = Column(DateTime, default=datetime.utcnow)
    last_played    = Column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 3: `app/models/history.py` 작성**

```python
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class History(Base):
    __tablename__ = "histories"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id     = Column(UUID(as_uuid=True), ForeignKey("games.id", ondelete="CASCADE"))
    turn        = Column(Integer, nullable=False)
    role        = Column(String, nullable=False)   # player | gm
    content     = Column(Text, nullable=False)
    state_diff  = Column(Text)                     # 상태 변화 JSON 문자열
    token_count = Column(Integer, default=0)
    created_at  = Column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 4: `app/models/payment.py` 작성**

```python
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    polar_order_id = Column(String, unique=True)
    status         = Column(String)   # paid | refunded
    created_at     = Column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 5: `tests/conftest.py` 작성 (테스트용 인메모리 DB)**

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.main import app

TEST_DB_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_db():
        yield db
    app.dependency_overrides[get_db] = override_db
    yield TestClient(app)
    app.dependency_overrides.clear()
```

- [ ] **Step 6: 모델 임포트 확인 테스트 실행**

```bash
cd C:\Users\USER\AIandMLcourse\ai-dungeon-rpg\backend
uv run python -c "from app.models.user import User; from app.models.game import Game; from app.models.history import History; from app.models.payment import Payment; print('OK')"
```
Expected: `OK`

- [ ] **Step 7: 서버 재기동 후 테이블 자동 생성 확인**

```bash
uv run uvicorn app.main:app --reload --port 8000
```
PowerShell에서:
```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d dungeon_rpg -c "\dt"
```
Expected: `users`, `games`, `histories`, `payments` 테이블 목록 출력

- [ ] **Step 8: Commit**

```bash
git add ai-dungeon-rpg/backend/app/models/ ai-dungeon-rpg/backend/tests/
git commit -m "feat(rpg): DB models — User, Game, History, Payment"
```

---

## Task 3: 인증 라우터 (Google OAuth)

**Files:**
- Create: `backend/app/api/routes/auth.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: 실패 테스트 작성**

`tests/test_auth.py`:
```python
def test_get_me_without_token(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401

def test_get_me_with_invalid_token(client):
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid"})
    assert res.status_code == 401
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
uv run pytest tests/test_auth.py -v
```
Expected: `FAILED` — auth 라우터가 없어서

- [ ] **Step 3: `app/api/routes/auth.py` 작성**

```python
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import httpx

from app.core.config import (
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI, FRONTEND_URL,
)
from app.core.database import get_db
from app.core.security import create_token
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()

GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USER_URL  = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.get("/login")
def google_login():
    params = (
        f"client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid email profile"
        f"&access_type=offline"
    )
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{params}")


@router.get("/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        token_res = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code, "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        token_data = token_res.json()
        user_res = await client.get(
            GOOGLE_USER_URL,
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        google_user = user_res.json()

    user = db.query(User).filter(User.email == google_user["email"]).first()
    if not user:
        user = User(
            email=google_user["email"],
            name=google_user.get("name"),
            picture=google_user.get("picture"),
            google_id=google_user.get("id"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_token({"sub": str(user.id)})
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={token}")


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "picture": current_user.picture,
        "plan": current_user.plan,
    }
```

- [ ] **Step 4: 테스트 재실행 — PASS 확인**

```bash
uv run pytest tests/test_auth.py -v
```
Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add ai-dungeon-rpg/backend/app/api/routes/auth.py ai-dungeon-rpg/backend/tests/test_auth.py
git commit -m "feat(rpg): Google OAuth + JWT auth routes"
```

---

## Task 4: 상태 파서 (AI 응답 → 게임 상태)

**Files:**
- Create: `backend/app/services/state_manager.py`
- Create: `backend/tests/test_state_manager.py`

- [ ] **Step 1: 실패 테스트 작성**

`tests/test_state_manager.py`:
```python
from app.services.state_manager import parse_state_changes, apply_state_changes

def test_parse_valid_json():
    gm_response = """당신이 용을 공격했습니다!

```json
{
  "state_changes": {"hp_change": -10, "inventory_add": ["용의 비늘"], "inventory_remove": [], "location": "용의 동굴"},
  "world_changes": {},
  "game_over": false
}
```"""
    result = parse_state_changes(gm_response)
    assert result["state_changes"]["hp_change"] == -10
    assert "용의 비늘" in result["state_changes"]["inventory_add"]
    assert result["game_over"] is False

def test_parse_invalid_returns_default():
    result = parse_state_changes("JSON이 없는 응답입니다")
    assert result["state_changes"] == {}
    assert result["game_over"] is False

def test_apply_hp_change():
    character = {"stats": {"hp": 80, "mp": 120}, "inventory": [], "skills": []}
    changes = {"state_changes": {"hp_change": -10}}
    result = apply_state_changes(character, changes)
    assert result["stats"]["hp"] == 70

def test_hp_cannot_go_below_zero():
    character = {"stats": {"hp": 5, "mp": 120}, "inventory": [], "skills": []}
    changes = {"state_changes": {"hp_change": -100}}
    result = apply_state_changes(character, changes)
    assert result["stats"]["hp"] == 0

def test_apply_inventory_add():
    character = {"stats": {"hp": 80, "mp": 120}, "inventory": ["단검"], "skills": []}
    changes = {"state_changes": {"inventory_add": ["용의 비늘"]}}
    result = apply_state_changes(character, changes)
    assert "용의 비늘" in result["inventory"]
    assert "단검" in result["inventory"]

def test_apply_inventory_remove():
    character = {"stats": {"hp": 80, "mp": 120}, "inventory": ["단검", "포션"], "skills": []}
    changes = {"state_changes": {"inventory_remove": ["포션"]}}
    result = apply_state_changes(character, changes)
    assert "포션" not in result["inventory"]
    assert "단검" in result["inventory"]

def test_apply_hardcore_penalty():
    character = {"stats": {"hp": 0, "mp": 120}, "inventory": ["포션", "단검", "금화"], "skills": []}
    from app.services.state_manager import apply_death_penalty
    result = apply_death_penalty(character)
    assert result["stats"]["hp"] == 40  # max_hp // 2 (기본 max_hp=80)
    assert len(result["inventory"]) < 3  # 아이템 하나 손실
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
uv run pytest tests/test_state_manager.py -v
```
Expected: `FAILED` — 모듈이 없어서

- [ ] **Step 3: `app/services/state_manager.py` 작성**

```python
import json
import re
import random


def parse_state_changes(gm_response: str) -> dict:
    """AI 응답 마지막 ```json ... ``` 블록에서 상태 변화 추출"""
    default = {"state_changes": {}, "world_changes": {}, "game_over": False}
    try:
        matches = re.findall(r'```json\s*(.*?)\s*```', gm_response, re.DOTALL)
        if matches:
            return json.loads(matches[-1])  # 마지막 JSON 블록 사용
    except Exception:
        pass
    return default


def apply_state_changes(character: dict, changes: dict) -> dict:
    """캐릭터 상태에 변화 적용. character dict를 직접 수정하지 않고 복사본 반환"""
    import copy
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

    return c


def apply_death_penalty(character: dict) -> dict:
    """일반 모드 사망 패널티: HP 반감, 인벤토리 아이템 1개 랜덤 손실"""
    import copy
    c = copy.deepcopy(character)
    max_hp = c["stats"].get("max_hp", 80)
    c["stats"]["hp"] = max_hp // 2
    if c["inventory"]:
        lost = random.choice(c["inventory"])
        c["inventory"].remove(lost)
    return c
```

- [ ] **Step 4: 테스트 재실행 — PASS 확인**

```bash
uv run pytest tests/test_state_manager.py -v
```
Expected: 7/7 `PASSED`

- [ ] **Step 5: Commit**

```bash
git add ai-dungeon-rpg/backend/app/services/state_manager.py ai-dungeon-rpg/backend/tests/test_state_manager.py
git commit -m "feat(rpg): state_manager — AI 응답 파싱 + 캐릭터 상태 적용"
```

---

## Task 5: 컨텍스트 매니저 (토큰 기반 압축)

**Files:**
- Create: `backend/app/services/context_manager.py`
- Create: `backend/tests/test_context_manager.py`

- [ ] **Step 1: 실패 테스트 작성**

`tests/test_context_manager.py`:
```python
from unittest.mock import MagicMock
from app.services.context_manager import ContextManager, estimate_tokens

def test_estimate_tokens():
    # 4글자당 1토큰 근사
    text = "a" * 400
    assert estimate_tokens(text) == 100

def test_build_context_no_compression_needed():
    mgr = ContextManager()
    histories = [
        MagicMock(role="player", content="동쪽으로 간다", token_count=10),
        MagicMock(role="gm", content="당신은 숲에 도착했다", token_count=15),
    ]
    game = MagicMock(summary=None)
    messages = mgr.build_context(game, histories)
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"

def test_build_context_with_compression():
    mgr = ContextManager()
    # 8001 토큰 이상인 히스토리 시뮬레이션
    histories = [MagicMock(role="player", content=f"턴 {i}", token_count=500) for i in range(20)]
    game = MagicMock(summary="이전에 플레이어는 마을을 떠났다")
    messages = mgr.build_context(game, histories)
    # 요약 2개 + 최근 10턴 = 12개
    assert len(messages) == 12
    assert "이전에 플레이어는 마을을 떠났다" in messages[0]["content"]

def test_needs_compression_true():
    mgr = ContextManager()
    histories = [MagicMock(token_count=500) for _ in range(20)]  # 10000 토큰
    assert mgr.needs_compression(histories) is True

def test_needs_compression_false():
    mgr = ContextManager()
    histories = [MagicMock(token_count=100) for _ in range(10)]  # 1000 토큰
    assert mgr.needs_compression(histories) is False
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
uv run pytest tests/test_context_manager.py -v
```
Expected: `FAILED`

- [ ] **Step 3: `app/services/context_manager.py` 작성**

```python
TOKEN_LIMIT  = 8_000
MAX_RECENT   = 10


def estimate_tokens(text: str) -> int:
    """4글자 = 1토큰 근사 (한국어/영어 혼합 환경)"""
    return len(text) // 4


class ContextManager:

    def needs_compression(self, histories: list) -> bool:
        return sum(h.token_count for h in histories) > TOKEN_LIMIT

    def build_context(self, game, histories: list) -> list:
        """Claude에 보낼 messages 배열 구성"""
        messages = []

        if self.needs_compression(histories):
            summary = game.summary or "게임 시작"
            messages.append({"role": "user",      "content": f"[이전 기록 요약]\n{summary}"})
            messages.append({"role": "assistant",  "content": "이전 기록을 기억하겠습니다."})
            histories = histories[-MAX_RECENT:]

        for h in histories:
            messages.append({
                "role": "user" if h.role == "player" else "assistant",
                "content": h.content,
            })

        return messages

    async def compress_if_needed(self, game, histories: list, db, ai_client) -> None:
        """토큰 초과 시 Claude로 요약 생성 후 game.summary 업데이트"""
        if not self.needs_compression(histories):
            return

        old_content = "\n".join(
            f"{'플레이어' if h.role == 'player' else 'GM'}: {h.content}"
            for h in histories[:-MAX_RECENT]
        )
        summary_prompt = f"다음 RPG 게임 기록을 3~5문장으로 요약하세요:\n\n{old_content}"

        response = ai_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            messages=[{"role": "user", "content": summary_prompt}],
        )
        game.summary = response.content[0].text
        db.commit()
```

- [ ] **Step 4: 테스트 재실행 — PASS 확인**

```bash
uv run pytest tests/test_context_manager.py -v
```
Expected: 5/5 `PASSED`

- [ ] **Step 5: Commit**

```bash
git add ai-dungeon-rpg/backend/app/services/context_manager.py ai-dungeon-rpg/backend/tests/test_context_manager.py
git commit -m "feat(rpg): context_manager — 토큰 기반 컨텍스트 압축"
```

---

## Task 6: AI GM 서비스

**Files:**
- Create: `backend/app/services/ai_gm.py`

- [ ] **Step 1: `app/services/ai_gm.py` 작성**

```python
import json
from anthropic import Anthropic
from app.core.config import ANTHROPIC_API_KEY
from app.services.context_manager import ContextManager, estimate_tokens
from app.services.state_manager import parse_state_changes, apply_state_changes, apply_death_penalty

client = Anthropic(api_key=ANTHROPIC_API_KEY)
context_mgr = ContextManager()

HARDCORE_ON_INST  = "- 하드코어 모드: HP가 0이 되면 반드시 game_over를 true로 설정하세요."
HARDCORE_OFF_INST = "- 일반 모드: HP가 0이 되면 game_over는 false, hp_change로 0에서 멈추세요. 패널티는 서버가 처리합니다."

SYSTEM_TEMPLATE = """당신은 텍스트 어드벤처 RPG의 게임마스터(GM)입니다.

## 세계관
{world_description}

## 게임 규칙
- 플레이어의 모든 행동에 현실적인 결과를 부여하세요
- 캐릭터 능력치를 반드시 반영하세요 (지능 높음 → 마법 성공률 높음)
- 세계관의 일관성을 절대 깨지 마세요
- 생동감 있고 몰입감 있게 2~4문단으로 작성하세요
{hardcore_instruction}

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
    "inventory_add": [],
    "inventory_remove": [],
    "location": "현재 위치명"
  }},
  "world_changes": {{}},
  "game_over": false
}}
```
"""


def build_system_prompt(game) -> str:
    world = json.loads(game.world_json)
    character = json.loads(game.character_json)
    hardcore_inst = HARDCORE_ON_INST if game.hardcore_mode else HARDCORE_OFF_INST
    return SYSTEM_TEMPLATE.format(
        world_description=world.get("description", ""),
        hardcore_instruction=hardcore_inst,
        character_json=json.dumps(character, ensure_ascii=False, indent=2),
        location=character.get("location", "알 수 없는 장소"),
    )


async def stream_action(game, histories: list, player_input: str):
    """
    SSE 제너레이터. (text, chunk) 또는 (done, state_dict) 튜플 yield.
    """
    system = build_system_prompt(game)
    messages = context_mgr.build_context(game, histories)
    messages.append({"role": "user", "content": player_input})

    full_response = ""

    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            full_response += text
            yield ("text", text)

    state_changes = parse_state_changes(full_response)
    token_count = estimate_tokens(full_response)

    yield ("done", {
        "full_response": full_response,
        "state_changes": state_changes,
        "token_count": token_count,
    })
```

- [ ] **Step 2: import 확인**

```bash
uv run python -c "from app.services.ai_gm import build_system_prompt; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add ai-dungeon-rpg/backend/app/services/ai_gm.py
git commit -m "feat(rpg): ai_gm service — 시스템 프롬프트 + SSE 스트림 제너레이터"
```

---

## Task 7: 게임 API 라우터

**Files:**
- Create: `backend/app/api/routes/game.py`
- Create: `backend/tests/test_game_routes.py`

- [ ] **Step 1: 실패 테스트 작성**

`tests/test_game_routes.py`:
```python
import json
from app.core.security import create_token
from app.models.user import User
import uuid

def make_user(db):
    user = User(email="test@test.com", name="테스터", google_id="g123")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def auth_header(user):
    token = create_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}

def test_create_game(client, db):
    user = make_user(db)
    payload = {
        "world_description": "중세 판타지 세계",
        "character_name": "아리아",
        "character_class": "마법사",
        "character_background": "고아 출신 마법사",
        "hardcore_mode": False,
    }
    res = client.post("/api/v1/games", json=payload, headers=auth_header(user))
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert data["status"] == "active"

def test_list_games(client, db):
    user = make_user(db)
    res = client.get("/api/v1/games", headers=auth_header(user))
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_free_user_cannot_create_second_game(client, db):
    user = make_user(db)
    payload = {
        "world_description": "판타지",
        "character_name": "A",
        "character_class": "전사",
        "character_background": "용감한 전사",
        "hardcore_mode": False,
    }
    client.post("/api/v1/games", json=payload, headers=auth_header(user))
    res = client.post("/api/v1/games", json=payload, headers=auth_header(user))
    assert res.status_code == 403

def test_get_game(client, db):
    user = make_user(db)
    payload = {
        "world_description": "SF 우주",
        "character_name": "스타",
        "character_class": "우주인",
        "character_background": "행성 탐험가",
        "hardcore_mode": True,
    }
    create_res = client.post("/api/v1/games", json=payload, headers=auth_header(user))
    game_id = create_res.json()["id"]
    res = client.get(f"/api/v1/games/{game_id}", headers=auth_header(user))
    assert res.status_code == 200
    assert res.json()["hardcore_mode"] is True
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
uv run pytest tests/test_game_routes.py -v
```
Expected: `FAILED`

- [ ] **Step 3: `app/api/routes/game.py` 작성**

```python
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
from app.services.ai_gm import stream_action
from app.services.context_manager import context_mgr
from app.services.state_manager import apply_state_changes, apply_death_penalty

router = APIRouter()


class CreateGameRequest(BaseModel):
    world_description: str
    character_name: str
    character_class: str
    character_background: str
    hardcore_mode: bool = False


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
    return {"name": "새 세계", "description": description, "rules": [], "locations": {}, "npcs": {}}


def _build_initial_character(name: str, char_class: str, background: str) -> dict:
    return {
        "name": name, "class": char_class, "background": background,
        "level": 1, "location": "출발 지점",
        "stats": {"hp": 80, "max_hp": 80, "mp": 100, "max_mp": 100,
                  "strength": 8, "intelligence": 8, "agility": 8, "charisma": 8},
        "inventory": ["기본 무기", "포션 1개"],
        "skills": [], "quests": [], "status_effects": [],
    }


@router.post("", status_code=201)
def create_game(
    req: CreateGameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_game_limit(current_user, db)
    world = _build_initial_world(req.world_description)
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
    return _game_to_dict(game)


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
        token_count = 0

        async for event_type, payload in stream_action(game, histories, req.text):
            if event_type == "text":
                full_response += payload
                yield f"data: {json.dumps({'text': payload})}\n\n"
            elif event_type == "done":
                full_response = payload["full_response"]
                state_changes = payload["state_changes"]
                token_count = payload["token_count"]

        # 플레이어 입력 저장
        from app.services.context_manager import estimate_tokens
        player_turn = game.turn_count
        db.add(History(
            game_id=game.id, turn=player_turn, role="player",
            content=req.text, token_count=estimate_tokens(req.text),
        ))
        game.turn_count += 1

        # GM 응답 저장
        db.add(History(
            game_id=game.id, turn=game.turn_count, role="gm",
            content=full_response, state_diff=json.dumps(state_changes),
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
        await context_mgr.compress_if_needed(game, all_histories, db, __import__("app.services.ai_gm", fromlist=["client"]).client)

        yield f"data: {json.dumps({'done': True, 'state': state_changes, 'character': character, 'game_status': game.status})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


def _get_owned_game(game_id: str, user: User, db: Session) -> Game:
    game = db.query(Game).filter(Game.id == game_id, Game.user_id == user.id).first()
    if not game:
        raise HTTPException(404, "게임을 찾을 수 없습니다")
    return game


def _game_to_dict(game: Game) -> dict:
    return {
        "id": str(game.id),
        "title": game.title,
        "status": game.status,
        "hardcore_mode": game.hardcore_mode,
        "turn_count": game.turn_count,
        "character": json.loads(game.character_json),
        "world": json.loads(game.world_json),
        "created_at": game.created_at.isoformat(),
        "last_played": game.last_played.isoformat(),
    }


def _history_to_dict(h: History) -> dict:
    return {
        "id": str(h.id),
        "turn": h.turn,
        "role": h.role,
        "content": h.content,
    }
```

- [ ] **Step 4: 테스트 재실행 — PASS 확인**

```bash
uv run pytest tests/test_game_routes.py -v
```
Expected: 4/4 `PASSED`

- [ ] **Step 5: Commit**

```bash
git add ai-dungeon-rpg/backend/app/api/routes/game.py ai-dungeon-rpg/backend/tests/test_game_routes.py
git commit -m "feat(rpg): game routes — CRUD + SSE 액션 + 슬롯 제한 + 하드코어 처리"
```

---

## Task 8: 결제 라우터 (Polar.sh)

**Files:**
- Create: `backend/app/api/routes/payment.py`

- [ ] **Step 1: `app/api/routes/payment.py` 작성**

```python
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import httpx, hmac, hashlib, json

from app.core.database import get_db
from app.core.config import POLAR_ACCESS_TOKEN, POLAR_PRODUCT_ID, POLAR_WEBHOOK_SECRET, FRONTEND_URL
from app.api.deps import get_current_user
from app.models.user import User
from app.models.payment import Payment

router = APIRouter()
POLAR_API_URL = "https://api.polar.sh/v1"


@router.post("/checkout")
async def create_checkout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.plan == "paid":
        raise HTTPException(400, "이미 결제하셨습니다")

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{POLAR_API_URL}/checkouts/",
            headers={"Authorization": f"Bearer {POLAR_ACCESS_TOKEN}", "Content-Type": "application/json"},
            json={
                "product_id": POLAR_PRODUCT_ID,
                "success_url": f"{FRONTEND_URL}/payment/success",
                "cancel_url": f"{FRONTEND_URL}/pricing",
                "customer_email": current_user.email,
                "metadata": {"user_id": str(current_user.id)},
            },
        )
    data = res.json()
    if res.status_code != 201:
        raise HTTPException(500, f"Polar 결제 생성 실패: {data}")
    return {"checkout_url": data["url"]}


@router.post("/webhook")
async def polar_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("webhook-signature", "")
    expected = hmac.new(POLAR_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(f"sha256={expected}", signature):
        raise HTTPException(400, "서명 검증 실패")

    event = json.loads(body)
    event_type = event.get("type")
    data = event.get("data", {})

    if event_type in ["order.paid", "subscription.active"]:
        email = data.get("customer", {}).get("email")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user_id = data.get("metadata", {}).get("user_id")
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.plan = "paid"
            db.add(Payment(user_id=user.id, polar_order_id=data.get("id"), status="paid"))
            db.commit()

    elif event_type == "order.refunded":
        payment = db.query(Payment).filter(Payment.polar_order_id == data.get("id")).first()
        if payment:
            payment.status = "refunded"
            user = db.query(User).filter(User.id == payment.user_id).first()
            if user:
                user.plan = "free"
            db.commit()

    return {"status": "ok"}


@router.get("/status")
def payment_status(current_user: User = Depends(get_current_user)):
    return {"plan": current_user.plan, "is_paid": current_user.plan == "paid"}
```

- [ ] **Step 2: 서버 재기동 후 전체 라우터 확인**

```bash
uv run uvicorn app.main:app --reload --port 8000
```
브라우저에서 `http://localhost:8000/docs` 접속 — `/api/v1/auth`, `/api/v1/games`, `/api/v1/payment` 라우터 확인

- [ ] **Step 3: Commit**

```bash
git add ai-dungeon-rpg/backend/app/api/routes/payment.py
git commit -m "feat(rpg): payment routes — Polar.sh checkout + webhook"
```

---

## Task 9: 프론트엔드 스캐폴딩

**Files:**
- Create: `frontend/package.json` (via npm)
- Create: `frontend/src/lib/api.js`
- Create: `frontend/src/store/authStore.js`
- Create: `frontend/src/store/gameStore.js`
- Create: `frontend/src/App.jsx`

- [ ] **Step 1: Vite + React 프로젝트 생성**

```bash
cd C:\Users\USER\AIandMLcourse\ai-dungeon-rpg
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install zustand react-router-dom
```

- [ ] **Step 2: Tailwind CSS v4 설치**

```bash
npm install tailwindcss @tailwindcss/vite
```

`vite.config.js` 수정:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`src/index.css` 첫 줄에 추가:
```css
@import "tailwindcss";
```

- [ ] **Step 3: `src/lib/api.js` 작성**

```js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!res.ok) throw await res.json()
  return res
}

export const api = {
  get:    (path)         => request(path),
  post:   (path, body)   => request(path, { method: 'POST', body: JSON.stringify(body) }),
  delete: (path)         => request(path, { method: 'DELETE' }),
  getMe:  ()             => api.get('/auth/me').then(r => r.json()),
  loginUrl: ()           => `${API_URL}/auth/login`,

  // 게임
  createGame:  (payload) => api.post('/games', payload).then(r => r.json()),
  listGames:   ()        => api.get('/games').then(r => r.json()),
  getGame:     (id)      => api.get(`/games/${id}`).then(r => r.json()),
  deleteGame:  (id)      => api.delete(`/games/${id}`),

  // 결제
  checkout:    ()        => api.post('/payment/checkout').then(r => r.json()),
  payStatus:   ()        => api.get('/payment/status').then(r => r.json()),
}

export { API_URL }
```

- [ ] **Step 4: `src/store/authStore.js` 작성**

```js
import { create } from 'zustand'
import { api } from '../lib/api'

export const useAuthStore = create((set) => ({
  user:      null,
  isLoading: true,

  init: async () => {
    const token = localStorage.getItem('token')
    if (!token) { set({ isLoading: false }); return }
    try {
      const user = await api.getMe()
      set({ user, isLoading: false })
    } catch {
      localStorage.removeItem('token')
      set({ isLoading: false })
    }
  },

  setUser:  (user)  => set({ user }),
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null })
  },
}))
```

- [ ] **Step 5: `src/store/gameStore.js` 작성**

```js
import { create } from 'zustand'

export const useGameStore = create((set) => ({
  game:        null,
  histories:   [],
  isStreaming: false,
  streamText:  '',

  setGame: (game) => set({ game, histories: game.histories || [] }),

  addHistory: (entry) => set((s) => ({ histories: [...s.histories, entry] })),

  updateCharacter: (character) =>
    set((s) => ({ game: s.game ? { ...s.game, character } : null })),

  setStreaming: (v)    => set({ isStreaming: v }),
  appendStream: (text) => set((s) => ({ streamText: s.streamText + text })),
  clearStream:  ()     => set({ streamText: '' }),
}))
```

- [ ] **Step 6: `src/App.jsx` 작성**

```jsx
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import NewGame from './pages/NewGame'
import Game from './pages/Game'
import Pricing from './pages/Pricing'
import Callback from './pages/auth/Callback'

function PrivateRoute({ children }) {
  const user = useAuthStore(s => s.user)
  const isLoading = useAuthStore(s => s.isLoading)
  if (isLoading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">로딩 중...</div>
  return user ? children : <Navigate to="/" />
}

export default function App() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"               element={<Landing />} />
        <Route path="/auth/callback"  element={<Callback />} />
        <Route path="/dashboard"      element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/new-game"       element={<PrivateRoute><NewGame /></PrivateRoute>} />
        <Route path="/game/:id"       element={<PrivateRoute><Game /></PrivateRoute>} />
        <Route path="/pricing"        element={<Pricing />} />
        <Route path="/payment/success" element={<PrivateRoute><div className="text-white p-8">결제 완료! 감사합니다 🎉</div></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 7: `.env` 파일 생성**

```bash
# frontend/.env
VITE_API_URL=http://localhost:8000/api/v1
```

- [ ] **Step 8: 개발 서버 기동 확인**

```bash
npm run dev
```
Expected: `http://localhost:5173` 에서 Vite 기본 페이지 로드

- [ ] **Step 9: Commit**

```bash
git add ai-dungeon-rpg/frontend/
git commit -m "feat(rpg): frontend scaffold — Vite + React + Tailwind + Zustand + Router"
```

---

## Task 10: 인증 페이지 (Callback + 랜딩)

**Files:**
- Create: `frontend/src/pages/auth/Callback.jsx`
- Create: `frontend/src/pages/Landing.jsx`

- [ ] **Step 1: `src/pages/auth/Callback.jsx` 작성**

```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api'

export default function Callback() {
  const navigate = useNavigate()
  const setUser  = useAuthStore(s => s.setUser)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token  = params.get('token')
    if (!token) { navigate('/'); return }

    localStorage.setItem('token', token)
    api.getMe().then(user => {
      setUser(user)
      navigate('/dashboard')
    }).catch(() => {
      localStorage.removeItem('token')
      navigate('/')
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
      로그인 중...
    </div>
  )
}
```

- [ ] **Step 2: `src/pages/Landing.jsx` 작성**

```jsx
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { api } from '../lib/api'

export default function Landing() {
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user])

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white px-4">
      <div className="text-center max-w-xl">
        <div className="text-7xl mb-6">⚔️</div>
        <h1 className="text-5xl font-bold mb-4">AI 던전 RPG</h1>
        <p className="text-gray-400 text-lg mb-2">Claude AI가 게임마스터가 되어</p>
        <p className="text-gray-400 text-lg mb-8">당신만의 이야기를 실시간으로 만들어갑니다</p>

        <div className="flex justify-center gap-4 mb-10">
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 text-sm">
            <div className="text-emerald-400 font-semibold mb-1">무료</div>
            <div className="text-gray-400">캐릭터 1명</div>
          </div>
          <div className="bg-gray-900 border border-emerald-500/30 rounded-xl px-6 py-4 text-sm">
            <div className="text-emerald-400 font-semibold mb-1">$9 이후</div>
            <div className="text-gray-400">캐릭터 무제한</div>
          </div>
        </div>

        <button
          onClick={() => window.location.href = api.loginUrl()}
          className="flex items-center gap-3 mx-auto px-10 py-4 bg-white text-gray-800
                     rounded-xl font-semibold text-lg hover:bg-gray-100 transition shadow-xl"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="G" />
          Google로 모험 시작
        </button>
        <p className="text-gray-600 text-xs mt-4">가입 시 캐릭터 1명 무료 이용 가능</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 브라우저에서 `http://localhost:5173` 확인**

랜딩 페이지가 표시되고 "Google로 모험 시작" 버튼이 보이면 정상

- [ ] **Step 4: Commit**

```bash
git add ai-dungeon-rpg/frontend/src/pages/
git commit -m "feat(rpg): landing page + OAuth callback"
```

---

## Task 11: 대시보드 + 새 게임 생성 페이지

**Files:**
- Create: `frontend/src/pages/Dashboard.jsx`
- Create: `frontend/src/pages/NewGame.jsx`

- [ ] **Step 1: `src/pages/Dashboard.jsx` 작성**

```jsx
import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { api } from '../lib/api'

export default function Dashboard() {
  const user     = useAuthStore(s => s.user)
  const logout   = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const [games, setGames] = useState([])

  useEffect(() => {
    api.listGames().then(setGames).catch(console.error)
  }, [])

  const handleLogout = () => { logout(); navigate('/') }

  const handleDelete = async (id) => {
    if (!confirm('이 게임을 삭제하시겠습니까?')) return
    await api.deleteGame(id)
    setGames(games.filter(g => g.id !== id))
  }

  const canCreate = user?.plan === 'paid' || games.filter(g => g.status === 'active').length < 1

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center">
        <span className="text-emerald-400 text-xl mr-3">⚔️</span>
        <h1 className="text-lg font-bold">AI 던전 RPG</h1>
        {user?.plan === 'paid' && (
          <span className="ml-3 text-xs bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-1 rounded-full">
            ✓ Adventurer
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {user?.picture && <img src={user.picture} className="w-7 h-7 rounded-full" alt="" />}
          <span className="text-sm text-gray-400">{user?.name}</span>
          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-3 py-1 rounded-lg">
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">내 모험</h2>
          {canCreate ? (
            <Link to="/new-game" className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition text-sm">
              + 새 모험 시작
            </Link>
          ) : (
            <Link to="/pricing" className="px-5 py-2 bg-gray-700 text-gray-300 rounded-lg font-semibold hover:bg-gray-600 transition text-sm">
              🔒 업그레이드
            </Link>
          )}
        </div>

        {games.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">🗺️</div>
            <p>아직 모험이 없습니다. 새 모험을 시작하세요!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {games.map(game => (
              <div key={game.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{game.title}</h3>
                    {game.hardcore_mode && <span className="text-xs text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">하드코어</span>}
                    {game.status === 'dead' && <span className="text-xs text-gray-500 border border-gray-700 px-2 py-0.5 rounded-full">💀 사망</span>}
                  </div>
                  <p className="text-sm text-gray-400">{game.character?.name} · {game.character?.class} · {game.turn_count}턴</p>
                </div>
                <div className="flex gap-2">
                  {game.status === 'active' && (
                    <button onClick={() => navigate(`/game/${game.id}`)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500">
                      계속하기
                    </button>
                  )}
                  <button onClick={() => handleDelete(game.id)}
                    className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700">
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: `src/pages/NewGame.jsx` 작성**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const TEMPLATES = [
  { label: '판타지', icon: '🏰', desc: '중세 마법과 용이 존재하는 세계' },
  { label: 'SF',    icon: '🚀', desc: '우주와 첨단 기술의 미래 세계' },
  { label: '공포',  icon: '👻', desc: '어둠과 공포가 지배하는 세계' },
  { label: '현대',  icon: '🌆', desc: '현실과 비슷한 현대 도시' },
  { label: '커스텀', icon: '✏️', desc: '직접 세계관을 입력합니다' },
]

export default function NewGame() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [template, setTemplate] = useState(null)
  const [worldDesc, setWorldDesc] = useState('')
  const [charName, setCharName] = useState('')
  const [charClass, setCharClass] = useState('')
  const [charBg, setCharBg] = useState('')
  const [hardcore, setHardcore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectTemplate = (t) => {
    setTemplate(t)
    if (t.label !== '커스텀') setWorldDesc(t.desc)
    setStep(2)
  }

  const handleCreate = async () => {
    if (!charName || !charClass || !charBg) { setError('모든 항목을 입력해주세요'); return }
    setLoading(true)
    try {
      const game = await api.createGame({
        world_description: worldDesc,
        character_name: charName,
        character_class: charClass,
        character_background: charBg,
        hardcore_mode: hardcore,
      })
      navigate(`/game/${game.id}`)
    } catch (e) {
      setError(e?.message || '게임 생성 실패')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-300 mb-6 text-sm">← 뒤로</button>
        <h1 className="text-3xl font-bold mb-8">새 모험 시작</h1>

        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold mb-4 text-gray-300">세계관 선택</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TEMPLATES.map(t => (
                <button key={t.label} onClick={() => selectTemplate(t)}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-left hover:border-emerald-500/50 transition">
                  <div className="text-3xl mb-2">{t.icon}</div>
                  <div className="font-semibold">{t.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{t.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold mb-2 text-gray-300">세계관 설명</h2>
            <textarea
              value={worldDesc}
              onChange={e => setWorldDesc(e.target.value)}
              rows={4}
              placeholder="예: 마법이 존재하고 용이 지배하는 중세 왕국. 암흑 마법사가 왕을 조종하고 있다..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-200 resize-none mb-6 focus:border-emerald-500/50 outline-none"
            />
            <button onClick={() => setStep(3)}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500">
              다음 → 캐릭터 생성
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold mb-4 text-gray-300">캐릭터 생성</h2>
            <div className="space-y-4">
              <input value={charName} onChange={e => setCharName(e.target.value)}
                placeholder="캐릭터 이름"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-200 focus:border-emerald-500/50 outline-none" />
              <input value={charClass} onChange={e => setCharClass(e.target.value)}
                placeholder="직업/클래스 (예: 마법사, 전사, 도적)"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-200 focus:border-emerald-500/50 outline-none" />
              <textarea value={charBg} onChange={e => setCharBg(e.target.value)}
                rows={3} placeholder="배경 스토리 (예: 고아 출신으로 마법학교를 졸업했다...)"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-200 resize-none focus:border-emerald-500/50 outline-none" />

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold">하드코어 모드</div>
                  <div className="text-xs text-gray-500">사망 시 게임 영구 종료 (긴장감 극대화)</div>
                </div>
                <button onClick={() => setHardcore(!hardcore)}
                  className={`w-12 h-6 rounded-full transition-colors ${hardcore ? 'bg-red-500' : 'bg-gray-700'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${hardcore ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button onClick={handleCreate} disabled={loading}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 disabled:opacity-50 transition">
                {loading ? '모험 준비 중...' : '⚔️ 모험 시작!'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 브라우저에서 로그인 후 `/new-game` 흐름 테스트**

  1. 랜딩 → Google 로그인
  2. 대시보드에서 "새 모험 시작" 클릭
  3. 세계관 선택 → 설명 입력 → 캐릭터 입력 → 시작

- [ ] **Step 4: Commit**

```bash
git add ai-dungeon-rpg/frontend/src/pages/Dashboard.jsx ai-dungeon-rpg/frontend/src/pages/NewGame.jsx
git commit -m "feat(rpg): dashboard + new game creation flow"
```

---

## Task 12: 메인 게임 화면 (SSE 스트리밍)

**Files:**
- Create: `frontend/src/hooks/useStream.js`
- Create: `frontend/src/components/ui/StreamText.jsx`
- Create: `frontend/src/components/game/StoryPanel.jsx`
- Create: `frontend/src/components/game/InputPanel.jsx`
- Create: `frontend/src/components/game/StatusPanel.jsx`
- Create: `frontend/src/pages/Game.jsx`

- [ ] **Step 1: `src/hooks/useStream.js` 작성**

```js
import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { API_URL } from '../lib/api'

export function useStream() {
  const [streaming, setStreaming] = useState(false)
  const { appendStream, clearStream, updateCharacter, addHistory } = useGameStore()

  const sendAction = async (gameId, actionText) => {
    setStreaming(true)
    clearStream()

    const token = localStorage.getItem('token')
    const res = await fetch(`${API_URL}/games/${gameId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ text: actionText }),
    })

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let gmText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.text) {
            gmText += data.text
            appendStream(data.text)
          }
          if (data.done) {
            updateCharacter(data.character)
            addHistory({ role: 'player', content: actionText })
            addHistory({ role: 'gm', content: gmText })
            setStreaming(false)
          }
        } catch { /* 불완전한 청크 무시 */ }
      }
    }
  }

  return { streaming, sendAction }
}
```

- [ ] **Step 2: `src/components/ui/StreamText.jsx` 작성**

```jsx
export default function StreamText({ text, isStreaming }) {
  return (
    <div className="font-mono text-emerald-200 leading-relaxed whitespace-pre-wrap">
      {text}
      {isStreaming && <span className="animate-pulse text-emerald-400">▋</span>}
    </div>
  )
}
```

- [ ] **Step 3: `src/components/game/StatusPanel.jsx` 작성**

```jsx
export default function StatusPanel({ character }) {
  if (!character) return null
  const { stats, inventory, quests, location } = character
  const hpPct = Math.max(0, Math.min(100, (stats.hp / stats.max_hp) * 100))
  const mpPct = Math.max(0, Math.min(100, (stats.mp / stats.max_mp) * 100))

  return (
    <div className="bg-gray-900 border-l border-gray-800 w-64 p-4 flex flex-col gap-4 overflow-y-auto">
      <div>
        <p className="text-xs text-gray-500 mb-1">HP</p>
        <div className="h-2 bg-gray-800 rounded-full">
          <div className="h-2 bg-red-500 rounded-full transition-all" style={{ width: `${hpPct}%` }} />
        </div>
        <p className="text-xs text-right text-gray-400 mt-1">{stats.hp} / {stats.max_hp}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">MP</p>
        <div className="h-2 bg-gray-800 rounded-full">
          <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${mpPct}%` }} />
        </div>
        <p className="text-xs text-right text-gray-400 mt-1">{stats.mp} / {stats.max_mp}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-2">🗺️ 위치</p>
        <p className="text-sm text-gray-300">{location || '???'}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-2">🎒 인벤토리 ({inventory?.length || 0})</p>
        <ul className="space-y-1">
          {(inventory || []).map((item, i) => (
            <li key={i} className="text-xs text-gray-400 bg-gray-800 rounded px-2 py-1">{item}</li>
          ))}
        </ul>
      </div>
      {quests?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">📋 퀘스트</p>
          <ul className="space-y-1">
            {quests.map((q, i) => (
              <li key={i} className="text-xs text-gray-400">• {q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: `src/pages/Game.jsx` 작성**

```jsx
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { api } from '../lib/api'
import { useStream } from '../hooks/useStream'
import StreamText from '../components/ui/StreamText'
import StatusPanel from '../components/game/StatusPanel'

export default function Game() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { game, histories, streamText, setGame } = useGameStore()
  const { streaming, sendAction } = useStream()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    api.getGame(id).then(setGame).catch(() => navigate('/dashboard'))
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [histories, streamText])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || streaming) return
    const text = input.trim()
    setInput('')
    await sendAction(id, text)
  }

  if (!game) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
      로딩 중...
    </div>
  )

  const isDead = game.status === 'dead'

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      {/* 헤더 */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-300 text-sm">← 대시보드</button>
        <span className="text-gray-700">|</span>
        <span className="font-semibold">{game.title}</span>
        {game.hardcore_mode && <span className="text-xs text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">하드코어</span>}
        <span className="ml-auto text-xs text-gray-600 font-mono">{game.turn_count}턴</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 스토리 패널 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {histories.map((h, i) => (
              <div key={i} className={`flex ${h.role === 'player' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2xl rounded-xl px-4 py-3 text-sm ${
                  h.role === 'player'
                    ? 'bg-gray-800 text-gray-200'
                    : 'bg-gray-900 border border-gray-800 text-emerald-100'
                }`}>
                  {h.role === 'player' && <span className="text-xs text-gray-500 block mb-1">▶ 플레이어</span>}
                  {h.role === 'gm'     && <span className="text-xs text-emerald-600 block mb-1">⚔️ GM</span>}
                  <p className="whitespace-pre-wrap">{h.content}</p>
                </div>
              </div>
            ))}

            {streaming && (
              <div className="flex justify-start">
                <div className="max-w-2xl bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm">
                  <span className="text-xs text-emerald-600 block mb-1">⚔️ GM</span>
                  <StreamText text={streamText} isStreaming={true} />
                </div>
              </div>
            )}

            {isDead && (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">💀</div>
                <p className="text-red-400 font-bold text-lg">모험이 종료되었습니다</p>
                <p className="text-gray-500 text-sm mt-1">새 모험을 시작하세요</p>
                <button onClick={() => navigate('/new-game')}
                  className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500">
                  새 모험 시작
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          {!isDead && (
            <form onSubmit={handleSubmit} className="border-t border-gray-800 p-4 flex gap-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={streaming}
                placeholder="무엇을 하시겠습니까? (자유롭게 입력하세요)"
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3
                           text-gray-200 placeholder-gray-600 outline-none focus:border-emerald-500/50
                           disabled:opacity-50"
              />
              <button type="submit" disabled={streaming || !input.trim()}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold
                           hover:bg-emerald-500 disabled:opacity-30 transition">
                {streaming ? '...' : '↵'}
              </button>
            </form>
          )}
        </div>

        {/* 상태 패널 */}
        <StatusPanel character={game.character} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 실제 게임 플레이 테스트**

  1. 새 게임 생성 (`/new-game`)
  2. 게임 화면에서 "동쪽으로 간다" 입력
  3. Claude GM의 스트리밍 응답 확인
  4. 우측 상태 패널에서 HP/MP/인벤토리 업데이트 확인

- [ ] **Step 6: Commit**

```bash
git add ai-dungeon-rpg/frontend/src/
git commit -m "feat(rpg): main game UI — SSE streaming + story panel + status panel"
```

---

## Task 13: 요금제 페이지

**Files:**
- Create: `frontend/src/pages/Pricing.jsx`

- [ ] **Step 1: `src/pages/Pricing.jsx` 작성**

```jsx
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { api } from '../lib/api'

export default function Pricing() {
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    if (!user) { window.location.href = api.loginUrl(); return }
    setLoading(true)
    try {
      const { checkout_url } = await api.checkout()
      window.location.href = checkout_url
    } catch {
      alert('결제 페이지 이동 중 오류가 발생했습니다')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <button onClick={() => navigate(-1)} className="self-start text-gray-500 hover:text-gray-300 text-sm mb-8">← 뒤로</button>
      <h1 className="text-4xl font-bold mb-2 text-center">요금제</h1>
      <p className="text-gray-400 mb-12 text-center">당신의 모험 스타일에 맞게 선택하세요</p>

      <div className="flex gap-6 flex-wrap justify-center">
        {/* 무료 */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-72">
          <h2 className="text-xl font-bold mb-1">Free</h2>
          <p className="text-4xl font-bold mb-6">$0</p>
          <ul className="space-y-3 text-sm text-gray-400 mb-8">
            <li>✓ 활성 캐릭터 1명</li>
            <li>✓ 무제한 턴 플레이</li>
            <li>✓ 하드코어 모드</li>
            <li>✓ 자동 저장</li>
          </ul>
          {user?.plan === 'free' && (
            <div className="text-center text-sm text-emerald-400 border border-emerald-500/30 rounded-lg py-2">현재 플랜</div>
          )}
        </div>

        {/* 유료 */}
        <div className="bg-gray-900 border border-emerald-500/40 rounded-2xl p-8 w-72 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full">추천</div>
          <h2 className="text-xl font-bold mb-1">Adventurer</h2>
          <p className="text-4xl font-bold mb-1">$9</p>
          <p className="text-gray-500 text-sm mb-6">1회 결제</p>
          <ul className="space-y-3 text-sm text-gray-400 mb-8">
            <li>✓ 활성 캐릭터 <strong className="text-white">무제한</strong></li>
            <li>✓ 무제한 턴 플레이</li>
            <li>✓ 하드코어 모드</li>
            <li>✓ 자동 저장</li>
            <li>✓ 우선 AI 응답</li>
          </ul>
          {user?.plan === 'paid' ? (
            <div className="text-center text-sm text-emerald-400 border border-emerald-500/30 rounded-lg py-2">현재 플랜 ✓</div>
          ) : (
            <button onClick={handleCheckout} disabled={loading}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 disabled:opacity-50 transition">
              {loading ? '이동 중...' : '지금 구매하기 →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add ai-dungeon-rpg/frontend/src/pages/Pricing.jsx
git commit -m "feat(rpg): pricing page — free vs adventurer plans"
```

---

## Task 14: Railway + Vercel 배포

**Files:**
- Create: `backend/Dockerfile`
- Create: `frontend/vercel.json`
- Create: `frontend/.env.production`

- [ ] **Step 1: `backend/Dockerfile` 작성**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install uv
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev
COPY . .
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Railway 배포 — 백엔드**

  1. [railway.app](https://railway.app) 에서 New Project → Deploy from GitHub
  2. `ai-dungeon-rpg/backend` 폴더 선택
  3. PostgreSQL 플러그인 추가 → `DATABASE_URL` 자동 설정
  4. Variables 탭에서 환경변수 추가:
     - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_REDIRECT_URI` = `https://your-app.up.railway.app/api/v1/auth/callback`
     - `FRONTEND_URL` = `https://your-app.vercel.app`
     - `ANTHROPIC_API_KEY`, `SECRET_KEY`
     - `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`, `POLAR_WEBHOOK_SECRET`

- [ ] **Step 3: `frontend/vercel.json` 작성**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 4: `frontend/.env.production` 작성**

```bash
VITE_API_URL=https://your-app.up.railway.app/api/v1
```

- [ ] **Step 5: Vercel 배포 — 프론트엔드**

  1. [vercel.com](https://vercel.com) → New Project → Import from GitHub
  2. `ai-dungeon-rpg/frontend` 폴더 선택
  3. Environment Variables: `VITE_API_URL` = Railway URL

- [ ] **Step 6: Google OAuth 리다이렉트 URI 업데이트**

  Google Cloud Console → OAuth 2.0 → Authorized redirect URIs에 추가:
  ```
  https://your-app.up.railway.app/api/v1/auth/callback
  ```

- [ ] **Step 7: E2E 테스트**

  1. Vercel URL 접속 → Google 로그인
  2. 새 게임 생성 → 게임 플레이 (3턴 이상)
  3. 페이지 새로고침 후 게임 재개 확인
  4. `/pricing` → Polar.sh 결제 흐름 확인 (테스트 카드 사용)

- [ ] **Step 8: Final Commit**

```bash
git add ai-dungeon-rpg/
git commit -m "feat(rpg): deployment config — Railway Dockerfile + Vercel config"
```

---

## 전체 테스트 실행

```bash
# 백엔드 전체 테스트
cd C:\Users\USER\AIandMLcourse\ai-dungeon-rpg\backend
uv run pytest tests/ -v

# 프론트엔드 빌드 확인
cd ..\frontend
npm run build
```

Expected:
- 백엔드: 모든 테스트 PASSED
- 프론트엔드: `dist/` 폴더 생성, 빌드 오류 없음