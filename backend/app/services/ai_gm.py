import json
from groq import Groq, AsyncGroq
from app.core.config import GROQ_API_KEY
from app.services.context_manager import context_mgr, estimate_tokens
from app.services.state_manager import parse_state_changes
from app.services.text_sanitizer import sanitize_korean

client       = Groq(api_key=GROQ_API_KEY)
async_client = AsyncGroq(api_key=GROQ_API_KEY)

GM_MODEL      = "llama-3.3-70b-versatile"
OPENING_MODEL = "llama-3.3-70b-versatile"

HARDCORE_ON_INST  = "- 하드코어 모드: HP가 0이 되면 반드시 game_over를 true로 설정하세요."
HARDCORE_OFF_INST = "- 일반 모드: HP가 0이 되면 game_over는 false를 유지하세요. 패널티는 서버가 처리합니다."


# ─── 장르 감지 ──────────────────────────────────────────────────────────────

_GENRE_KEYWORDS = {
    "fantasy": ["마법", "검", "용", "왕국", "엘프", "드워프", "기사", "성", "중세", "마법사", "마나", "던전"],
    "scifi":   ["우주", "로봇", "사이버", "인공지능", "함선", "행성", "미래", "레이저", "안드로이드", "SF", "sf"],
    "horror":  ["공포", "귀신", "저주", "악마", "살인", "유령", "크리처", "심리", "사이코", "호러"],
}


def _detect_genre(description: str) -> str:
    for genre, keywords in _GENRE_KEYWORDS.items():
        if any(kw in description for kw in keywords):
            return genre
    return "modern"


# ─── 장르별 문체 블록 ────────────────────────────────────────────────────────

_GENRE_STYLE_BLOCKS = {
    "fantasy": """## 장르 톤: 판타지 서사
- 고풍스러운 서사체. 긴 문장(3)과 짧은 문장(1)을 번갈아 리듬감 있게 쓰세요.
- 자연·마법·신화 요소를 감각으로 묘사. ("봉인의 냄새", "마력이 손끝을 타고 퍼졌다")
- NPC 대사: 중세풍 격식체 또는 개성 있는 사투리. NPC마다 반드시 고유한 말투.
- 전투: 칼날의 무게, 마력의 흐름. 절제하되 강렬하게.
- 절대 금지: "HP", "MP", "스탯", "레벨", "아이템" 등 게임 용어를 서술에 쓰지 마세요. JSON에만 허용.""",

    "scifi": """## 장르 톤: SF 스릴러
- 간결하고 건조한 단문. 감정보다 정보와 상황을 직접 전달.
- 기술 용어를 한국어화. ("슈트 바이저에 경고 신호", "산소 잔량 18퍼센트")
- NPC 대사: 군사·기술 전문 어투. 감정을 억누르고 임무에 집중하는 캐릭터.
- 전투: 폭발보다 계산. 속도·포지션·냉정함.
- 침묵·정적·공허함을 적극적으로 활용하세요.""",

    "horror": """## 장르 톤: 공포·심리
- 극단적으로 짧은 문장. 침묵과 여백이 공포를 만듭니다.
- 소리·냄새·촉감·온도 위주 묘사. 눈에 보이지 않는 것을 암시만.
- NPC 대사: 말줄임, 떨리는 목소리, 논리적이지 않은 공포 반응.
- 공포의 실체를 절대 직접 묘사하지 마세요. 독자의 상상력이 정답입니다.
- 각 문단은 공포를 쌓고, 마지막 문장에 반전 또는 충격을 심으세요.""",

    "modern": """## 장르 톤: 현대 액션·드라마
- 자연스러운 일상 구어체. 독자가 이미 아는 공간에서 시작.
- 현대 감각의 비유. ("핸드폰 진동처럼 손이 떨렸다", "형광등이 깜빡였다")
- NPC 대사: 편한 말투, 줄임말, 감정이 드러나는 반응.
- 행동 묘사는 현실적이고 디테일하게. 영화 한 장면처럼 선명하게.""",
}


# ─── 시스템 프롬프트 템플릿 ─────────────────────────────────────────────────

