"""Endpoints HTTP do módulo de demandas.

As rotas apenas recebem a requisição, delegam ao service e devolvem a resposta.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.core.schemas import ErrorResponse, Page
from app.modules.demands.repository import DemandRepository
from app.modules.demands.schemas import (
    DemandCreate,
    DemandListParams,
    DemandResponse,
    DemandStatusChangeResponse,
    DemandStatusUpdate,
    DemandSummary,
    DemandUpdate,
)
from app.modules.demands.service import DemandService


def get_demand_service(session: Annotated[Session, Depends(get_session)]) -> DemandService:
    return DemandService(DemandRepository(session))


ServiceDep = Annotated[DemandService, Depends(get_demand_service)]
ListParamsDep = Annotated[DemandListParams, Query()]

NOT_FOUND_RESPONSE = {
    status.HTTP_404_NOT_FOUND: {"model": ErrorResponse, "description": "Demanda não encontrada."}
}
INVALID_PAYLOAD_RESPONSE = {
    status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ErrorResponse, "description": "Dados inválidos."}
}

router = APIRouter(prefix="/demands", tags=["Demandas"])


@router.get(
    "",
    response_model=Page[DemandResponse],
    responses=INVALID_PAYLOAD_RESPONSE,
    summary="Lista demandas com filtros, busca, ordenação e paginação",
)
def list_demands(params: ListParamsDep, service: ServiceDep) -> Page[DemandResponse]:
    demands, total = service.list_demands(params)
    return Page.create(
        items=[DemandResponse.model_validate(demand) for demand in demands],
        page=params.page,
        limit=params.limit,
        total=total,
    )


# Precisa ser declarada antes de "/{demand_id}", senão "summary" seria
# interpretado como identificador de demanda.
@router.get("/summary", response_model=DemandSummary, summary="Resumo das demandas por status")
def summarize_demands(service: ServiceDep) -> DemandSummary:
    return service.summarize()


@router.post(
    "",
    response_model=DemandResponse,
    status_code=status.HTTP_201_CREATED,
    responses=INVALID_PAYLOAD_RESPONSE,
    summary="Cadastra uma demanda",
)
def create_demand(payload: DemandCreate, service: ServiceDep) -> DemandResponse:
    return service.create(payload)


@router.get(
    "/{demand_id}",
    response_model=DemandResponse,
    responses=NOT_FOUND_RESPONSE,
    summary="Consulta uma demanda",
)
def get_demand(demand_id: int, service: ServiceDep) -> DemandResponse:
    return service.get(demand_id)


@router.patch(
    "/{demand_id}",
    response_model=DemandResponse,
    responses=NOT_FOUND_RESPONSE | INVALID_PAYLOAD_RESPONSE,
    summary="Atualiza parcialmente uma demanda",
)
def update_demand(demand_id: int, payload: DemandUpdate, service: ServiceDep) -> DemandResponse:
    return service.update(demand_id, payload)


@router.get(
    "/{demand_id}/status-history",
    response_model=list[DemandStatusChangeResponse],
    responses=NOT_FOUND_RESPONSE,
    summary="Lista o histórico de alterações de status de uma demanda",
)
def list_demand_status_history(
    demand_id: int, service: ServiceDep
) -> list[DemandStatusChangeResponse]:
    # Sem paginação de propósito: o histórico de uma demanda é curto por
    # natureza e cabe inteiro em uma resposta.
    return service.list_status_history(demand_id)


@router.patch(
    "/{demand_id}/status",
    response_model=DemandResponse,
    responses=NOT_FOUND_RESPONSE | INVALID_PAYLOAD_RESPONSE,
    summary="Altera o status de uma demanda",
)
def change_demand_status(
    demand_id: int, payload: DemandStatusUpdate, service: ServiceDep
) -> DemandResponse:
    return service.change_status(demand_id, payload)


@router.delete(
    "/{demand_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=NOT_FOUND_RESPONSE,
    summary="Remove uma demanda",
)
def delete_demand(demand_id: int, service: ServiceDep) -> None:
    service.delete(demand_id)
