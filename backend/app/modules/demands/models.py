"""Modelo de persistência da demanda de produto."""

import enum
from datetime import datetime

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.types import UtcDateTime, utc_now
from app.modules.demands.priority import MAX_LEVEL, MIN_LEVEL

TITLE_MAX_LENGTH = 120
DESCRIPTION_MAX_LENGTH = 2000
REQUESTER_MAX_LENGTH = 80


class DemandStatus(enum.StrEnum):
    """Estados possíveis de uma demanda.

    Os códigos ficam em inglês para manter o domínio estável; a tradução para
    "Pendente", "Em andamento", "Concluída" e "Cancelada" é responsabilidade da
    camada de apresentação.
    """

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# O tipo é declarado uma vez e reaproveitado pelas colunas de status das duas
# tabelas, para que a lista de valores aceitos exista em um lugar só.
DEMAND_STATUS_TYPE = Enum(
    DemandStatus,
    name="demand_status",
    native_enum=False,
    length=20,
    # Sem isto o SQLAlchemy persistiria o nome do membro (PENDING) em vez do
    # valor exposto pela API (pending).
    values_callable=lambda enum_class: [member.value for member in enum_class],
)


class Demand(Base):
    __tablename__ = "demands"

    __table_args__ = (
        CheckConstraint(f"impact BETWEEN {MIN_LEVEL} AND {MAX_LEVEL}", name="ck_demands_impact_range"),
        CheckConstraint(f"urgency BETWEEN {MIN_LEVEL} AND {MAX_LEVEL}", name="ck_demands_urgency_range"),
        # A listagem padrão ordena por prioridade decrescente e desempata pela
        # demanda mais recente; o índice composto atende exatamente esse acesso.
        Index("ix_demands_priority_score_created_at", "priority_score", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(TITLE_MAX_LENGTH))
    description: Mapped[str] = mapped_column(String(DESCRIPTION_MAX_LENGTH))
    requester: Mapped[str] = mapped_column(String(REQUESTER_MAX_LENGTH), index=True)
    impact: Mapped[int]
    urgency: Mapped[int]
    status: Mapped[DemandStatus] = mapped_column(
        DEMAND_STATUS_TYPE, default=DemandStatus.PENDING, index=True
    )

    # Valor derivado de impacto e urgência, persistido para que a ordenação e a
    # paginação aconteçam no banco. O service é o único responsável por mantê-lo
    # em sincronia — ver `DemandService`. O índice vem do composto declarado em
    # __table_args__, que já cobre as consultas só por prioridade.
    priority_score: Mapped[int] = mapped_column()

    created_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utc_now, onupdate=utc_now)

    # Anexar o evento à demanda, em vez de gravá-lo separadamente, faz com que os
    # dois entrem no mesmo commit sem nenhum esforço extra do service. O cascade
    # garante que remover a demanda leve o histórico junto.
    status_changes: Mapped[list["DemandStatusChange"]] = relationship(
        back_populates="demand",
        cascade="all, delete-orphan",
        order_by="DemandStatusChange.id",
    )


class DemandStatusChange(Base):
    """Registro imutável de uma transição de status.

    A tabela é somente de acréscimo: um evento nunca é alterado nem removido
    isoladamente. Como a aplicação não tem autenticação, o registro guarda o quê
    e quando, mas não quem — inventar um autor seria pior do que não ter.
    """

    __tablename__ = "demand_status_changes"

    id: Mapped[int] = mapped_column(primary_key=True)
    demand_id: Mapped[int] = mapped_column(
        ForeignKey("demands.id", ondelete="CASCADE"), index=True
    )

    # Nulo somente no evento de cadastro, que não parte de nenhum status anterior.
    from_status: Mapped[DemandStatus | None] = mapped_column(DEMAND_STATUS_TYPE)
    to_status: Mapped[DemandStatus] = mapped_column(DEMAND_STATUS_TYPE)

    changed_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utc_now)

    demand: Mapped["Demand"] = relationship(back_populates="status_changes")
