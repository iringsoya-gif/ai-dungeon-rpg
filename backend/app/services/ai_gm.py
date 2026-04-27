import json
from anthropic import Anthropic, AsyncAnthropic
from app.core.config import ANTHROPIC_API_KEY
from app.services.context_manager import context_mgr, estimate_tokens
from app.services.state_manager import parse_state_changes, apply_state_changes, apply_death_penalty

client       = Anthropic(api_key=ANTHROPIC_API_KEY)
async_client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

HARDCORE_ON_INST  = "- 하드코어 모드: HP가 0이 되면 반드시 game_over를 true로 설정하세요."
HARDCORE_OFF_INST = "- 일반 모드: HP가 0이 되면 game_over는 false를 유지하세요. 패널티는 서버가 처리합니다."

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
    """
    system   = build_system_prompt(game)
    messages = context_mgr.build_context(game, histories)
    messages.append({"role": "user", "content": player_input})

    full_response = ""

    async with async_client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            full_response += text
            yield ("text", text)

    state_changes = parse_state_changes(full_response)
    token_count   = estimate_tokens(full_response)

    yield ("done", {
        "full_response": full_response,
        "state_changes": state_changes,
        "token_count":   token_count,
    })


OPENING_PROMPT = """당신은 텍스트 어드벤처 RPG의 게임마스터입니다.
아래 세계관과 캐릭터를 바탕으로 게임 시작 오프닝 내러티브를 2~3문단으로 작성하세요.
플레이어를 2인칭(당신)으로 지칭하고, 분위기 있고 몰입감 있게 작성하세요.
JSON 블록은 포함하지 마세요.

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
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
    except Exception:
        return (
            f"당신은 {character_name}입니다. {character_class} 출신의 용사로, "
            f"{character_background}\n\n"
            f"낯선 땅에 발을 내딛는 순간, 운명의 바퀴가 돌기 시작합니다. "
            f"무엇을 하시겠습니까?"
        )
