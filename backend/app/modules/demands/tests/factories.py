"""Construtores de dados usados pelos testes do módulo de demandas."""

from typing import Any

from app.modules.demands.schemas import DemandCreate

_DEFAULT_PAYLOAD: dict[str, Any] = {
    "title": "Exportar relatório em CSV",
    "description": "O time comercial precisa exportar a listagem já filtrada.",
    "requester": "Ana Souza",
    "impact": 4,
    "urgency": 3,
}


def demand_payload(**overrides: Any) -> dict[str, Any]:
    """Corpo válido de cadastro, com os campos que o teste quiser sobrescrever."""
    return {**_DEFAULT_PAYLOAD, **overrides}


def demand_create(**overrides: Any) -> DemandCreate:
    return DemandCreate(**demand_payload(**overrides))
