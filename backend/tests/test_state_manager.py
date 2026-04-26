from app.services.state_manager import parse_state_changes, apply_state_changes, apply_death_penalty


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
