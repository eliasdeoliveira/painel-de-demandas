"""Regra de negócio do cálculo de prioridade de uma demanda."""

IMPACT_WEIGHT = 2
URGENCY_WEIGHT = 1

MIN_LEVEL = 1
MAX_LEVEL = 5


def calculate_priority_score(impact: int, urgency: int) -> int:
    """Calcula a pontuação de prioridade: `(impacto × 2) + urgência`.

    O impacto pesa o dobro da urgência: uma demanda que atinge muitos usuários
    vence uma demanda apenas urgente. Com níveis de 1 a 5, a pontuação varia
    entre 3 e 15.

    A função é pura de propósito. A faixa aceita de cada nível é garantida pelos
    schemas de entrada e por uma constraint no banco, de modo que a fórmula
    exista em um único lugar e possa ser testada isoladamente.
    """
    return impact * IMPACT_WEIGHT + urgency * URGENCY_WEIGHT
