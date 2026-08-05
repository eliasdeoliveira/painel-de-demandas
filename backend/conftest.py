"""Fixtures compartilhadas por todos os testes do backend."""

import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import to_sqlalchemy_url
from app.core.database import Base, get_session
from app.main import app

# Importar o módulo registra a tabela no metadata do Base, condição para o
# `create_all` abaixo criar o schema do banco de teste.
from app.modules.demands import models  # noqa: F401
from app.modules.demands.repository import DemandRepository
from app.modules.demands.service import DemandService

# Por padrão a suíte roda contra SQLite em memória, que é rápido e não exige
# nenhum serviço. Apontando TEST_DATABASE_URL para um PostgreSQL, os mesmos
# testes rodam contra o banco usado em produção — é assim que se verifica que o
# código não depende de dialeto, sem impor um banco a quem só quer rodar a
# suíte. Ver a seção de testes em docs/ESTRUTURA.md.
TEST_DATABASE_URL = to_sqlalchemy_url(os.getenv("TEST_DATABASE_URL", "sqlite://"))


def _build_test_engine() -> Engine:
    if TEST_DATABASE_URL.startswith("sqlite"):
        # O StaticPool mantém a mesma conexão viva enquanto o teste roda: sem
        # ele, cada conexão nova abriria um banco em memória vazio e diferente.
        return create_engine(
            TEST_DATABASE_URL,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    return create_engine(TEST_DATABASE_URL)


@pytest.fixture
def session() -> Iterator[Session]:
    """Sessão ligada a um banco recriado a cada teste."""
    engine = _build_test_engine()

    # O drop antes do create limpa resíduo de uma execução interrompida. Em
    # banco em memória é inócuo; em PostgreSQL é o que garante isolamento.
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with factory() as session:
        yield session

    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def demand_service(session: Session) -> DemandService:
    return DemandService(DemandRepository(session))


@pytest.fixture
def client(session: Session) -> Iterator[TestClient]:
    """Cliente HTTP com o banco da aplicação trocado pelo banco de teste.

    O `TestClient` é usado sem `with` de propósito: assim o `lifespan` não roda.
    Ele existe para conferir o schema do banco real antes de a API subir, e aqui
    o banco é o de teste, criado pela fixture `session`. A verificação em si é
    testada isoladamente em `app/core/tests/test_schema.py`.
    """
    app.dependency_overrides[get_session] = lambda: session
    yield TestClient(app)
    app.dependency_overrides.clear()
