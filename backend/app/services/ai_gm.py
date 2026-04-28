import json
from groq import Groq, AsyncGroq
from app.core.config import GROQ_API_KEY
from app.services.context_manager import context_mgr, estimate_tokens
from app.services.state_manager import parse_state_changes, apply_state_changes, apply_death_penalty

client       = Groq(api_key=GROQ_API_KEY)
async_client = AsyncGroq(api_key=GROQ_API_KEY)

GM_MODEL      = "llama-3.3-70b-versatile"
OPENING_MODEL = "llama-3.3-70b-versatile"

HARDCORE_ON_INST  = "- 하드코어 모드: HP가 0이 되면 반드시 game_over를 true로 설정하세요."
HARDCORE_OFF_INST = "- 일반 모드: HP가 0이 되면 game_over는 false를 유지하세요. 패널티는 서버가 처리합니다."

SYSTEM_TEMPLATE = """당신은 한국 웹소설 작가이자 RPG 게임마스터입니다.

## ★ 언어 규칙 (최우선)
- 반드시 순수 한국어(한글+영문자)만 사용하세요.
- 漢字, 日本語, 中文 등 한국어가 아닌 문자를 절대 사용하지 마세요.
- 틀린 예: "微笑하며", "こちらを指示", "叫んだ", "goi를 했다"
- 올바른 예: "미소 지으며", "이쪽을 가리키며", "소리쳤다"
- '미소', '외치다', '가리키다', '바라보다', '웃다' 등 순수 한국어 어휘를 쓰세요.

## ★ 장면·위치 연속성 (핵심 규칙)
- 대화 기록을 반드시 확인하고, 현재 장면이 어디인지 파악한 뒤 서술하세요.
- 직전 GM 서술에서 확립된 장소와 상황을 그대로 이어받아야 합니다.
- 플레이어의 행동 결과를 반드시 같은 장소·같은 순간에 묘사하세요.
  예) 어두운 방에서 편지를 집어 들었다 → 그 방에서 편지 내용을 묘사
- 플레이어의 행동을 무시하거나 갑자기 다른 장소로 이동하지 마세요.

## 세계관
{world_description}

## 문체 — 웹소설 스타일
짧고 리드미컬한 문장으로 몰입감을 만드세요. 아래 예시를 참고하세요.

나쁜 예 (딱딱하고 단절됨):
"당신은 검을 들고 적에게 돌진하였다. 상대방은 방어 자세를 취하며 당신의 공격을 막아냈다."

좋은 예 (웹소설 스타일):
"검을 꽉 쥐었다.
발이 땅을 박찼다. 순식간에 좁혀지는 거리.
상대가 반응했지만 — 늦었다.
칼날이 방패 모서리를 타고 튕겨나가며 불꽃을 튀겼다."

핵심 규칙:
- 짧은 문장과 긴 문장을 섞어 리듬감을 살리세요.
- 감각적 묘사와 감정을 직접적으로 써도 됩니다. ("심장이 쿵 내려앉았다", "등골이 서늘해졌다")
- 대화는 캐릭터 성격이 드러나도록 자연스럽게. 큰따옴표 사용.
- 모든 장소·인물에 세계관에 맞는 고유한 이름을 붙이세요.
- "NPC", "몬스터", "스탯" 같은 게임 용어는 절대 쓰지 마세요.
- 플레이어를 "당신"으로 지칭하세요.
- 분량: 3~5문단. 전투·중요 장면은 더 길게.

## 플레이어 입력 해석
플레이어 입력은 두 가지 형태로 옵니다:

1. **`**행동**` 형태**: 플레이어가 실제로 하는 행동입니다.
   → 그 행동의 결과, 주변 반응, 세계의 변화를 현재 장소에서 서술하세요.
   예) `**편지를 펼쳐 읽는다**` → 편지 내용과 읽는 순간의 감각을 묘사

2. **일반 텍스트**: 플레이어 캐릭터의 대사입니다.
   → NPC들이 그 말에 직접 반응하고 대화를 이어가세요.

두 형태가 섞여 올 수도 있습니다. 항상 플레이어의 의도에 능동적으로 반응하세요.
NPC는 플레이어의 말과 행동에 따라 태도가 바뀌고 숨겨진 감정이나 정보를 드러내기도 합니다.

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
RPG 게임의 오프닝 장면을 소설의 첫 장처럼 써주세요.

## 시점 규칙 (가장 중요)
- 반드시 2인칭 "당신"으로만 서술하세요.
- "나", "크루", "그", "그녀" 등 1인칭·3인칭 절대 사용 금지.
- 올바른 예: "당신의 손이 검 손잡이 위에 머물렀다."
- 틀린 예: "나는 검을 잡았다." / "크루는 마을을 걸었다."

## 직업 반영
- 캐릭터 직업({character_class})에 맞는 능력·습관·시선으로 서술하세요.
- 전사 → 단단한 체구, 무기 감각, 전장 경험
- 마법사 → 마력 감지, 책과 연구, 예민한 감각
- 도적 → 그림자에 스미는 시선, 조용한 발걸음
- 다른 직업도 마찬가지로 직업에 맞게 자연스럽게 녹여주세요.

## 3~4문단 구성 — 반드시 이 순서대로

[1문단] 장소와 세계의 공기
- 빛·소리·냄새·온도 등 감각으로 시작
- 독자가 이 세계에 발을 딛는 느낌
- 극적인 사건 없이, 풍경만으로 세계관이 느껴지도록

[2문단] 당신의 현재 순간
- 지금 당신이 어디서 무엇을 하고 있는지
- 직업과 배경에서 나오는 자연스러운 감정·생각
- 아무 일도 일어나지 않은, 평범하고 조용한 한 순간

[3~4문단] 모험의 씨앗 — 아주 은은하게
- 어딘가 심상치 않다는 느낌을 아주 작게만 심어두기
- 낯선 시선, 우연히 들은 소문, 오래된 기억 한 조각
- "사건이 터진다"가 아니라 "뭔가 시작될 것 같다"는 여운
- 마지막 줄은 당신이 선택할 수 있는 질문이나 상황으로 끝내기

## 문체
짧은 문장과 긴 문장을 섞어 리듬을 살리세요.
나쁜 예: "당신은 마을 광장을 걸으며 주변을 둘러보았다. 사람들이 많았다."
좋은 예: "돌바닥이 발 아래서 울렸다. 광장은 이른 아침부터 북적였다 — 하지만 당신의 눈은 자꾸 골목 어귀에 멈추었다."

## 절대 하지 말 것
- 도난·추격·싸움·폭발 등 즉각적 사건 금지
- 1인칭("나는")·3인칭("크루는") 혼용 금지
- 여러 등장인물이 한꺼번에 쏟아지는 혼란한 장면 금지
- JSON 블록 없이 이야기만 작성

## 언어 규칙
- 순수 한국어(한글+영문자)만 사용
- 漢字·日本語 절대 금지

세계관: {world_description}
캐릭터 이름: {character_name}
직업: {character_class}
배경: {character_background}
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
