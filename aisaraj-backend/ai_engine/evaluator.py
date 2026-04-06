"""Score normalization and validation."""

DIMENSION_CAPS = {
    'communication': 20,
    'technical_depth': 25,
    'code_quality': 20,
    'optimization': 15,
    'problem_solving': 20,
}

HIRING_THRESHOLDS = [
    ('Strong Hire', 85),
    ('Hire', 70),
    ('Consider', 50),
    ('Reject', 0),
]


def normalize_and_validate(raw: dict) -> dict:
    """Clamp each dimension to its max, recalculate total, validate hiring signal."""
    for dim, cap in DIMENSION_CAPS.items():
        raw[dim] = max(0, min(int(raw.get(dim, 0)), cap))

    raw['score'] = sum(raw[d] for d in DIMENSION_CAPS)

    # Override hiring_signal based on computed score
    for signal, threshold in HIRING_THRESHOLDS:
        if raw['score'] >= threshold:
            raw['hiring_signal'] = signal
            break

    # Ensure list fields
    for field in ['strengths', 'weaknesses', 'improvement_plan', 'recommended_topics']:
        if not isinstance(raw.get(field), list):
            raw[field] = []

    # Ensure skill_gap_analysis
    if not isinstance(raw.get('skill_gap_analysis'), dict):
        raw['skill_gap_analysis'] = {}

    return raw
