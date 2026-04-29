import json
import re
import random
import copy


def parse_state_changes(gm_response: str) -> dict:
    """AI 응답 마지막 ```json ... ``` 블록에서 상태 변화 추출"""
    default = {"state_changes": {}, "world_changes": {}, "game_over": False}
    try:
        matches = re.findall(r'```json\s*(.*?)\s*```', gm_response, re.DOTALL)
        if matches:
            return json.loads(matches[-1])
    except Exception:
        pass
    return default


LEVEL_STAT_BONUS = {"hp": 10, "max_hp": 10, "mp": 5, "max_mp": 5, "strength": 1, "intelligence": 1, "agility": 1, "charisma": 1}


def _apply_level_up(c: dict) -> dict:
    while c.get("xp", 0) >= c.get("xp_to_next", 100):
        c["xp"] = c.get("xp", 0) - c.get("xp_to_next", 100)
        c["level"] = c.get("level", 1) + 1
        c["xp_to_next"] = int(c.get("xp_to_next", 100) * 1.5)
        for stat, bonus in LEVEL_STAT_BONUS.items():
            c["stats"][stat] = c["stats"].get(stat, 0) + bonus
    return c


def apply_world_changes(world: dict, changes: dict) -> dict:
    """world_json에 GM의 world_changes 누적 적용 (NPC·장소 메모리)"""
    w = copy.deepcopy(world)
    wc = changes.get("world_changes", {})
    if isinstance(wc.get("npcs"), dict):
        for npc_name, npc_data in wc["npcs"].items():
            existing = w.setdefault("npcs", {}).get(npc_name, {})
            merged = {**existing, **npc_data}
            if "attitude_change" in npc_data:
                base = existing.get("attitude", 0)
                merged["attitude"] = max(-100, min(100, base + npc_data["attitude_change"]))
                del merged["attitude_change"]
            w["npcs"][npc_name] = merged
    if isinstance(wc.get("locations"), dict):
        for loc_name, loc_data in wc["locations"].items():
            existing = w.setdefault("locations", {}).get(loc_name, {})
            w["locations"][loc_name] = {**existing, **loc_data}
    return w


def apply_state_changes(character: dict, changes: dict) -> dict:
    """캐릭터 상태에 변화 적용. 원본을 수정하지 않고 복사본 반환"""
    c = copy.deepcopy(character)
    sc = changes.get("state_changes", {})

    if "hp_change" in sc:
        c["stats"]["hp"] = max(0, min(c["stats"].get("max_hp", 999), c["stats"]["hp"] + sc["hp_change"]))
    if "mp_change" in sc:
        c["stats"]["mp"] = max(0, min(c["stats"].get("max_mp", 999), c["stats"]["mp"] + sc["mp_change"]))
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
            if isinstance(q, dict):
                name = q.get("name", "")
                if name and name not in c.get("quests", []):
                    c.setdefault("quests", []).append(name)
                    c.setdefault("quest_details", {})[name] = q.get("desc", "")
            elif isinstance(q, str) and q not in c.get("quests", []):
                c.setdefault("quests", []).append(q)
    if "quest_remove" in sc:
        to_remove = [q["name"] if isinstance(q, dict) else q for q in sc["quest_remove"]]
        c["quests"] = [q for q in c.get("quests", []) if q not in to_remove]
        for name in to_remove:
            c.get("quest_details", {}).pop(name, None)
    if "status_effects_add" in sc:
        c.setdefault("status_effects", []).extend(sc["status_effects_add"])
    if "status_effects_remove" in sc:
        c["status_effects"] = [e for e in c.get("status_effects", []) if e not in sc["status_effects_remove"]]

    return c


def apply_death_penalty(character: dict) -> dict:
    """일반 모드 사망 패널티: HP를 max_hp//2로 회복, 인벤토리 아이템 1개 랜덤 손실"""
    c = copy.deepcopy(character)
    max_hp = c["stats"].get("max_hp", 80)
    c["stats"]["hp"] = max_hp // 2
    if c["inventory"]:
        lost = random.choice(c["inventory"])
        c["inventory"].remove(lost)
    return c
