"""
Unit tests for the similarity engine.
Run with: cd backend && .venv/bin/python -m pytest tests/ -v
"""
import sys
sys.path.insert(0, '.')

from app.services.similarity import compare, compare_against_corpus


def test_identical_code_scores_near_one():
    code = "def foo(x):\n    return x + 1\n"
    result = compare(code, code, language="Python")
    assert result.overall_score >= 0.95, f"Expected ≥ 0.95, got {result.overall_score}"
    assert result.is_flagged


def test_completely_different_code_scores_low():
    a = "def foo(x):\n    return x + 1\n"
    b = "class LinkedList:\n    def __init__(self):\n        self.head = None\n"
    result = compare(a, b, language="Python")
    assert result.overall_score < 0.50, f"Expected < 0.50, got {result.overall_score}"
    assert not result.is_flagged


def test_renamed_variables_still_high_structural():
    a = """
def twoSum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        comp = target - n
        if comp in seen:
            return [seen[comp], i]
        seen[n] = i
    return []
"""
    b = """
def find_indices(arr, goal):
    memo = {}
    for idx, val in enumerate(arr):
        diff = goal - val
        if diff in memo:
            return [memo[diff], idx]
        memo[val] = idx
    return []
"""
    result = compare(a, b, language="Python")
    # Renamed vars but same structure — structural similarity should be high
    assert result.structural_score >= 0.70, f"Expected structural ≥ 0.70, got {result.structural_score}"


def test_corpus_compare_finds_best_match():
    candidate = "def foo(x):\n    return x * 2\n"
    corpus = [
        {"label": "irrelevant",  "code": "class Bar:\n    pass\n"},
        {"label": "close_match", "code": "def foo(x):\n    return x * 2\n"},
    ]
    result, label = compare_against_corpus(candidate, "Python", corpus)
    assert label == "close_match"
    assert result.overall_score >= 0.95


def test_flagging_threshold():
    # 70% overall → flagged
    a = "def f(x):\n    return x + 1\n"
    b = "def g(y):\n    return y + 1\n"
    result = compare(a, b, "Python")
    # Same structure, only name differs → should be high similarity
    assert result.structural_score >= 0.80
    assert result.is_flagged


def test_diff_json_is_valid_json():
    import json
    a = "x = 1\n"
    b = "x = 2\n"
    result = compare(a, b, "Python")
    parsed = json.loads(result.diff_json)
    assert isinstance(parsed, list)


def test_analytics_scoring():
    from app.services.analytics import compute_scores

    snapshots = [
        {"elapsed_seconds": 60,  "keystroke_rate": 12.0, "char_count": 200},
        {"elapsed_seconds": 120, "keystroke_rate": 8.0,  "char_count": 350},
        {"elapsed_seconds": 180, "keystroke_rate": 0.0,  "char_count": 350},  # idle window
    ]
    signals = [
        {"risk_level": "high",   "signal_type": "tab_switch"},
        {"risk_level": "medium", "signal_type": "clipboard_paste"},
    ]
    result = compute_scores(snapshots, signals, similarity_scores=[30.0])

    assert 0 <= result.engagement_score <= 100
    assert 0 <= result.focus_score      <= 100
    assert 0 <= result.risk_score       <= 100
    assert 0 <= result.integrity_score  <= 100
    assert result.risk_score > 0   # 2 signals should produce non-zero risk
    assert len(result.summary) > 0
