from app.services.state_manager import parse_state_changes, apply_state_changes, apply_death_penalty, apply_world_changes


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
    character = {"stats": {"hp": 80, "mp": 120, "max_hp": 80, "max_mp": 120}, "inventory": [], "location": "마을"}
    changes = {"state_changes": {"hp_change": -10}}
    result = apply_state_changes(character, changes)
    assert result["stats"]["hp"] == 70


def test_hp_cannot_go_below_zero():
    character = {"stats": {"hp": 5, "mp": 120, "max_hp": 80, "max_mp": 120}, "inventory": [], "location": "마을"}
    changes = {"state_changes": {"hp_change": -100}}
    result = apply_state_changes(character, changes)
    assert result["stats"]["hp"] == 0


def test_apply_inventory_add_and_remove():
    character = {"stats": {"hp": 80, "mp": 120, "max_hp": 80, "max_mp": 120}, "inventory": ["단검", "포션"], "location": "마을"}
    changes = {"state_changes": {"inventory_add": ["용의 비늘"], "inventory_remove": ["포션"]}}
    result = apply_state_changes(character, changes)
    assert "용의 비늘" in result["inventory"]
    assert "단검" in result["inventory"]
    assert "포션" not in result["inventory"]


def test_original_not_mutated():
    character = {"stats": {"hp": 80, "mp": 120, "max_hp": 80, "max_mp": 120}, "inventory": ["단검"], "location": "마을"}
    changes = {"state_changes": {"hp_change": -10}}
    apply_state_changes(character, changes)
    assert character["stats"]["hp"] == 80  # 원본 불변


def test_apply_death_penalty():
    character = {"stats": {"hp": 0, "mp": 120, "max_hp": 80, "max_mp": 120}, "inventory": ["포션", "단검", "금화"], "location": "마을"}
    result = apply_death_penalty(character)
    assert result["stats"]["hp"] == 40  # max_hp // 2
    assert len(result["inventory"]) == 2  # 1개 손실


def test_class_stats_warrior():
    from app.api.routes.game import _build_initial_character
    c = _build_initial_character("홍길동", "전사", "용사 출신")
    assert c["stats"]["strength"] >= 14
    assert c["stats"]["intelligence"] <= 8

def test_class_stats_mage():
    from app.api.routes.game import _build_initial_character
    c = _build_initial_character("아리아", "마법사", "마탑 출신")
    assert c["stats"]["intelligence"] >= 14
    assert c["stats"]["strength"] <= 8

def test_level_up_applied():
    from app.services.state_manager import apply_state_changes
    character = {
        "level": 1, "xp": 90, "xp_to_next": 100,
        "stats": {"hp": 80, "max_hp": 80, "mp": 40, "max_mp": 40,
                  "strength": 10, "intelligence": 10, "agility": 10, "charisma": 10},
        "inventory": [], "quests": [], "status_effects": [],
    }
    changes = {"state_changes": {"xp_gain": 20}, "world_changes": {}, "game_over": False}
    result = apply_state_changes(character, changes)
    assert result["level"] == 2
    assert result["xp"] == 10
    assert result["stats"]["max_hp"] > 80

def test_xp_no_level_up():
    from app.services.state_manager import apply_state_changes
    character = {
        "level": 1, "xp": 0, "xp_to_next": 100,
        "stats": {"hp": 80, "max_hp": 80, "mp": 40, "max_mp": 40,
                  "strength": 10, "intelligence": 10, "agility": 10, "charisma": 10},
        "inventory": [], "quests": [], "status_effects": [],
    }
    changes = {"state_changes": {"xp_gain": 30}, "world_changes": {}, "game_over": False}
    result = apply_state_changes(character, changes)
    assert result["level"] == 1
    assert result["xp"] == 30


# --- apply_world_changes 테스트 ---

def _base_world():
    return {"name": "테스트 세계", "description": "테스트", "npcs": {}, "locations": {}}


def test_world_npc_add():
    world = _base_world()
    changes = {"world_changes": {"npcs": {"엘라": {"attitude": 30, "desc": "촌장"}}}}
    result = apply_world_changes(world, changes)
    assert result["npcs"]["엘라"]["attitude"] == 30
    assert result["npcs"]["엘라"]["desc"] == "촌장"


