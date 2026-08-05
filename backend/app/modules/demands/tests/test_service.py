"""Testes das regras de negócio do serviço de demandas."""

import builtins

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundError
from app.modules.demands.models import DemandStatus, DemandStatusChange
from app.modules.demands.repository import DemandRepository
from app.modules.demands.schemas import (
    DemandListParams,
    DemandSortField,
    DemandStatusUpdate,
    DemandUpdate,
    SortOrder,
)
from app.modules.demands.service import DemandService
from app.modules.demands.tests.factories import demand_create


@pytest.mark.parametrize("subject", [DemandService, DemandRepository])
def test_methods_do_not_shadow_builtin_names(subject: type):
    """Nenhum método pode ter nome de builtin.

    Um método chamado `list`, por exemplo, passa a sombrear o builtin dentro do
    corpo da classe. No Python 3.13, que avalia as anotações na criação da
    classe, qualquer anotação seguinte com `list[...]` faz a importação do
    módulo falhar — a aplicação nem sobe. No 3.14 a avaliação é adiada e o
    problema fica invisível, então este teste é a guarda que funciona em
    qualquer versão.
    """
    shadowed_names = [
        name
        for name in vars(subject)
        if not name.startswith("_") and hasattr(builtins, name)
    ]

    assert shadowed_names == []


def test_create_calculates_priority_on_the_server(demand_service: DemandService):
    demand = demand_service.create(demand_create(impact=4, urgency=3))

    assert demand.priority_score == 11


def test_create_starts_every_demand_as_pending(demand_service: DemandService):
    demand = demand_service.create(demand_create())

    assert demand.status is DemandStatus.PENDING


def test_get_raises_when_the_demand_does_not_exist(demand_service: DemandService):
    with pytest.raises(ResourceNotFoundError):
        demand_service.get(404)


def test_update_recalculates_priority_when_impact_changes(demand_service: DemandService):
    demand = demand_service.create(demand_create(impact=1, urgency=1))

    updated = demand_service.update(demand.id, DemandUpdate(impact=5))

    assert updated.impact == 5
    assert updated.priority_score == 11


def test_update_only_touches_the_fields_that_were_sent(demand_service: DemandService):
    demand = demand_service.create(demand_create(title="Título original", requester="Ana Souza"))

    updated = demand_service.update(demand.id, DemandUpdate(title="Título revisado"))

    assert updated.title == "Título revisado"
    assert updated.requester == "Ana Souza"


def test_update_without_any_field_keeps_the_demand_unchanged(demand_service: DemandService):
    demand = demand_service.create(demand_create())
    original_updated_at = demand.updated_at

    updated = demand_service.update(demand.id, DemandUpdate())

    assert updated.updated_at == original_updated_at


def test_change_status_persists_the_new_status(demand_service: DemandService):
    demand = demand_service.create(demand_create())

    updated = demand_service.change_status(
        demand.id, DemandStatusUpdate(status=DemandStatus.COMPLETED)
    )

    assert updated.status is DemandStatus.COMPLETED


def test_delete_removes_the_demand(demand_service: DemandService):
    demand = demand_service.create(demand_create())

    demand_service.delete(demand.id)

    with pytest.raises(ResourceNotFoundError):
        demand_service.get(demand.id)


def test_delete_raises_when_the_demand_does_not_exist(demand_service: DemandService):
    with pytest.raises(ResourceNotFoundError):
        demand_service.delete(404)


def test_list_orders_by_priority_from_highest_to_lowest(demand_service: DemandService):
    demand_service.create(demand_create(title="Baixa", impact=1, urgency=1))
    demand_service.create(demand_create(title="Alta", impact=5, urgency=5))
    demand_service.create(demand_create(title="Média", impact=3, urgency=2))

    demands, total = demand_service.list_demands(DemandListParams())

    assert total == 3
    assert [demand.title for demand in demands] == ["Alta", "Média", "Baixa"]


def test_list_filters_by_status(demand_service: DemandService):
    kept = demand_service.create(demand_create(title="Em andamento"))
    demand_service.create(demand_create(title="Ainda pendente"))
    demand_service.change_status(kept.id, DemandStatusUpdate(status=DemandStatus.IN_PROGRESS))

    demands, total = demand_service.list_demands(DemandListParams(status=DemandStatus.IN_PROGRESS))

    assert total == 1
    assert demands[0].title == "Em andamento"


def test_list_filters_by_requester_ignoring_case_and_partial_names(
    demand_service: DemandService,
):
    demand_service.create(demand_create(requester="Ana Souza"))
    demand_service.create(demand_create(requester="Bruno Lima"))

    demands, total = demand_service.list_demands(DemandListParams(requester="ana"))

    assert total == 1
    assert demands[0].requester == "Ana Souza"


def test_list_filters_by_impact(demand_service: DemandService):
    demand_service.create(demand_create(impact=5))
    demand_service.create(demand_create(impact=2))

    _, total = demand_service.list_demands(DemandListParams(impact=5))

    assert total == 1


def test_list_searches_by_title(demand_service: DemandService):
    demand_service.create(demand_create(title="Exportar relatório em CSV"))
    demand_service.create(demand_create(title="Ajustar contraste do botão"))

    demands, total = demand_service.list_demands(DemandListParams(search="relatório"))

    assert total == 1
    assert demands[0].title == "Exportar relatório em CSV"


