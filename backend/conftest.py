"""Fixtures compartilhadas por todos os testes do backend."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_session
from app.main import app

# Importar o módulo registra a tabela no metadata do Base, condição para o
# `create_all` abaixo criar o schema do banco de teste.
from app.modules.demands import models  # noqa: F401
from app.modules.demands.repository import DemandRepository
from app.modules.demands.service import DemandService


@pytest.fixture
def session() -> Iterator[Session]:
    """Sessão ligada a um banco em memória, recriado a cada teste.

    O `StaticPool` mantém a mesma conexão viva enquanto o teste roda: sem ele,
    cada conexão nova abriria um banco em memória vazio e diferente.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with factory() as session:
        yield session

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
