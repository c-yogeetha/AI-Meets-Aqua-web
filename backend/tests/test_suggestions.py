import pytest

from app.analysis.suggestions import (
    evaluate_safe_condition,
    generate_suggestions,
    load_rules_config,
)


@pytest.fixture
def rules_config():
    return load_rules_config()


def test_b_g01_all_flags_have_rules_and_ordered(rules_config):
    """B-G01: All standard flags have rules and suggestions are ordered high, medium, low."""
    flags_to_test = [
        "surface_gasping",
        "fast_swimming",
        "erratic_swimming",
        "isolation",
        "bottom_inactivity",
        "lethargic",
    ]
    for flag in flags_to_test:
        assert flag in rules_config["rules"]

    fish_results = [
        {"id": "Fish_1", "flags": ["fast_swimming", "surface_gasping"]},
        {"id": "Fish_2", "flags": ["isolation"]},
    ]
    sugs = generate_suggestions(fish_results, rules_config=rules_config)
    assert len(sugs) >= 3
    # Verify order: high before medium before low
    priority_order = {"high": 0, "medium": 1, "low": 2}
    for i in range(len(sugs) - 1):
        assert priority_order[sugs[i]["priority"].lower()] <= priority_order[sugs[i + 1]["priority"].lower()]


def test_b_g02_fish_placeholder_replacement(rules_config):
    """B-G02: {fish} placeholder replaced with affected fish IDs without braces."""
    fish_results = [
        {"id": "Fish_1", "flags": ["isolation"]},
        {"id": "Fish_2", "flags": ["isolation"]},
    ]
    sugs = generate_suggestions(fish_results, rules_config=rules_config)
    iso_sug = next(s for s in sugs if "alone" in s["behaviour"].lower())
    assert "{" not in iso_sug["action"]
    assert "}" not in iso_sug["action"]
    assert "Fish_1 and Fish_2" in iso_sug["action"]


def test_b_g03_context_rules(rules_config):
    """B-G03: Context conditions trigger expected suggestions."""
    # Warm water
    sugs_warm = generate_suggestions([], context={"water_temp_c": 28}, rules_config=rules_config)
    assert any("warm" in s["behaviour"].lower() for s in sugs_warm)

    # Cold water
    sugs_cold = generate_suggestions([], context={"water_temp_c": 13}, rules_config=rules_config)
    assert any("cold" in s["behaviour"].lower() for s in sugs_cold)

    # Overdue water change
    sugs_change = generate_suggestions([], context={"last_water_change_days": 30}, rules_config=rules_config)
    assert any("overdue" in s["behaviour"].lower() for s in sugs_change)


def test_b_g04_all_clear_when_no_flags(rules_config):
    """B-G04: When no behavioral flags, only all_clear is returned."""
    fish_results = [{"id": "Fish_1", "flags": []}, {"id": "Fish_2", "flags": []}]
    sugs = generate_suggestions(fish_results, context={}, rules_config=rules_config)
    assert len(sugs) == 1
    assert "No stress indicators found" in sugs[0]["behaviour"]
    assert sugs[0]["priority"] == "low"


def test_b_g05_rules_yaml_schema(rules_config):
    """B-G05: Every rule in rules.yaml has required fields."""
    required_keys = ["priority", "behaviour", "cause", "action", "source"]
    for r_name, r_data in rules_config["rules"].items():
        for k in required_keys:
            assert k in r_data, f"Rule '{r_name}' missing key '{k}'"

    for cr_name, cr_data in rules_config["context_rules"].items():
        for k in required_keys:
            assert k in cr_data, f"Context rule '{cr_name}' missing key '{k}'"


def test_b_g06_safe_condition_evaluator():
    """B-G06: Context rule evaluator safely executes simple comparisons and rejects unsafe strings."""
    # Valid
    assert evaluate_safe_condition("water_temp_c > 24", {"water_temp_c": 26}) is True
    assert evaluate_safe_condition("water_temp_c > 24", {"water_temp_c": 22}) is False
    assert evaluate_safe_condition("last_water_change_days > 14", {"last_water_change_days": 20}) is True

    # Unsafe / Malicious expressions must raise ValueError
    unsafe_expressions = [
        "__import__('os').system('rm -rf /')",
        "water_temp_c > 24 and open('/etc/passwd').read()",
        "eval('1+1')",
        "; drop table tanks;",
    ]
    for expr in unsafe_expressions:
        with pytest.raises(ValueError):
            evaluate_safe_condition(expr, {"water_temp_c": 25})