def test_list_combines_filter_and_search(demand_service: DemandService):
    demand_service.create(demand_create(title="Exportar CSV", requester="Ana Souza", impact=5))
    demand_service.create(demand_create(title="Exportar CSV", requester="Bruno Lima", impact=5))
    demand_service.create(demand_create(title="Outro assunto", requester="Ana Souza", impact=5))

    demands, total = demand_service.list_demands(DemandListParams(requester="Ana", search="Exportar"))

    assert total == 1
    assert demands[0].requester == "Ana Souza"


def test_list_supports_configurable_sorting(demand_service: DemandService):
    demand_service.create(demand_create(title="Zebra"))
    demand_service.create(demand_create(title="Abelha"))

    demands, _ = demand_service.list_demands(
        DemandListParams(sort=DemandSortField.TITLE, order=SortOrder.ASC)
    )

    assert [demand.title for demand in demands] == ["Abelha", "Zebra"]


def test_list_paginates_without_repeating_tied_demands(demand_service: DemandService):
    # Todas empatadas em prioridade: sem um critério de desempate estável, a
    # segunda página poderia repetir itens já devolvidos na primeira.
    for index in range(5):
        demand_service.create(demand_create(title=f"Demanda {index}", impact=3, urgency=3))

    first_page, total = demand_service.list_demands(DemandListParams(page=1, limit=2))
    second_page, _ = demand_service.list_demands(DemandListParams(page=2, limit=2))

    assert total == 5
    assert len(first_page) == 2
    assert {demand.id for demand in first_page}.isdisjoint({demand.id for demand in second_page})


def test_list_returns_empty_page_beyond_the_last_one(demand_service: DemandService):
    demand_service.create(demand_create())

    demands, total = demand_service.list_demands(DemandListParams(page=99))

    assert demands == []
    assert total == 1


def test_summarize_counts_demands_by_status(demand_service: DemandService):
    in_progress = demand_service.create(demand_create())
    completed = demand_service.create(demand_create())
    demand_service.create(demand_create())
    demand_service.change_status(in_progress.id, DemandStatusUpdate(status=DemandStatus.IN_PROGRESS))
    demand_service.change_status(completed.id, DemandStatusUpdate(status=DemandStatus.COMPLETED))

    summary = demand_service.summarize()

    assert summary.total == 3
    assert summary.pending == 1
    assert summary.in_progress == 1
    assert summary.completed == 1
    assert summary.cancelled == 0


def test_summarize_returns_zeros_when_there_is_no_demand(demand_service: DemandService):
    summary = demand_service.summarize()

    assert summary.total == 0
    assert summary.pending == 0


def test_create_opens_the_history_with_the_pending_status(demand_service: DemandService):
    demand = demand_service.create(demand_create())

    history = demand_service.list_status_history(demand.id)

    assert len(history) == 1
    assert history[0].from_status is None
    assert history[0].to_status is DemandStatus.PENDING


def test_change_status_records_the_transition(demand_service: DemandService):
    demand = demand_service.create(demand_create())

    demand_service.change_status(demand.id, DemandStatusUpdate(status=DemandStatus.IN_PROGRESS))
    history = demand_service.list_status_history(demand.id)

    assert len(history) == 2
    assert history[-1].from_status is DemandStatus.PENDING
    assert history[-1].to_status is DemandStatus.IN_PROGRESS


def test_history_keeps_every_transition_in_order(demand_service: DemandService):
    demand = demand_service.create(demand_create())

    demand_service.change_status(demand.id, DemandStatusUpdate(status=DemandStatus.IN_PROGRESS))
    demand_service.change_status(demand.id, DemandStatusUpdate(status=DemandStatus.COMPLETED))
    demand_service.change_status(demand.id, DemandStatusUpdate(status=DemandStatus.CANCELLED))

    history = demand_service.list_status_history(demand.id)

    assert [event.to_status for event in history] == [
        DemandStatus.PENDING,
        DemandStatus.IN_PROGRESS,
        DemandStatus.COMPLETED,
        DemandStatus.CANCELLED,
    ]


def test_resending_the_current_status_does_not_pollute_the_history(demand_service: DemandService):
    demand = demand_service.create(demand_create())

    demand_service.change_status(demand.id, DemandStatusUpdate(status=DemandStatus.PENDING))

    assert len(demand_service.list_status_history(demand.id)) == 1


def test_update_that_changes_the_status_also_records_the_event(demand_service: DemandService):
    demand = demand_service.create(demand_create())

    demand_service.update(demand.id, DemandUpdate(status=DemandStatus.COMPLETED))
    history = demand_service.list_status_history(demand.id)

    assert len(history) == 2
    assert history[-1].to_status is DemandStatus.COMPLETED


def test_update_without_touching_the_status_does_not_record_an_event(demand_service: DemandService):
    demand = demand_service.create(demand_create())

    demand_service.update(demand.id, DemandUpdate(title="Outro título", impact=5))

    assert len(demand_service.list_status_history(demand.id)) == 1


def test_status_history_of_an_unknown_demand_raises(demand_service: DemandService):
    with pytest.raises(ResourceNotFoundError):
        demand_service.list_status_history(404)


def test_deleting_a_demand_removes_its_history(demand_service: DemandService, session: Session):
    demand = demand_service.create(demand_create())
    demand_service.change_status(demand.id, DemandStatusUpdate(status=DemandStatus.COMPLETED))

    demand_service.delete(demand.id)

    remaining_events = session.scalar(select(func.count()).select_from(DemandStatusChange))
    assert remaining_events == 0