def test_world_npc_attitude_change_delta():
    world = _base_world()
    world["npcs"]["엘라"] = {"attitude": 30, "desc": "촌장"}
    changes = {"world_changes": {"npcs": {"엘라": {"attitude_change": 20}}}}
    result = apply_world_changes(world, changes)
    assert result["npcs"]["엘라"]["attitude"] == 50
    assert "attitude_change" not in result["npcs"]["엘라"]


def test_world_npc_attitude_clamped_at_100():
    world = _base_world()
    world["npcs"]["엘라"] = {"attitude": 90}
    changes = {"world_changes": {"npcs": {"엘라": {"attitude_change": 50}}}}
    result = apply_world_changes(world, changes)
    assert result["npcs"]["엘라"]["attitude"] == 100


def test_world_npc_attitude_clamped_at_minus_100():
    world = _base_world()
    world["npcs"]["적"] = {"attitude": -80}
    changes = {"world_changes": {"npcs": {"적": {"attitude_change": -50}}}}
    result = apply_world_changes(world, changes)
    assert result["npcs"]["적"]["attitude"] == -100


def test_world_location_add():
    world = _base_world()
    changes = {"world_changes": {"locations": {"마을 광장": {"visited": True, "desc": "중심지"}}}}
    result = apply_world_changes(world, changes)
    assert result["locations"]["마을 광장"]["visited"] is True


def test_world_empty_changes_safe():
    world = _base_world()
    result = apply_world_changes(world, {})
    assert result["npcs"] == {}
    assert result["locations"] == {}


def test_world_original_not_mutated():
    world = _base_world()
    changes = {"world_changes": {"npcs": {"엘라": {"attitude": 10}}}}
    apply_world_changes(world, changes)
    assert "엘라" not in world["npcs"]


# --- 퀘스트 딕트 형식 테스트 ---

def _base_char():
    return {
        "level": 1, "xp": 0, "xp_to_next": 100,
        "location": "마을",
        "stats": {"hp": 80, "max_hp": 80, "mp": 40, "max_mp": 40,
                  "strength": 10, "intelligence": 10, "agility": 10, "charisma": 10},
        "inventory": ["단검"], "quests": [], "status_effects": [], "in_battle": False,
    }


def test_quest_add_dict_format():
    c = _base_char()
    changes = {"state_changes": {"quest_add": [{"name": "마룡 토벌", "desc": "용을 처치하라"}]}}
    result = apply_state_changes(c, changes)
    assert "마룡 토벌" in result["quests"]
    assert result["quest_details"]["마룡 토벌"] == "용을 처치하라"


def test_quest_add_string_format():
    c = _base_char()
    changes = {"state_changes": {"quest_add": ["단순 퀘스트"]}}
    result = apply_state_changes(c, changes)
    assert "단순 퀘스트" in result["quests"]


def test_quest_no_duplicate():
    c = _base_char()
    c["quests"] = ["마룡 토벌"]
    changes = {"state_changes": {"quest_add": [{"name": "마룡 토벌", "desc": "용을 처치하라"}]}}
    result = apply_state_changes(c, changes)
    assert result["quests"].count("마룡 토벌") == 1


def test_quest_remove():
    c = _base_char()
    c["quests"] = ["마룡 토벌"]
    c["quest_details"] = {"마룡 토벌": "용을 처치하라"}
    changes = {"state_changes": {"quest_remove": ["마룡 토벌"]}}
    result = apply_state_changes(c, changes)
    assert "마룡 토벌" not in result["quests"]
    assert "마룡 토벌" not in result.get("quest_details", {})


# --- 상태 효과 테스트 ---

def test_status_effects_add():
    c = _base_char()
    changes = {"state_changes": {"status_effects_add": ["독"]}}
    result = apply_state_changes(c, changes)
    assert "독" in result["status_effects"]


def test_status_effects_remove():
    c = _base_char()
    c["status_effects"] = ["독", "화상"]
    changes = {"state_changes": {"status_effects_remove": ["독"]}}
    result = apply_state_changes(c, changes)
    assert "독" not in result["status_effects"]
    assert "화상" in result["status_effects"]


# --- HP/MP 클램핑 테스트 ---

def test_hp_clamp_max():
    c = _base_char()
    changes = {"state_changes": {"hp_change": 9999}}
    result = apply_state_changes(c, changes)
    assert result["stats"]["hp"] <= result["stats"]["max_hp"]


def test_mp_cannot_go_below_zero():
    c = _base_char()
    changes = {"state_changes": {"mp_change": -9999}}
    result = apply_state_changes(c, changes)
    assert result["stats"]["mp"] == 0