SYSTEM_TEMPLATE = """당신은 한국 웹소설 작가이자 RPG 게임마스터입니다.

## ★ 언어 규칙 (절대 원칙)
- 오직 한국어(한글+영문자+숫자+기호)만 사용하세요.
- 한자(漢字), 일본어(ひらがな·カタカナ), 중국어 간체·번체 — 단 한 글자도 허용 안 됩니다.
- 영어 단어를 섞어 쓰지 마세요. 영어로 쓰고 싶은 단어는 한국어 발음·번역으로.
  예) × "attack" → ○ "공격" / × "Dark Forest" → ○ "어둠의 숲" / × "quest" → ○ "퀘스트"
- 한자어가 생각나면 즉시 한글 발음으로 바꾸세요.
  예) × "表情을 읽었다" → ○ "표정을 읽었다"

## ★ 말투 일관성
- NPC가 처음 등장할 때 반드시 고유한 이름을 지어주세요.
  예) × "나이 많은 마법사" → ○ "아르간 노사" 또는 "벨린 대마법사"
- 한 NPC의 말투(존댓말/반말)는 처음부터 끝까지 동일하게 유지하세요.

## ★ 장면·위치 연속성
- 대화 기록을 반드시 확인하고, 현재 장면이 어디인지 파악한 뒤 서술하세요.
- 직전 GM 서술에서 확립된 장소와 상황을 그대로 이어받아야 합니다.
- 플레이어의 행동을 무시하거나 갑자기 다른 장소로 이동하지 마세요.

## 세계관
{world_description}

{genre_style}

## NPC 대화 형식 (반드시 준수)
NPC가 직접 말하는 대사는 반드시 이 형식으로 쓰세요:
[NPC이름] "대사 내용"

올바른 예:
[아르간 노사] "이 노사가 허락하지 않는다."
[촌장 가렐] "어서 오게. 오래 기다렸다네."
[낯선 여인] "뒤를 조심해요."

주의:
- 서술 문장은 그냥 쓰세요. 대사에만 이 형식 사용.
- 플레이어("당신")의 대사는 이름표 없이 따옴표만.
- NPC 이름은 대화 중에도 처음 등장 시 붙인 고유 이름 그대로 사용.

## 플레이어 입력 해석
1. **`**행동**` 형태**: 플레이어가 실제로 하는 행동 → 결과, 주변 반응, 세계의 변화를 묘사.
2. **일반 텍스트**: 플레이어 캐릭터의 대사 → NPC들이 직접 반응하고 대화를 이어가세요.

NPC는 플레이어의 말과 행동에 따라 태도가 바뀌고 숨겨진 감정·정보를 드러내기도 합니다.

## 전투
빠르고 박진감 있게. 주먹이 날아가는 소리, 검을 가르는 바람, 마법이 터지는 충격파.
능력치 반영: strength 높으면 압도적 힘으로, agility 높으면 눈에 안 보이는 속도로, intelligence 높으면 허점을 꿰뚫는 판단력으로.
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

{weather_time_section}
{npc_section}
{location_section}

## 출력 형식
이야기를 먼저 쓰고(3~5문단), 마지막에 JSON 블록을 붙이세요:

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
  "world_changes": {{
    "npcs": {{}},
    "locations": {{}},
    "time_of_day": "아침|낮|저녁|밤 중 하나, 변화 없으면 생략",
    "weather": "맑음|흐림|비|폭풍|안개 등, 변화 없으면 생략"
  }},
  "game_over": false
}}
```

## world_changes 사용법
- 이번 장면에 등장한 NPC가 있으면 npcs에 기록:
  `"아르간 노사": {{"desc": "노 마법사, 붉은 로브, 정보 판매상", "attitude": 10}}`
  이미 아는 NPC 태도가 바뀌었으면 attitude_change(정수)로 기록:
  `"아르간 노사": {{"attitude_change": 20}}`  (→ 기존 태도에 +20, -100~100 범위)
- 새로운 장소를 묘사했으면 locations에 기록:
  `"붉은 탑": {{"desc": "마법사 길드 본부, 도시 중심부"}}`
- quest_add는 이름과 목표를 함께: `{{"name": "퀘스트명", "desc": "달성 목표 설명"}}`
- 변경 없으면 npcs·locations는 빈 객체 `{{}}` 유지
"""


# ─── Few-shot 예시 교환 ──────────────────────────────────────────────────────

_EMPTY_JSON = (
    '```json\n'
    '{"state_changes": {"hp_change": 0, "mp_change": 0, "xp_gain": 0, '
    '"inventory_add": [], "inventory_remove": [], "quest_add": [], "quest_remove": [], '
    '"status_effects_add": [], "status_effects_remove": [], '
    '"location": "현재 위치", "in_battle": false}, '
    '"world_changes": {"npcs": {}, "locations": {}}, "game_over": false}\n'
    '```'
)

