"""Regras de negócio do módulo de demandas.

Todo o comportamento do domínio está concentrado aqui: as rotas apenas
traduzem HTTP e o repositório apenas fala com o banco.
"""

from app.core.exceptions import ResourceNotFoundError
from app.modules.demands.models import Demand, DemandStatus, DemandStatusChange
from app.modules.demands.priority import calculate_priority_score
from app.modules.demands.repository import DemandRepository
from app.modules.demands.schemas import (
    DemandCreate,
    DemandListParams,
    DemandStatusUpdate,
    DemandSummary,
    DemandUpdate,
)


class DemandService:
    def __init__(self, repository: DemandRepository) -> None:
        self._repository = repository

    def create(self, payload: DemandCreate) -> Demand:
        """Cadastra uma demanda já pontuada e com status inicial pendente."""
        demand = Demand(
            title=payload.title,
            description=payload.description,
            requester=payload.requester,
            impact=payload.impact,
            urgency=payload.urgency,
            status=DemandStatus.PENDING,
            priority_score=calculate_priority_score(payload.impact, payload.urgency),
        )
        # O cadastro abre a linha do tempo: sem este evento, o histórico começaria
        # pela primeira troca e não mostraria quando a demanda nasceu pendente.
        demand.status_changes.append(
            DemandStatusChange(from_status=None, to_status=DemandStatus.PENDING)
        )
        return self._repository.persist(demand)

    def get(self, demand_id: int) -> Demand:
        demand = self._repository.find_by_id(demand_id)
        if demand is None:
            raise ResourceNotFoundError(f"Demanda {demand_id} não encontrada.")
        return demand

    # O nome não é `list` de propósito: um método com nome de builtin passa a
    # sombrear o builtin dentro do corpo da classe, e qualquer anotação
    # posterior que use `list[...]` quebraria ao criar a classe.
    def list_demands(self, params: DemandListParams) -> tuple[list[Demand], int]:
        return self._repository.find_many(params)

    def update(self, demand_id: int, payload: DemandUpdate) -> Demand:
        """Aplica uma alteração parcial e mantém a prioridade coerente.

        A pontuação é sempre recalculada a partir do estado final da demanda, o
        que dispensa verificar se impacto ou urgência estavam entre os campos
        enviados e elimina a chance de o valor persistido ficar defasado.
        """
        demand = self.get(demand_id)
        changed_fields = payload.model_dump(exclude_unset=True)
        if not changed_fields:
            return demand

        # O status sai do laço porque mudá-lo também gera um evento de histórico.
        new_status = changed_fields.pop("status", None)
        for field, value in changed_fields.items():
            setattr(demand, field, value)
        if new_status is not None:
            self._apply_status(demand, new_status)

        demand.priority_score = calculate_priority_score(demand.impact, demand.urgency)

        return self._repository.persist(demand)

    def change_status(self, demand_id: int, payload: DemandStatusUpdate) -> Demand:
        demand = self.get(demand_id)
        self._apply_status(demand, payload.status)
        return self._repository.persist(demand)

    def list_status_history(self, demand_id: int) -> list[DemandStatusChange]:
        """Linha do tempo da demanda, do cadastro à última troca.

        Passa por `get` para que uma demanda inexistente resulte em 404, e não em
        uma lista vazia — que seria indistinguível de uma demanda sem histórico.
        """
        return self.get(demand_id).status_changes

    @staticmethod
    def _apply_status(demand: Demand, new_status: DemandStatus) -> None:
        """Troca o status registrando o evento correspondente.

        Reenviar o status atual é tratado como operação sem efeito: registrar
        uma transição de um valor para ele mesmo poluiria a linha do tempo.
        """
        if demand.status == new_status:
            return

        demand.status_changes.append(
            DemandStatusChange(from_status=demand.status, to_status=new_status)
        )
        demand.status = new_status

    def delete(self, demand_id: int) -> None:
        self._repository.remove(self.get(demand_id))

    def summarize(self) -> DemandSummary:
        """Monta o resumo do painel a partir da contagem por status."""
        counts = self._repository.count_by_status()
        return DemandSummary(
            total=sum(counts.values()),
            pending=counts.get(DemandStatus.PENDING, 0),
            in_progress=counts.get(DemandStatus.IN_PROGRESS, 0),
            completed=counts.get(DemandStatus.COMPLETED, 0),
            cancelled=counts.get(DemandStatus.CANCELLED, 0),
        )
