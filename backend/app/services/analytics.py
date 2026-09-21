"""
Behavioral analytics service.

Computes engagement and risk scores from:
  - Code snapshots (keystroke rate, character delta over time)
  - Proctoring signals (weighted by risk level)
  - Submission outcomes (ratio of passed test cases)

All scores are 0–100 floats.
"""
from dataclasses import dataclass
from typing import Sequence


RISK_WEIGHTS = {
    "critical": 25,
    "high":     15,
    "medium":    8,
    "low":       3,
    "info":      0,
}


@dataclass
class AnalyticsScore:
    engagement_score: float   # 0-100: how actively the candidate was coding
    focus_score:      float   # 0-100: inferred from keystroke continuity
    risk_score:       float   # 0-100: weighted sum of proctoring signals
    integrity_score:  float   # 0-100: inverse of (risk + similarity)
    summary:          str


def compute_scores(
    snapshots: list[dict],   # [{elapsed_seconds, keystroke_rate, char_count}]
    signals:   list[dict],   # [{risk_level, signal_type}]
    similarity_scores: list[float],   # overall_score values 0-100
) -> AnalyticsScore:

    # ── Engagement score ──────────────────────────────────────────────────────
    # Average keystroke rate, normalised. > 10 KPM = fully engaged.
    if snapshots:
        avg_kpm = sum(s.get("keystroke_rate") or 0 for s in snapshots) / len(snapshots)
        engagement = min(100.0, avg_kpm * 6)   # 16.7 KPM → 100
    else:
        engagement = 50.0   # no data → neutral

    # ── Focus score ───────────────────────────────────────────────────────────
    # Penalise gaps in coding (long stretches with zero keystroke rate)
    if len(snapshots) >= 2:
        zero_windows = sum(
            1 for s in snapshots if (s.get("keystroke_rate") or 0) < 0.5
        )
        focus = max(0.0, 100.0 - (zero_windows / len(snapshots)) * 100)
    else:
        focus = 75.0

    # ── Risk score ────────────────────────────────────────────────────────────
    risk_raw = sum(RISK_WEIGHTS.get(s.get("risk_level", "info"), 0) for s in signals)
    risk = min(100.0, float(risk_raw))

    # ── Integrity score ───────────────────────────────────────────────────────
    # Combines risk signals and similarity analysis
    max_sim = max(similarity_scores) if similarity_scores else 0.0
    integrity = max(0.0, 100.0 - risk * 0.6 - max_sim * 0.4)

    # ── Summary text ──────────────────────────────────────────────────────────
    risk_level = (
        "critical" if risk >= 60 else
        "high"     if risk >= 40 else
        "medium"   if risk >= 20 else
        "low"
    )
    summary = (
        f"Engagement: {'high' if engagement >= 70 else 'moderate' if engagement >= 40 else 'low'}. "
        f"Risk signals: {risk_level} ({len(signals)} total). "
        f"Integrity: {'strong' if integrity >= 80 else 'moderate' if integrity >= 60 else 'review recommended'}."
    )

    return AnalyticsScore(
        engagement_score=round(engagement, 1),
        focus_score=round(focus, 1),
        risk_score=round(risk, 1),
        integrity_score=round(integrity, 1),
        summary=summary,
    )