_FEWSHOT_EXCHANGES: dict[str, list[dict]] = {
    "fantasy": [
        {"role": "user", "content": "**가장 가까운 사람에게 말을 건다**"},
        {"role": "assistant", "content": (
            "그가 당신을 먼저 알아챘다.\n\n"
            "붉은 로브 자락이 돌바닥을 스쳤다. 수염 사이로 주름진 눈이 가늘게 좁혀졌다 "
            "— 경계인지 호기심인지 구분이 안 됐다.\n\n"
            "[아르간 노사] \"오랫동안 기다렸네, 이방인이여. 이 탑에 제 발로 찾아오는 자는 드물지.\"\n\n"
            "그는 손을 들지 않았다. 다가오지도 않았다. 그냥 그 자리에 서서, 당신을 읽고 있었다.\n\n"
            "[아르간 노사] \"무엇을 원하는가. 힘? 지식? 아니면… 복수?\"\n\n"
            + _EMPTY_JSON
        )},
    ],
    "scifi": [
        {"role": "user", "content": "**통신기로 기지에 상황을 보고한다**"},
        {"role": "assistant", "content": (
            "잡음. 그리고 — 연결.\n\n"
            "신호가 약했다. 목소리가 끊기고 이어졌다.\n\n"
            "[지휘관 레이나] \"…수신 확인. 상황은?\"\n\n"
            "벽에 등을 붙였다. 복도 끝 비상등이 깜빡이고 있었다. "
            "산소 잔량 68퍼센트. 시간이 없었다.\n\n"
            "[지휘관 레이나] \"이봐. 들려? 퇴각로가 봉쇄됐어. 다른 루트를 찾아야 해.\"\n\n"
            "잡음이 다시 몰려왔다. 그리고 연결이 끊겼다.\n\n"
            + _EMPTY_JSON
        )},
    ],
    "horror": [
        {"role": "user", "content": "**소리가 나는 쪽을 바라본다**"},
        {"role": "assistant", "content": (
            "소리가 멈췄다.\n\n"
            "어둠.\n\n"
            "그 안에 뭔가 있었다. 형체는 보이지 않았다. 하지만 있었다. 분명히.\n\n"
            "그때 뒤에서 숨소리가 들렸다.\n\n"
            "[엠마] \"…왔어?\"\n\n"
            "아이 목소리였다. 그런데 아이는 여기 없어야 했다.\n\n"
            "[엠마] \"같이 가.\"\n\n"
            + _EMPTY_JSON
        )},
    ],
    "modern": [
        {"role": "user", "content": "**구석 남자에게 다가간다**"},
        {"role": "assistant", "content": (
            "형광등이 한 번 더 깜빡였다.\n\n"
            "남자는 고개를 들지 않았다. 손이 편의점 선반 위에 올라가 있었다 "
            "— 뭔가를 집으려다 멈춘 것 같았다.\n\n"
            "가까이 다가갔다. 그제야 얼굴이 보였다.\n\n"
            "[모르는 남자] \"…미행당하고 있어요.\"\n\n"
            "목소리가 낮았다. 눈은 여전히 앞을 보고 있었다.\n\n"
            "[모르는 남자] \"당신도요.\"\n\n"
            + _EMPTY_JSON
        )},
    ],
}


# ─── 헬퍼 함수 ──────────────────────────────────────────────────────────────

def _format_npcs(world: dict) -> str:
    npcs = world.get("npcs", {})
    if not npcs:
        return ""
    lines = ["## 기억해야 할 NPC"]
    for name, info in npcs.items():
        attitude = info.get("attitude", 0)
        attitude_label = "우호적" if attitude > 30 else "적대적" if attitude < -30 else "중립"
        desc = info.get("desc", "")
        lines.append(f"- **{name}** (태도 {attitude}, {attitude_label}): {desc}")
    return "\n".join(lines)


def _format_weather_time(world: dict) -> str:
    parts = []
    if world.get("time_of_day"):
        parts.append(f"시간대: {world['time_of_day']}")
    if world.get("weather"):
        parts.append(f"날씨: {world['weather']}")
    if not parts:
        return ""
    return "## 현재 환경\n" + " | ".join(parts)


def _format_locations(world: dict) -> str:
    locations = world.get("locations", {})
    if not locations:
        return ""
    lines = ["## 알려진 장소"]
    for name, info in locations.items():
        desc = info.get("desc", "") if isinstance(info, dict) else str(info)
        lines.append(f"- **{name}**: {desc}")
    return "\n".join(lines)


def build_system_prompt(game) -> str:
    world     = json.loads(game.world_json)
    character = json.loads(game.character_json)
    hardcore_inst = HARDCORE_ON_INST if game.hardcore_mode else HARDCORE_OFF_INST
    genre = _detect_genre(world.get("description", ""))
    return SYSTEM_TEMPLATE.format(
        world_description=world.get("description", ""),
        genre_style=_GENRE_STYLE_BLOCKS[genre],
        hardcore_instruction=hardcore_inst,
        character_json=json.dumps(character, ensure_ascii=False, indent=2),
        location=character.get("location", "알 수 없는 장소"),
        weather_time_section=_format_weather_time(world),
        npc_section=_format_npcs(world),
        location_section=_format_locations(world),
    )


