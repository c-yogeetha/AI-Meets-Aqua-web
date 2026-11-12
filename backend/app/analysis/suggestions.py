import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml


def load_rules_config(custom_path: Optional[str] = None) -> Dict[str, Any]:
    if custom_path:
        p = Path(custom_path)
    else:
        p = Path(__file__).resolve().parent / "config" / "rules.yaml"
    with open(p, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


SAFE_COND_PATTERN = re.compile(r"^([a-zA-Z_][a-zA-Z0-9_]*)\s*(>|<|>=|<=|==|!=)\s*(-?\d+(?:\.\d+)?)$")


def evaluate_safe_condition(condition_str: str, context: Dict[str, Any]) -> bool:
    """Safely evaluate simple expressions like 'water_temp_c > 24'.

    Raises ValueError if expression does not strictly match the simple grammar.
    """
    match = SAFE_COND_PATTERN.match(condition_str.strip())
    if not match:
        raise ValueError(f"Unsafe or invalid condition expression: {condition_str}")

    field, op, val_str = match.groups()
    val = float(val_str)
    ctx_val = context.get(field)
    if ctx_val is None:
        return False
    try:
        ctx_num = float(ctx_val)
    except (ValueError, TypeError):
        return False

    if op == ">":
        return ctx_num > val
    elif op == "<":
        return ctx_num < val
    elif op == ">=":
        return ctx_num >= val
    elif op == "<=":
        return ctx_num <= val
    elif op == "==":
        return ctx_num == val
    elif op == "!=":
        return ctx_num != val
    return False


def format_fish_list(fish_ids: List[str]) -> str:
    """Format fish IDs into human readable string, e.g. 'Fish_1 and Fish_2'."""
    if not fish_ids:
        return "the fish"
    if len(fish_ids) == 1:
        return fish_ids[0]
    return f"{', '.join(fish_ids[:-1])} and {fish_ids[-1]}"


def generate_suggestions(
    fish_results: List[Dict[str, Any]],
    context: Optional[Dict[str, Any]] = None,
    rules_config: Optional[Dict[str, Any]] = None,
    reliability_level: str = "high",
) -> List[Dict[str, Any]]:
    """Generate structured, actionable suggestions ordered by priority."""
    if rules_config is None:
        rules_config = load_rules_config()
    if context is None:
        context = {}

    rules = rules_config.get("rules", {})
    context_rules = rules_config.get("context_rules", {})

    # Map fish IDs with low confidence
    low_conf_fish = set()
    for f in fish_results:
        if "low_confidence" in f.get("flags", []) or f.get("confidence", 1.0) < 0.4:
            low_conf_fish.add(f.get("id"))

    flag_to_fish: Dict[str, List[str]] = {}
    for fish in fish_results:
        fid = fish.get("id", "Fish")
        for flag in fish.get("flags", []):
            if flag == "low_confidence":
                continue
            if flag not in flag_to_fish:
                flag_to_fish[flag] = []
            flag_to_fish[flag].append(fid)

    suggestions: List[Dict[str, Any]] = []

    # 1. Flag-based rules
    for flag, affected_fish in flag_to_fish.items():
        if flag in rules:
            rule = rules[flag]
            action_text = rule["action"].replace("{fish}", format_fish_list(affected_fish))
            is_low_conf = (
                reliability_level == "low"
                or any(fid in low_conf_fish for fid in affected_fish)
            )
            suggestions.append({
                "priority": rule.get("priority", "medium"),
                "fish": affected_fish,
                "behaviour": rule.get("behaviour", ""),
                "cause": rule.get("cause", ""),
                "action": action_text,
                "source": rule.get("source", ""),
                "low_confidence": is_low_conf,
            })

    # 2. Context-based rules
    for rule_key, c_rule in context_rules.items():
        if rule_key == "all_clear":
            continue
        when_expr = c_rule.get("when")
        if when_expr and evaluate_safe_condition(when_expr, context):
            action_text = c_rule["action"].replace("{fish}", "the tank")
            suggestions.append({
                "priority": c_rule.get("priority", "low"),
                "fish": [],
                "behaviour": c_rule.get("behaviour", ""),
                "cause": c_rule.get("cause", ""),
                "action": action_text,
                "source": c_rule.get("source", ""),
                "low_confidence": reliability_level == "low",
            })

    # 3. All clear if no flags found
    if not flag_to_fish:
        all_clear = context_rules.get("all_clear")
        if all_clear:
            suggestions.append({
                "priority": all_clear.get("priority", "low"),
                "fish": [],
                "behaviour": all_clear.get("behaviour", ""),
                "cause": all_clear.get("cause", ""),
                "action": all_clear.get("action", ""),
                "source": all_clear.get("source", ""),
                "low_confidence": reliability_level == "low",
            })

    # Priority sorting: high (0), medium (1), low (2)
    priority_order = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda s: priority_order.get(s["priority"].lower(), 3))

    return suggestions
