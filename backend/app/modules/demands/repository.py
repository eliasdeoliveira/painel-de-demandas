"""Acesso ao banco de dados do módulo de demandas.

Esta camada só traduz intenções em consultas SQL. Nenhuma regra de negócio
mora aqui — ver `app.modules.demands.service`.
"""

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.modules.demands.models import Demand, DemandStatus
from app.modules.demands.schemas import DemandListParams, DemandSortField, SortOrder

_SORT_COLUMNS = {
    DemandSortField.PRIORITY: Demand.priority_score,
    DemandSortField.CREATED_AT: Demand.created_at,
    DemandSortField.IMPACT: Demand.impact,
    DemandSortField.URGENCY: Demand.urgency,
    DemandSortField.TITLE: Demand.title,
    DemandSortField.STATUS: Demand.status,
}


class DemandRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def persist(self, demand: Demand) -> Demand:
        """Grava a demanda (nova ou alterada) e devolve o estado atualizado."""
        self._session.add(demand)
        self._session.commit()
        self._session.refresh(demand)
        return demand

    def remove(self, demand: Demand) -> None:
        self._session.delete(demand)
        self._session.commit()

    def find_by_id(self, demand_id: int) -> Demand | None:
        return self._session.get(Demand, demand_id)

    def find_many(self, params: DemandListParams) -> tuple[list[Demand], int]:
        """Devolve a página pedida e o total de registros que atendem aos filtros."""
        filtered = self._apply_filters(select(Demand), params)

        total = self._session.scalar(
            select(func.count()).select_from(filtered.subquery())
        )

        ordered = filtered.order_by(*self._build_ordering(params))
        offset = (params.page - 1) * params.limit
        demands = self._session.scalars(ordered.offset(offset).limit(params.limit)).all()

        return list(demands), total or 0

    def count_by_status(self) -> dict[DemandStatus, int]:
        """Conta as demandas agrupadas por status, em uma única consulta."""
        rows = self._session.execute(
            select(Demand.status, func.count(Demand.id)).group_by(Demand.status)
        ).all()
        return {status: count for status, count in rows}

    @staticmethod
    def _apply_filters(statement: Select, params: DemandListParams) -> Select:
        if params.status is not None:
            statement = statement.where(Demand.status == params.status)
        if params.impact is not None:
            statement = statement.where(Demand.impact == params.impact)
        if params.requester:
            statement = statement.where(Demand.requester.ilike(f"%{params.requester}%"))
        if params.search:
            statement = statement.where(Demand.title.ilike(f"%{params.search}%"))
        return statement

    @staticmethod
    def _build_ordering(params: DemandListParams) -> tuple:
        column = _SORT_COLUMNS[params.sort]
        direction = column.asc() if params.order is SortOrder.ASC else column.desc()
        # O id decrescente é o critério de desempate: sem uma ordem total, duas
        # páginas consecutivas poderiam repetir ou omitir demandas empatadas.
        return (direction, Demand.id.desc())