def _get_genre(game) -> str:
    world = json.loads(game.world_json)
    return _detect_genre(world.get("description", ""))


# ─── 스트리밍 액션 ───────────────────────────────────────────────────────────

async def stream_action(game, histories: list, player_input: str):
    """
    SSE 제너레이터.
    - ("text", chunk_str) 를 스트리밍 중 yield
    - ("done", {...})  를 완료 시 yield
    - ("error", str)   를 오류 시 yield
    """
    system   = build_system_prompt(game)
    genre    = _get_genre(game)
    history  = context_mgr.build_context(game, histories)

    # few-shot 예시를 게임 히스토리 앞에 삽입
    fewshot  = _FEWSHOT_EXCHANGES.get(genre, _FEWSHOT_EXCHANGES["modern"])
    messages = fewshot + history + [{"role": "user", "content": player_input}]

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
                yield ("text", sanitize_korean(text))
    except Exception as e:
        yield ("error", str(e))
        return

    full_response = sanitize_korean(full_response)
    state_changes = parse_state_changes(full_response)
    token_count   = estimate_tokens(full_response)

    yield ("done", {
        "full_response": full_response,
        "state_changes": state_changes,
        "token_count":   token_count,
    })


# ─── 오프닝 생성 ─────────────────────────────────────────────────────────────

OPENING_PROMPT = """당신은 인기 한국 웹소설 작가입니다.
RPG 게임의 오프닝 장면을 소설의 첫 장처럼 써주세요.

## 언어 규칙 (절대)
- 오직 한국어(한글+영문자+숫자)만 사용하세요.
- 한자·일본어·중국어 단 한 글자도 허용 안 됩니다.
- 영어 단어를 서술에 섞지 마세요. 한국어로 바꾸거나 한국식 발음으로.

## 시점 규칙
- 반드시 2인칭 "당신"으로만 서술하세요.
- "나", "그", "그녀" 등 1인칭·3인칭 절대 사용 금지.

## 직업 반영
캐릭터 직업({character_class})에 맞는 능력·습관·시선으로 서술하세요.

## 구성 (3~4문단, 반드시 이 순서)
[1문단] 장소와 세계의 공기 — 빛·소리·냄새·온도 등 감각으로 시작
[2문단] 당신의 현재 순간 — 지금 어디서 무엇을 하고 있는지, 평범하고 조용한 한 순간
[3~4문단] 모험의 씨앗 — 낯선 시선, 우연히 들은 소문, 오래된 기억 한 조각. "사건이 터진다"가 아니라 "뭔가 시작될 것 같다"는 여운으로 끝내기

## 문체
짧은 문장과 긴 문장을 섞어 리듬을 살리세요.
나쁜 예: "당신은 마을 광장을 걸으며 주변을 둘러보았다."
좋은 예: "돌바닥이 발 아래서 울렸다. 광장은 이른 아침부터 북적였다 — 하지만 당신의 눈은 자꾸 골목 어귀에 멈추었다."

## 절대 하지 말 것
- 도난·추격·싸움·폭발 등 즉각적 사건 금지
- JSON 블록 없이 이야기만 작성

세계관: {world_description}
캐릭터 이름: {character_name}
직업: {character_class}
배경: {character_background}
"""


async def generate_summary(game, histories: list) -> str:
    """게임 히스토리를 AI로 요약해 압축 문단 반환"""
    if not histories:
        return ""
    excerpt = "\n".join(
        f"[{h.role}] {h.content[:200]}" for h in histories[-30:]
    )
    prompt = (
        "다음 RPG 게임 대화를 한국어로 3~5문단 내러티브 요약으로 작성하세요. "
        "주요 사건, 만난 NPC, 진행한 퀘스트, 현재 상황에 집중하세요. "
        "JSON 블록 없이 순수 텍스트만.\n\n" + excerpt
    )
    try:
        resp = await async_client.chat.completions.create(
            model=GM_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return sanitize_korean(resp.choices[0].message.content)
    except Exception:
        return ""


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
        return sanitize_korean(response.choices[0].message.content)
    except Exception:
        return (
            f"당신은 {character_name}입니다. {character_class} 출신으로, "
            f"{character_background}\n\n"
            f"낯선 땅에 발을 내딛는 순간, 운명의 바퀴가 돌기 시작합니다. "
            f"무엇을 하시겠습니까?"
        )
