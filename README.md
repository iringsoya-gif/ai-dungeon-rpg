# ⚔ AI Dungeon RPG

> AI 게임마스터가 실시간으로 서사를 생성하는 한국어 인터랙티브 웹소설 RPG 서비스

**라이브 서비스**: https://ai-dungeon-rpg.vercel.app

---

## 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [시스템 아키텍처](#시스템-아키텍처)
4. [주요 기능](#주요-기능)
5. [AI 게임마스터 동작 원리](#ai-게임마스터-동작-원리)
6. [기존 AI 챗봇과의 비교](#기존-ai-챗봇과의-비교)
7. [로컬 개발 환경 설정](#로컬-개발-환경-설정)
8. [배포](#배포)

---

## 프로젝트 개요

ChatGPT나 Claude로 RPG를 즐기려 하면 매번 캐릭터 상태(HP, 인벤토리, 퀘스트)를 직접 설명해야 하고, 대화가 길어지면 맥락을 잃어버리는 문제가 있습니다.

**AI Dungeon RPG**는 이 문제를 해결하기 위해 만든 서비스입니다:

- **AI 게임마스터(GM)**: LLaMA 3.3 70B가 한국 웹소설 문체로 서사를 실시간 생성
- **자동 상태 추적**: HP·MP·XP·인벤토리·퀘스트를 서버가 자동으로 관리
- **지속 저장**: DB에 영구 저장, 언제든 이어서 플레이
- **장면 반응 BGM**: 전투/탐험/게임오버에 따라 Web Audio API로 앰비언트 음악 전환

---

## 기술 스택

### Frontend
| 기술 | 용도 |
|------|------|
| React 18 + Vite | UI 프레임워크 |
| Tailwind CSS | 스타일링 |
| Zustand | 전역 상태 관리 |
| React Router v6 | 클라이언트 라우팅 |
| Web Audio API | 절차적 BGM 생성 |
| Fetch + ReadableStream | SSE 스트리밍 수신 |

### Backend
| 기술 | 용도 |
|------|------|
| FastAPI | REST API 서버 |
| SQLAlchemy | ORM |
| SQLite | 데이터베이스 |
| Groq SDK | AI 모델 API 클라이언트 |
| Google OAuth 2.0 | 소셜 로그인 |
| Polar.sh | 결제 처리 |
| Docker | 컨테이너 배포 |

### AI
| 모델 | 용도 |
|------|------|
| LLaMA 3.3 70B (via Groq) | 게임마스터 서사 생성 (스트리밍) |
| LLaMA 3.3 70B (via Groq) | 게임 오프닝 텍스트 생성 |

---

## 시스템 아키텍처

```
사용자 브라우저
    │
    ├─ React SPA (Vercel)
    │      ├─ Zustand: 게임/인증 상태
    │      ├─ useStream: SSE 실시간 수신
    │      └─ useBGM: Web Audio API BGM
    │
    │  HTTP / SSE
    │
    ├─ FastAPI 서버 (Railway + Docker)
    │      ├─ /api/games          - 게임 CRUD
    │      ├─ /api/games/{id}/action  - SSE 스트리밍
    │      ├─ /api/auth           - Google OAuth / JWT
    │      └─ /api/payments       - Polar.sh Webhook
    │
    ├─ SQLite DB
    │      ├─ users
    │      ├─ games (world_json, character_json, summary)
    │      └─ histories (turn-by-turn 대화 기록)
    │
    └─ Groq API (외부)
           ├─ llama-3.3-70b-versatile (GM)
           └─ llama-3.1-8b-instant   (오프닝)
```

---

## 주요 기능

### 1. 세계관 & 캐릭터 생성

**세계관 템플릿** (5종):
- 판타지 / SF / 공포 / 현대 / 커스텀

**직업 시스템** (20종 프리셋 + 커스텀):
- 판타지: 전사, 마법사, 도적, 성직자, 궁수
- SF: 전투병, 해커, 의무관, 정찰병, 엔지니어
- 공포: 탐정, 오컬티스트, 생존자, 의사, 저널리스트
- 현대: 군인, 형사, 사이버해커, 특수요원, 운동선수

**캐릭터 스탯**:
```json
{
  "level": 1,
  "xp": 0,
  "xp_to_next": 100,
  "stats": {
    "hp": 120, "max_hp": 120,
    "mp": 40,  "max_mp": 40,
    "strength": 16, "intelligence": 6,
    "agility": 8,   "charisma": 8
  },
  "inventory": ["기본 무기", "포션 1개"],
  "quests": [],
  "status_effects": []
}
```

### 2. AI 게임마스터 (실시간 스트리밍)

플레이어 입력 형식:
- `**칼을 뽑아 적에게 달려든다**` → 행동 (GM이 결과 서술)
- `"이 마을에서 무슨 일이 있었나요?"` → 대사 (NPC가 반응)

GM 응답은 SSE(Server-Sent Events)로 실시간 스트리밍되며, 응답 마지막에 구조화된 JSON 블록이 포함되어 상태를 자동으로 갱신합니다.

```
이벤트 흐름:
data: {"text": "검을 꽉 쥐었다."}
data: {"text": " 발이 땅을 박찼다."}
...
data: {"done": true, "state": {...}, "character": {...}}
```

### 3. 게임 시스템

| 시스템 | 설명 |
|--------|------|
| HP/MP 관리 | GM이 전투 결과에 따라 hp_change 지정, 서버가 적용 |
| 레벨업 | XP 누적 → 레벨업 시 전 스탯 자동 증가, 요구 XP ×1.5 |
| 퀘스트 | quest_add/quest_remove로 실시간 추적 |
| 상태 이상 | status_effects_add/remove 지원 |
| 하드코어 모드 | HP=0 시 game.status = "dead" 영구 종료 |
| 일반 모드 | 사망 패널티: HP ½ 회복 + 랜덤 아이템 1개 손실 |
| 결제 플랜 | 무료(활성 게임 1개) / 영웅 $9 일회결제(무제한) |
| 플랜 동기화 | Polar 주문 내역 직접 검증 — 웹훅 미도달 시 대시보드 버튼으로 복구 |

### 4. 컨텍스트 관리

- **토큰 추적**: 각 히스토리 항목의 토큰 수를 저장
- **자동 압축**: 8,000 토큰 초과 시 LLaMA 8B로 요약 생성
- **슬라이딩 윈도우**: 최근 10턴 + 이전 요약만 모델에 전달
- **오프닝 보존**: `[게임 시작]` 마커로 첫 장면 컨텍스트 유지

### 5. Web Audio API BGM

외부 음원 없이 브라우저에서 앰비언트 사운드를 실시간 생성:

| 모드 | 화음 | 분위기 |
|------|------|--------|
| 탐험 (calm) | A단조 (110·131·165 Hz) | 조용하고 신비로운 |
| 전투 (battle) | E단조 (165·196·247 Hz) | 긴박하고 강렬한 |
| 게임오버 | D단조 (73·87·98 Hz) | 낮고 처연한 |

게임 상태(`in_battle`, `game_over`)가 바뀔 때 자동 전환, 헤더 ♪ 버튼으로 ON/OFF 토글, 설정은 localStorage 유지.

- LFO 변조 + 절차적 리버브로 공간감 연출
- 모드 전환 시 1.5초 크로스페이드
- 첫 사용자 인터랙션 후 시작 (브라우저 자동재생 정책 대응)
- `TRACKS` 객체에 URL 지정 시 MP3 파일 재생으로 전환 가능

---

## AI 게임마스터 동작 원리

### 시스템 프롬프트 구조

```
1. 언어 규칙 (최우선) — 한국어 전용, 한자/일본어 금지
2. 장면 연속성 규칙 — 직전 장면에서 이어받기
3. 세계관 설명 (동적 삽입)
4. 웹소설 문체 규칙 + 예시
5. 플레이어 입력 해석 규칙
6. 전투 묘사 규칙
7. 현재 캐릭터 JSON (동적)
8. 현재 위치 (동적)
9. 출력 형식 (JSON 구조 명시)
```

### 상태 추출 파이프라인

```
GM 원문 응답
    │
    ▼
parse_state_changes()  ← 정규식으로 ```json 블록 추출
    │
    ▼
apply_state_changes()  ← 캐릭터 JSON에 변화 적용
    │
    ├─ HP/MP 클램핑 (0 이하 방지)
    ├─ 레벨업 체크 (_apply_level_up)
    ├─ 인벤토리 add/remove
    ├─ 퀘스트 add/remove
    └─ 위치, 전투 상태 갱신
    │
    ▼
game.character_json 업데이트 → DB 저장
```

---

## 기존 AI 챗봇과의 비교

| 항목 | ChatGPT / Claude | AI Dungeon RPG |
|------|-----------------|----------------|
| 캐릭터 상태 추적 | 매번 직접 설명 | 자동 저장 & 갱신 |
| HP/MP/XP 계산 | 사용자가 직접 | 서버 자동 처리 |
| 장기 플레이 맥락 | 컨텍스트 초과 시 망각 | 자동 요약 압축 |
| 게임 저장 | 없음 (대화 기록뿐) | DB 영구 저장 |
| 하드코어 모드 | 규칙 합의 필요 | 시스템 수준 보장 |
| 한국 웹소설 문체 | 일반 문어체 | 전용 프롬프트 + Few-shot |
| 장면 반응 BGM | 없음 | Web Audio API |
| 결제/플랜 | 별도 구독 | 서비스 내 Polar.sh 통합 |

---

## 로컬 개발 환경 설정

### Backend

```bash
cd backend
cp .env.example .env
# .env에 GROQ_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 입력

uv sync          # 의존성 설치
uv run fastapi dev app/main.py
# http://localhost:8000
```

### Frontend

```bash
cd frontend
cp .env.example .env
# .env에 VITE_API_URL=http://localhost:8000 입력

npm install
npm run dev
# http://localhost:5173
```

### 테스트

```bash
cd backend
uv run pytest tests/ -v
```

---

## 배포

| 서비스 | 대상 | 방법 |
|--------|------|------|
| Vercel | Frontend | GitHub main 브랜치 push → 자동 배포 |
| Railway | Backend | Dockerfile 기반 자동 빌드 |

### 환경 변수 (Backend)

```
GROQ_API_KEY=gsk_...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
POLAR_WEBHOOK_SECRET=...
SECRET_KEY=...            # JWT 서명용
FRONTEND_URL=https://ai-dungeon-rpg.vercel.app
```

---

## 프로젝트 구조

```
ai-dungeon-rpg/
├── backend/
│   ├── app/
│   │   ├── api/routes/     # game.py, auth.py, payment.py
│   │   ├── core/           # config, database, security
│   │   ├── models/         # User, Game, History, Payment
│   │   └── services/
│   │       ├── ai_gm.py          # LLM 호출 & 시스템 프롬프트
│   │       ├── context_manager.py # 토큰 추적 & 자동 압축
│   │       └── state_manager.py  # 상태 변화 파싱 & 적용
│   └── tests/
├── frontend/
│   └── src/
│       ├── hooks/
│       │   ├── useStream.js  # SSE 수신
│       │   └── useBGM.js     # Web Audio API BGM
│       ├── pages/            # Landing, Dashboard, Game, NewGame ...
│       ├── components/game/  # StatusPanel, CharacterSheet
│       └── store/            # Zustand (authStore, gameStore)
└── docs/
```

---

*202212577 박성안 — 부산대학교 물리학과*
