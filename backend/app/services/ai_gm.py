import json
from groq import Groq, AsyncGroq
from app.core.config import GROQ_API_KEY
from app.services.context_manager import context_mgr, estimate_tokens
from app.services.state_manager import parse_state_changes, apply_state_changes, apply_death_penalty

client       = Groq(api_key=GROQ_API_KEY)
async_client = AsyncGroq(api_key=GROQ_API_KEY)

GM_MODEL      = "llama-3.3-70b-versatile"
OPENING_MODEL = "llama-3.1-8b-instant"

HARDCORE_ON_INST  = "- 하드코어 모드: HP가 0이 되면 반드시 game_over를 true로 설정하세요."
HARDCORE_OFF_INST = "- 일반 모드: HP가 0이 되면 game_over는 false를 유지하세요. 패널티는 서버가 처리합니다."

SYSTEM_TEMPLATE = """당신은 인기 한국 웹소설 작가이자 RPG 게임마스터입니다.
플레이어의 행동을 받아 웹소설처럼 재미있고 자연스럽게 이야기를 이어가세요.

## 세계관
{world_description}

## 문체 — 이것이 가장 중요합니다
한국 웹소설 특유의 문체로 쓰세요. 아래 예시를 참고하세요.

나쁜 예 (딱딱하고 고어함):
"당신은 검을 들고 적에게 돌진하였다. 상대방은 방어 자세를 취하며 당신의 공격을 막아냈다."

좋은 예 (웹소설 스타일):
"검을 꽉 쥐었다.
발이 땅을 박찼다. 순식간에 좁혀지는 거리.
상대가 반응했지만 — 늦었다.
칼날이 방패 모서리를 타고 튕겨나가며 불꽃을 튀겼다."

핵심 규칙:
- 문장을 짧게 끊어 리듬감을 살리세요. 긴 문장과 짧은 문장을 섞으세요.
- 감정을 직접적으로 써도 됩니다. ("심장이 쿵 내려앉았다", "등골이 서늘해졌다", "피가 끓어올랐다")
- 대화는 캐릭터 성격이 드러나도록 자연스럽게. 큰따옴표 사용.
- 모든 장소·인물에 세계관에 맞는 고유한 이름을 붙이세요. "한 상인"이 아니라 "수염이 덥수룩한 중년 상인 카르도"처럼.
- "NPC", "몬스터", "스탯" 같은 게임 용어는 절대 쓰지 마세요.
- 플레이어를 "당신"으로 지칭하세요.
- 분량: 3~5문단. 전투·중요 장면은 더 길게.

## 전투
빠르고 박진감 있게. 주먹이 날아가는 소리, 바람을 가르는 검, 마법이 터지는 충격파.
능력치 반영: strength 높으면 압도적인 힘으로, agility 높으면 눈에 안 보이는 속도로, intelligence 높으면 허점을 꿰뚫는 판단력으로.
역전과 위기를 만들어 긴장감을 유지하세요.
{hardcore_instruction}

## 게임 시스템 (내부 처리)
- 전투 시작: in_battle true / 끝: false
- 적 처치 xp: 약한 적 10~30 / 중간 30~80 / 강한 적 80~200
- 새 퀘스트: quest_add에 추가 / 완료: quest_remove + xp
- 도망: in_battle false, hp_change -10

## 현재 캐릭터
{character_json}

## 위치
{location}

## 출력 형식
이야기를 먼저 쓰고, 마지막에 JSON 블록을 붙이세요:

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


def build_system_prompt(game) -> str:
    world     = json.loads(game.world_json)
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
    SSE 제너레이터.
    - ("text", chunk_str) 를 스트리밍 중 yield
    - ("done", {...})  를 완료 시 yield
    - ("error", str)   를 오류 시 yield
    """
    system   = build_system_prompt(game)
    messages = context_mgr.build_context(game, histories)
    messages.append({"role": "user", "content": player_input})

    # Groq/OpenAI 형식: system은 messages 배열 첫 번째 항목으로
    groq_messages = [{"role": "system", "content": system}] + messages

    full_response = ""

    try:
        stream = await async_client.chat.completions.create(
            model=GM_MODEL,
            messages=groq_messages,
            max_tokens=1024,
            stream=True,
        )
        async for chunk in stream:
            text = chunk.choices[0].delta.content or ""
            if text:
                full_response += text
                yield ("text", text)
    except Exception as e:
        yield ("error", str(e))
        return

    state_changes = parse_state_changes(full_response)
    token_count   = estimate_tokens(full_response)

    yield ("done", {
        "full_response": full_response,
        "state_changes": state_changes,
        "token_count":   token_count,
    })


OPENING_PROMPT = """당신은 인기 한국 웹소설 작가입니다.
아래 정보로 RPG 게임의 오프닝을 웹소설 스타일로 3~4문단 작성하세요.

스타일: 짧고 리드미컬한 문장, 감각적 묘사, 자연스러운 감정 표현.
- 플레이어를 "당신"으로 지칭
- 세계관에 맞는 고유한 장소 이름과 인물이 바로 등장
- 모험의 씨앗이 될 사건이나 긴장감을 심어두세요
- JSON 없이 이야기만 작성

세계관: {world_description}
캐릭터: {character_name} ({character_class}), 배경: {character_background}
"""


def generate_opening(world_description: str, character_name: str, character_class: str, character_background: str) -> str:
    try:
        prompt = OPENING_PROMPT.format(
            world_description=world_description,
            character_name=character_name,
            character_class=character_class,
            character_background=character_background,
        )
        response = client.chat.completions.create(
            model=OPENING_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content
    except Exception:
        return (
            f"당신은 {character_name}입니다. {character_class} 출신의 용사로, "
            f"{character_background}\n\n"
            f"낯선 땅에 발을 내딛는 순간, 운명의 바퀴가 돌기 시작합니다. "
            f"무엇을 하시겠습니까?"
        )
