"""Testes da regra de cálculo de prioridade."""

import pytest

from app.modules.demands.priority import MAX_LEVEL, MIN_LEVEL, calculate_priority_score


@pytest.mark.parametrize(
    ("impact", "urgency", "expected"),
    [
        (1, 1, 3),
        (3, 2, 8),
        (5, 3, 13),
        (2, 5, 9),
    ],
)
def test_applies_the_formula_impact_times_two_plus_urgency(impact, urgency, expected):
    assert calculate_priority_score(impact, urgency) == expected


def test_lowest_possible_score_is_three():
    assert calculate_priority_score(MIN_LEVEL, MIN_LEVEL) == 3


def test_highest_possible_score_is_fifteen():
    assert calculate_priority_score(MAX_LEVEL, MAX_LEVEL) == 15


def test_impact_weighs_more_than_urgency():
    """O peso dobrado do impacto é a razão de ser da fórmula."""
    high_impact = calculate_priority_score(impact=5, urgency=1)
    high_urgency = calculate_priority_score(impact=1, urgency=5)

    assert high_impact > high_urgency


def test_score_is_deterministic():
    assert calculate_priority_score(4, 4) == calculate_priority_score(4, 4)
