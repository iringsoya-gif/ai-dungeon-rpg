# AI Dungeon RPG — Design Spec

**날짜**: 2026-04-20  
**작성자**: Suria  
**상태**: 확정

---

## 결정 사항 요약

| 항목 | 결정 |
|------|------|
| 프로젝트 위치 | `AIandMLcourse/ai-dungeon-rpg/` (독립 프로젝트) |
| DB | PostgreSQL (로컬 + Railway PostgreSQL 플러그인) |
| 백엔드 배포 | Railway (FastAPI 모놀리식) |
| 프론트엔드 배포 | Vercel (React + Vite + Tailwind) |
| 캐릭터 사망 | 게임 시작 시 플레이어 선택 (하드코어 모드 ON/OFF) |
| 컨텍스트 압축 | 토큰 기반 (8,000 토큰 임계값) |
| 스트리밍 | SSE (Server-Sent Events) |
| 인증 | Google OAuth 2.0 + JWT |
| 결제 | Polar.sh |
| AI 모델 | claude-sonnet-4-6 |

---

## 1. 아키텍처

```
AIandMLcourse/
└── ai-dungeon-rpg/
    ├── backend/
    │   ├── app/
    │   │   ├── api/routes/     # auth.py, game.py, character.py, payment.py
    │   │   ├── core/           # config.py, database.py, security.py
    │   │   ├── models/         # user.py, game.py, character.py, history.py
    │   │   ├── services/       # ai_gm.py, context_manager.py, state_manager.py
    │   │   └── main.py
    │   ├── pyproject.toml
    │   └── .env
    └── frontend/
        ├── src/
        │   ├── pages/          # Landing, Dashboard, NewGame, Game, Pricing
        │   ├── components/     # game/, ui/, auth/
        │   ├── hooks/          # useGame.js, useStream.js, useAuth.js
        │   └── store/          # authStore.js, gameStore.js
        ├── package.json
        └── .env
```

**배포 흐름:**
```
플레이어 → Vercel (React) → Railway (FastAPI + PostgreSQL) → Anthropic API
                                                           → Polar.sh
```

---

## 2. DB 스키마 (PostgreSQL)

```sql
users:    id(UUID), email, name, picture, google_id, plan(free/paid), created_at

games:    id(UUID), user_id, title, world_json, character_json,
          summary, turn_count, hardcore_mode(bool),
          status(active/dead/completed), created_at, last_played

histories: id(UUID), game_id, turn, role(player/gm),
           content, state_diff_json, token_count, created_at

payments: id(UUID), user_id, polar_order_id, status(paid/refunded), created_at
```

**제한:**
- free: active 게임 1개
- paid: 무제한

---

## 3. AI GM 시스템

**시스템 프롬프트 구조:**
```
[세계관 설명] + [현재 캐릭터 상태] + [하드코어 모드 여부] + [응답 형식 규칙]
```

**토큰 기반 컨텍스트 압축:**
- 전체 history 토큰 합산 → 8,000 초과 시 압축
- Claude로 이전 기록 요약 → games.summary 저장
- 최근 10턴만 실제 메시지로 포함

**AI 응답 JSON 구조:**
```json
{
  "state_changes": { "hp_change": -10, "inventory_add": ["용의 비늘"] },
  "world_changes": { "location": "용의 동굴 입구" },
  "game_over": false
}
```

**하드코어 모드:**
- `game_over: true` → `games.status = 'dead'`
- 일반 모드: hp=0 → 패널티 적용 후 계속

---

## 4. 프론트엔드

**페이지:**
- `/` — 랜딩
- `/dashboard` — 캐릭터 목록
- `/new-game` — 세계관 + 캐릭터 생성
- `/game/:id` — 메인 게임 화면
- `/pricing` — 요금제

**메인 게임 화면:**
```
┌─────────────────────────────┬──────────────────┐
│  스토리 출력 (SSE 타이핑)    │  HP / MP         │
│                             │  인벤토리         │
│  > 플레이어 입력             │  퀘스트           │
│  < GM 응답                  │  현재 위치         │
├─────────────────────────────┴──────────────────┤
│  [자유 텍스트 입력창          ] [전송 ↵]          │
└─────────────────────────────────────────────────┘
```

---

## 5. 구현 페이즈

| 페이즈 | 내용 | 예상 기간 |
|--------|------|-----------|
| Phase 1 | PostgreSQL + 인증 + React 기반 세팅 | 3~4일 |
| Phase 2 | 세계관/캐릭터 생성 + AI GM + SSE | 4~5일 |
| Phase 3 | 토큰 압축 + 상태 파싱 + 패널 UI | 3~4일 |
| Phase 4 | Polar.sh 결제 + 슬롯 제한 + 하드코어 | 2~3일 |
| Phase 5 | Railway + Vercel 배포 | 2일 |

**총 예상: 14~18일**