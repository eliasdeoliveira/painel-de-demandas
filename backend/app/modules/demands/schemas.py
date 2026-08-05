"""Contratos de entrada e saída do módulo de demandas."""

import enum
from datetime import datetime

from pydantic import Field

from app.core.schemas import CamelCaseModel
from app.modules.demands.models import (
    DESCRIPTION_MAX_LENGTH,
    REQUESTER_MAX_LENGTH,
    TITLE_MAX_LENGTH,
    DemandStatus,
)
from app.modules.demands.priority import MAX_LEVEL, MIN_LEVEL

TITLE_MIN_LENGTH = 3
DESCRIPTION_MIN_LENGTH = 3
REQUESTER_MIN_LENGTH = 2

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100

_LEVEL_DESCRIPTION = f"Nível de {MIN_LEVEL} a {MAX_LEVEL}."


class DemandSortField(enum.StrEnum):
    """Campos pelos quais a listagem pode ser ordenada."""

    PRIORITY = "priority"
    CREATED_AT = "createdAt"
    IMPACT = "impact"
    URGENCY = "urgency"
    TITLE = "title"
    STATUS = "status"


class SortOrder(enum.StrEnum):
    ASC = "asc"
    DESC = "desc"


class DemandCreate(CamelCaseModel):
    """Dados aceitos no cadastro de uma demanda.

    O status não é informado: toda demanda nasce como `pending`. A pontuação de
    prioridade também não, por ser calculada exclusivamente no servidor.
    """

    title: str = Field(min_length=TITLE_MIN_LENGTH, max_length=TITLE_MAX_LENGTH)
    description: str = Field(min_length=DESCRIPTION_MIN_LENGTH, max_length=DESCRIPTION_MAX_LENGTH)
    requester: str = Field(min_length=REQUESTER_MIN_LENGTH, max_length=REQUESTER_MAX_LENGTH)
    impact: int = Field(ge=MIN_LEVEL, le=MAX_LEVEL, description=_LEVEL_DESCRIPTION)
    urgency: int = Field(ge=MIN_LEVEL, le=MAX_LEVEL, description=_LEVEL_DESCRIPTION)


class DemandUpdate(CamelCaseModel):
    """Atualização parcial: apenas os campos enviados são alterados."""

    title: str | None = Field(default=None, min_length=TITLE_MIN_LENGTH, max_length=TITLE_MAX_LENGTH)
    description: str | None = Field(
        default=None, min_length=DESCRIPTION_MIN_LENGTH, max_length=DESCRIPTION_MAX_LENGTH
    )
    requester: str | None = Field(
        default=None, min_length=REQUESTER_MIN_LENGTH, max_length=REQUESTER_MAX_LENGTH
    )
    impact: int | None = Field(default=None, ge=MIN_LEVEL, le=MAX_LEVEL, description=_LEVEL_DESCRIPTION)
    urgency: int | None = Field(default=None, ge=MIN_LEVEL, le=MAX_LEVEL, description=_LEVEL_DESCRIPTION)
    status: DemandStatus | None = None


class DemandStatusUpdate(CamelCaseModel):
    """Corpo do endpoint dedicado à troca de status."""

    status: DemandStatus


class DemandListParams(CamelCaseModel):
    """Filtros, busca, ordenação e paginação aceitos na listagem."""

    status: DemandStatus | None = Field(default=None, description="Filtra pelo status exato.")
    requester: str | None = Field(default=None, description="Filtra pelo solicitante (busca parcial).")
    impact: int | None = Field(
        default=None, ge=MIN_LEVEL, le=MAX_LEVEL, description="Filtra pelo nível de impacto exato."
    )
    search: str | None = Field(default=None, description="Busca parcial pelo título da demanda.")
    sort: DemandSortField = Field(default=DemandSortField.PRIORITY, description="Campo de ordenação.")
    order: SortOrder = Field(default=SortOrder.DESC, description="Direção da ordenação.")
    page: int = Field(default=1, ge=1, description="Página desejada, começando em 1.")
    limit: int = Field(
        default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Itens por página."
    )


class DemandResponse(CamelCaseModel):
    """Representação de uma demanda devolvida pela API."""

    id: int
    title: str
    description: str
    requester: str
    impact: int
    urgency: int
    status: DemandStatus
    priority_score: int
    created_at: datetime
    updated_at: datetime


class DemandStatusChangeResponse(CamelCaseModel):
    """Um evento da linha do tempo da demanda.

    `fromStatus` é nulo no evento de cadastro, que não parte de status anterior.
    """

    id: int
    from_status: DemandStatus | None
    to_status: DemandStatus
    changed_at: datetime


class DemandSummary(CamelCaseModel):
    """Resumo exibido no topo do painel.

    Inclui as canceladas para que a soma dos estados feche com o total.
    """

    total: int
    pending: int
    in_progress: int
    completed: int
    cancelled: int
