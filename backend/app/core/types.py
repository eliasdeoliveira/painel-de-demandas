"""Tipos de coluna reutilizáveis pelos modelos."""

from datetime import UTC, datetime

from sqlalchemy import DateTime
from sqlalchemy.engine import Dialect
from sqlalchemy.types import TypeDecorator


class UtcDateTime(TypeDecorator):
    """Data e hora sempre persistida e devolvida em UTC.

    O SQLite não guarda o fuso horário, então um `datetime` com timezone entra e
    sai ingênuo do banco. Isso faria o frontend interpretar a data como horário
    local e exibir a data de criação deslocada. Este tipo normaliza a conversão
    em um único lugar: grava sempre o instante em UTC e devolve sempre um
    `datetime` consciente do fuso.
    """

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=UTC)


def utc_now() -> datetime:
    """Instante atual em UTC, usado como default das colunas de data."""
    return datetime.now(UTC)
