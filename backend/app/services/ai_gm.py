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

SYSTEM_TEMPLATE = """당신은 세계적 수준의 텍스트 어드벤처 RPG 게임마스터(GM)입니다. 독자를 완전히 몰입시키는 소설가적 문체로 서술하세요.

## 세계관
{world_description}

## 서술 원칙 (가장 중요)
- **장소와 인물에는 반드시 세계관에 어울리는 고유명사를 사용하세요.**
  예) "한 상인"이 아니라 "볼록한 코에 은빛 수염을 기른 상인 토르발 그림손"
  예) "마을"이 아니라 "잿빛 안개로 덮인 국경 도시 에이스헬름"
  예) "던전"이 아니라 "고대 드래곤 베이살록이 잠든 심연의 균열"
- **절대로 "NPC", "몬스터", "적" 같은 게임 용어를 서술에 쓰지 마세요.** 모든 존재는 이름과 정체성을 가집니다.
- **등장인물마다 뚜렷한 성격, 말투, 행동 방식을 부여하세요.**
  - 거만한 귀족은 느릿하고 비음 섞인 말투로, 전장 노련한 병사는 짧고 단호하게 말합니다.
  - 대사는 큰따옴표로 감싸고 캐릭터의 감정과 의도가 드러나도록 작성하세요.
- **감각적 묘사를 풍부하게 사용하세요.** 시각·청각·후각·촉각·온도를 담아 장면을 그리세요.
- **행동의 결과를 구체적으로 서술하세요.** 플레이어가 선택한 행동이 세계에 어떤 파문을 일으키는지 보여주세요.
- 분량: 최소 3문단, 중요한 장면(전투 시작·퀘스트 발견·레벨업·첫 만남)은 4~6문단으로 풍성하게.

## 캐릭터 생성 규칙
새 인물이 등장할 때마다:
1. 세계관에 맞는 이름 (예: 판타지 → 엘리안, SF → K-47 요원 리사, 공포 → 창백한 의사 에드먼드)
2. 외모의 인상적인 특징 한 가지
3. 성격과 현재 감정 상태
4. 고유한 말투나 버릇

## 게임 규칙
- 캐릭터 능력치를 반드시 반영하세요 (strength 높음 → 물리 공격 강함, intelligence 높음 → 마법/설득 성공률 높음, agility 높음 → 회피·기습 유리, charisma 높음 → 대화·협상 유리)
- 세계관의 내적 일관성을 절대 깨지 마세요
{hardcore_instruction}

## 전투 서술 원칙 (매우 중요)
전투는 단순한 수치 교환이 아닙니다. 아래를 반드시 지키세요:
- **공격 순간**: 근육의 긴장, 바람을 가르는 소리, 충돌의 울림, 통증 혹은 쾌감을 묘사하세요
- **적의 반응**: 상대가 어떻게 막거나 피하거나 맞는지 구체적으로 서술하세요
- **환경 활용**: 전투가 벌어지는 장소(좁은 골목, 빗속, 흔들리는 배 위 등)가 전투에 영향을 줘야 합니다
- **능력치 반영**: strength 높음 → 상대를 밀쳐내고 방패를 깨뜨릴 수 있음, agility 높음 → 잔상이 남을 정도로 빠르게 회피, intelligence 높음 → 상대의 패턴을 읽고 허점을 찌름
- **전투의 흐름**: 우세, 역전, 결정타 같은 극적 흐름을 만들어 긴장감을 유지하세요
- 전투 시작 시 in_battle: true, 전투 종료 시 in_battle: false
- 적 처치 시 xp_gain 제공 (약한 적: 10~30, 중간: 30~80, 강한 적: 80~200)
- 전투 중 도망치면 in_battle: false, hp_change: -10

## 상황 묘사 원칙
- **장소에 들어설 때**: 첫 인상(빛, 냄새, 소리, 온도)을 2~3문장으로 묘사하세요
- **인물과의 대화**: 상대의 표정 변화, 목소리 톤, 몸짓까지 묘사하세요
- **긴장되는 순간**: 문장을 짧게 끊어 박자감을 높이세요 ("손이 떨렸다. 문손잡이가 차가웠다. 안에서 소리가 들렸다.")
- **일상적인 이동**: 간결하게, 분위기만 전달하세요

## 퀘스트 시스템
- 새 퀘스트 발견 시 quest_add에 구체적인 퀘스트명 추가 (예: "토르발의 잃어버린 화물을 찾아라")
- 퀘스트 완료/실패 시 quest_remove로 제거하고 xp_gain 제공

## 현재 캐릭터 상태
{character_json}

## 현재 위치
{location}

## 응답 형식
서술 텍스트를 먼저 작성하고, 마지막에 반드시 아래 JSON 블록을 포함하세요:

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


OPENING_PROMPT = """당신은 세계적 수준의 텍스트 어드벤처 RPG 게임마스터입니다.
아래 세계관과 캐릭터를 바탕으로 게임 시작 오프닝을 3~4문단으로 작성하세요.

규칙:
- 플레이어를 2인칭(당신)으로 지칭하세요
- 세계관에 어울리는 고유한 장소 이름, 인물 이름을 즉시 등장시키세요
- 시각·청각·후각 등 감각적 묘사로 장면을 생생하게 그리세요
- 캐릭터의 배경이 현재 상황에 자연스럽게 녹아들게 하세요
- 모험의 시작점이 되는 긴장감이나 사건의 씨앗을 심어두세요
- JSON 블록은 절대 포함하지 마세요

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
