# ⚔ AI Dungeon RPG

> AI 게임마스터가 실시간으로 서사를 생성하는 한국어 인터랙티브 웹소설 RPG 서비스

**라이브 서비스**: https://ai-dungeon-rpg.vercel.app  
**GitHub**: https://github.com/iringsoya-gif/ai-dungeon-rpg

---

## 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [시스템 아키텍처](#시스템-아키텍처)
4. [주요 기능](#주요-기능)
5. [AI 게임마스터 동작 원리](#ai-게임마스터-동작-원리)
6. [Phase 2 — UX·AI 개선](#phase-2--uxai-개선)
7. [기존 AI 챗봇과의 비교](#기존-ai-챗봇과의-비교)
8. [로컬 개발 환경 설정](#로컬-개발-환경-설정)
9. [배포](#배포)

---

## 프로젝트 개요

ChatGPT나 Claude로 RPG를 즐기려 하면 매번 캐릭터 상태(HP, 인벤토리, 퀘스트)를 직접 설명해야 하고, 대화가 길어지면 맥락을 잃어버리는 문제가 있습니다.

**AI Dungeon RPG**는 이 문제를 해결하기 위해 만든 서비스입니다:

- **AI 게임마스터(GM)**: LLaMA 3.3 70B가 한국 웹소설 문체로 서사를 실시간 스트리밍 생성
- **자동 상태 추적**: HP·MP·XP·인벤토리·퀘스트를 서버가 자동으로 관리·갱신
- **지속 저장**: SQLite DB에 영구 저장, 언제든 이어서 플레이
- **장면 반응 BGM**: 전투/탐험/게임오버에 따라 Web Audio API로 앰비언트 음악 자동 전환
- **모험 갤러리**: 완료된 모험을 공유하고 다른 플레이어의 이야기를 감상

---

## 기술 스택

### Frontend
| 기술 | 용도 |
|------|------|
| React 18 + Vite | UI 프레임워크 |
| Zustand | 전역 상태 관리 (authStore, gameStore) |
| React Router v6 | 클라이언트 라우팅 |
| Web Audio API | 절차적 BGM + SFX 생성 |
| Fetch + ReadableStream | SSE 스트리밍 수신 |

### Backend
| 기술 | 용도 |
|------|------|
| FastAPI | REST API 서버 (비동기 SSE 스트리밍) |
| SQLAlchemy + Alembic | ORM + DB 마이그레이션 |
| SQLite | 데이터베이스 (pool_pre_ping 활성화) |
| Groq SDK | AI 모델 API 클라이언트 |
| Google OAuth 2.0 | 소셜 로그인 |
| Polar.sh | 결제 처리 (웹훅 + 직접 검증) |
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
    │      ├─ useStream: SSE 실시간 수신 + HttpError 재시도 로직
    │      └─ useBGM: Web Audio API BGM + SFX
    │
    │  HTTP / SSE
    │
    ├─ FastAPI 서버 (Railway + Docker)
    │      ├─ GET  /api/games           - 게임 목록
    │      ├─ POST /api/games/{id}/action - SSE 스트리밍 (GM 응답)
    │      ├─ GET  /api/games/public    - 공개 모험 갤러리 (인증 불필요)
    │      ├─ GET  /api/games/{id}/story - 모험 전체 기록 (공유용)
    │      ├─ POST /api/games/{id}/summary - GM 요약 생성
    │      ├─ GET  /api/auth/me         - 내 정보
    │      └─ POST /api/payment/*       - Polar.sh 결제
    │
    ├─ SQLite DB
    │      ├─ users
    │      ├─ games (world_json, character_json, summary, title, status)
    │      └─ histories (turn, role, content, token_count)
    │
    └─ Groq API (외부)
           └─ llama-3.3-70b-versatile (GM + 오프닝)
```

---

## 주요 기능

### 1. 세계관 & 캐릭터 생성

**세계관 템플릿** (5종):
- 판타지 / SF / 공포 / 현대 / 커스텀
- 각 템플릿별 3개 세계관 프리셋 빠른 선택 가능

**직업 시스템** (20종 프리셋 + 커스텀):
- 판타지: 전사, 마법사, 도적, 성직자, 궁수
- SF: 전투병, 해커, 의무관, 정찰병, 엔지니어
- 공포: 탐정, 오컬티스트, 생존자, 의사, 저널리스트
- 현대: 군인, 형사, 사이버해커, 특수요원, 의사

**클래스별 배경 스토리 프리셋**: 각 직업별 2개 예시 스토리 칩 제공

**캐릭터 스탯**:
```json
{
  "level": 1, "xp": 0, "xp_to_next": 100,
  "stats": {
    "hp": 120, "max_hp": 120,
    "mp": 40,  "max_mp": 40,
    "strength": 16, "intelligence": 6, "agility": 8, "charisma": 8
  },
  "inventory": ["기본 무기", "포션 1개"],
  "quests": [],
  "npcs": [],
  "visited_locations": [],
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
| HP/MP 관리 | GM이 전투 결과에 따라 hp_change 지정, 서버가 0 클램핑 |
| 레벨업 | XP 누적 → 레벨업 시 전 스탯 자동 증가, 요구 XP ×1.5 |
| 퀘스트 | quest_add/quest_remove로 실시간 추적, 이름+목표 저장 |
| NPC | npc_add로 이름·태도·설명 누적, GM 프롬프트에 항상 포함 |
| 방문 장소 | visited_locations 누적, 지도 탭에서 확인 가능 |
| 상태 이상 | status_effects_add/remove 지원 |
| 하드코어 모드 | HP=0 시 game.status = "dead" 영구 종료 |
| 일반 모드 | 사망 패널티: HP ½ 회복 + 랜덤 아이템 1개 손실 |
| 결제 플랜 | 무료(활성 게임 1개) / 영웅 $9 일회결제(무제한) |

### 4. 컨텍스트 관리

- **토큰 추적**: 각 히스토리 항목의 토큰 수를 저장 (`token_count or 0` 방어 처리)
- **자동 압축**: 8,000 토큰 초과 시 LLaMA로 요약 생성
- **슬라이딩 윈도우**: 최근 10턴 + 이전 요약만 모델에 전달
- **오프닝 보존**: `[게임 시작]` 마커로 첫 장면 컨텍스트 유지

### 5. Web Audio API BGM & SFX

외부 음원 없이 브라우저에서 앰비언트 사운드를 실시간 생성:

| 모드 | 화음 | 분위기 |
|------|------|--------|
| 탐험 (calm) | A단조 (110·131·165 Hz) | 조용하고 신비로운 |
| 전투 (battle) | E단조 (165·196·247 Hz) | 긴박하고 강렬한 |
| 게임오버 | D단조 (73·87·98 Hz) | 낮고 처연한 |

**SFX 이벤트** (즉각적인 효과음):

| 타입 | 트리거 | 파형 |
|------|--------|------|
| combat | 전투 돌입 | 톱니파 metallic |
| levelup | 레벨업 알림 | 사인파 arpeggio |
| item | 인벤토리 증가 | 부드러운 chime |
| error | 스트리밍 오류 | 하강 사인파 |

---

## AI 게임마스터 동작 원리

### 시스템 프롬프트 구조

```
1. 언어 규칙 (최우선) — 한국어 전용, 한자/일본어 금지, 틀린 예시 명시
2. 장면 연속성 규칙 — 직전 장면에서 이어받기
3. 세계관 설명 (동적 삽입)
4. 웹소설 문체 규칙 + 나쁜 예/좋은 예 Few-shot
5. 플레이어 입력 해석 규칙 (**행동** vs 대사)
6. 전투 묘사 규칙
7. 현재 캐릭터 JSON (동적) — 레벨·HP·인벤토리·퀘스트 포함
8. 인벤토리·퀘스트 일관성 규칙 (GM이 직접 참조)
9. NPC 일관성 규칙 (등록된 NPC 태도 유지)
10. 현재 위치 (동적)
11. 출력 형식 (JSON 구조 명시)
```

### XP 가이드라인 (GM 지침)

| 행동 유형 | XP 범위 |
|----------|---------|
| 탐색·대화 | 0 ~ 5 |
| 소규모 전투 | 15 ~ 35 |
| 중간 전투 | 40 ~ 70 |
| 강적·보스 | 80 ~ 150 |

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
    ├─ NPC add
    ├─ 위치, 전투 상태 갱신
    └─ 하드코어: HP=0 → game.status = "dead"
    │
    ▼
game.character_json 업데이트 → DB 저장
```

---

## Phase 2 — UX·AI 개선

Phase 2에서 추가된 주요 개선사항입니다.

### 프론트엔드 UX

| 기능 | 설명 |
|------|------|
| **타이프라이터 효과** | `requestAnimationFrame` 기반 StreamText — 3글자/프레임, 리렌더 없이 부드럽게 흐름 |
| **스탯 플래시 애니메이션** | HP/MP/XP 변화 시 녹색(상승)/빨간색(하락) 글로우 애니메이션 (CSS keyframes) |
| **4탭 StatusPanel** | 상태 / 퀘스트 / NPC / 지도 탭 — 퀘스트·NPC 수 뱃지 표시 |
| **MarkdownText** | GM 서술에서 `**굵게**` → 금색, `*기울임*` → 금색 이탤릭 하이라이트 |
| **키보드 단축키** | `Esc`로 캐릭터 시트·사이드바·요약 모달 닫기 |
| **스토리 내보내기** | 게임 중 ↓ 버튼으로 전체 대화 .txt 다운로드 |
| **Dashboard 정렬/필터** | 최신순·턴 많은 순·레벨 높은 순 정렬 + 전체/진행중/완료/사망 필터 |
| **배경 스토리 프리셋** | 캐릭터 생성 시 클래스별 2개 예시 배경 스토리 칩 제공 |
| **모험 갤러리** | `/stories` 페이지 — 공개 완료 게임 카드 그리드, 장르 필터 |

### AI·백엔드 개선

| 기능 | 설명 |
|------|------|
| **GM 프롬프트 강화** | 인벤토리·퀘스트 현재 상태 섹션 명시적 삽입 → 일관성 향상 |
| **NPC 일관성 규칙** | 등록된 NPC의 태도·성격을 GM이 항상 참조하도록 지침 추가 |
| **XP 가이드 수치화** | 행동 유형별 XP 범위 명시 → GM의 XP 인플레이션 방지 |
| **공개 스토리 API** | `GET /games/public` — 인증 없이 완료/사망 게임 목록 반환 |
| **HttpError 재시도 로직** | 4xx 에러는 재시도 안 함 (기존: 문자열 파싱 방식) |
| **SQLite 안정성** | `pool_pre_ping=True` + `check_same_thread=False` 추가 |
| **CORS 보안** | `localhost`는 FRONTEND_URL에 포함될 때만 허용 |
| **token_count None 방어** | `sum((h.token_count or 0) for h)` — None 시 TypeError 방지 |

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
| 장면 반응 BGM + SFX | 없음 | Web Audio API |
| 모험 기록 공유 | 없음 | 공개 링크 + 갤러리 |
| 결제/플랜 | 별도 구독 | 서비스 내 Polar.sh 통합 |

---

## 로컬 개발 환경 설정

### Backend

```bash
cd backend
cp .env.example .env
# .env에 GROQ_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 입력

uv sync
uv run fastapi dev app/main.py
# http://localhost:8000
```

### Frontend

```bash
cd frontend
cp .env.example .env
# .env에 VITE_API_URL=http://localhost:8000/api/v1 입력

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
DATABASE_URL=sqlite:///./dungeon.db
```

---

## 프로젝트 구조

```
ai-dungeon-rpg/
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── game.py       # 게임 CRUD + SSE 스트리밍 + 공개 갤러리
│   │   │   ├── auth.py       # Google OAuth + JWT
│   │   │   └── payment.py    # Polar.sh 결제
│   │   ├── core/             # config, database, security
│   │   ├── models/           # User, Game, History, Payment
│   │   └── services/
│   │       ├── ai_gm.py          # LLM 호출 & 시스템 프롬프트
│   │       ├── context_manager.py # 토큰 추적 & 자동 압축
│   │       ├── state_manager.py  # 상태 변화 파싱 & 적용
│   │       └── text_sanitizer.py # 외국어 문자 제거
│   └── tests/
├── frontend/
│   └── src/
│       ├── hooks/
│       │   ├── useStream.js  # SSE 수신 + HttpError 재시도 로직
│       │   └── useBGM.js     # Web Audio API BGM + SFX
│       ├── pages/
│       │   ├── Landing.jsx   # 랜딩 (타이프라이터 데모 + 갤러리 링크)
│       │   ├── Dashboard.jsx # 내 모험 목록 (정렬/필터)
│       │   ├── Game.jsx      # 게임 화면 (MarkdownText + SFX 트리거)
│       │   ├── NewGame.jsx   # 새 게임 생성 (배경 스토리 프리셋)
│       │   ├── Stories.jsx   # 공개 모험 갤러리
│       │   └── Story.jsx     # 공유 스토리 뷰어
│       ├── components/
│       │   ├── game/
│       │   │   ├── StatusPanel.jsx    # 4탭 패널 (상태/퀘스트/NPC/지도)
│       │   │   └── CharacterSheet.jsx # 캐릭터 시트 팝업
│       │   └── ui/
│       │       ├── StreamText.jsx  # 타이프라이터 효과
│       │       └── ConfirmModal.jsx
│       └── store/            # Zustand (authStore, gameStore)
└── presentation/
    ├── generate_ppt.py
    └── AI_Dungeon_RPG_Presentation.pptx
```

---

*202212577 박성안 — 부산대학교 물리학과*
