"""Testes da verificação de schema executada na subida da API."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.core.schema import SchemaNotReadyError, assert_schema_is_ready, find_missing_tables

# Importar o módulo registra as tabelas no metadata do Base.
from app.modules.demands import models  # noqa: F401


def build_engine():
    return create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )


def test_reports_every_table_that_is_missing():
    engine = build_engine()

    assert find_missing_tables(engine) == ["demand_status_changes", "demands"]


def test_reports_nothing_when_the_schema_is_created():
    engine = build_engine()
    Base.metadata.create_all(engine)

    assert find_missing_tables(engine) == []


def test_blocks_startup_when_the_database_was_never_migrated():
    engine = build_engine()

    with pytest.raises(SchemaNotReadyError) as failure:
        assert_schema_is_ready(engine)

    # A mensagem precisa dizer o que fazer: é o único retorno que a pessoa vê.
    assert "alembic upgrade head" in str(failure.value)
    assert "demands" in str(failure.value)


def test_allows_startup_when_the_schema_is_ready():
    engine = build_engine()
    Base.metadata.create_all(engine)

    # Não levantar é o comportamento esperado: a API segue subindo.
    assert_schema_is_ready(engine)
