"""Conexão com o banco, sessão e base declarativa do SQLAlchemy."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# O SQLite recusa, por padrão, o uso de uma conexão fora da thread que a criou.
# O FastAPI executa endpoints síncronos em um pool de threads, então a checagem
# precisa ser desligada. Cada requisição usa sua própria sessão, então não há
# compartilhamento real de conexão entre threads.
_is_sqlite = settings.database_url.startswith("sqlite")
_connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_engine(settings.database_url, connect_args=_connect_args)

SessionFactory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base declarativa compartilhada por todos os modelos da aplicação."""


def get_session() -> Generator[Session]:
    """Dependência do FastAPI que abre uma sessão por requisição e a fecha ao final."""
    session = SessionFactory()
    try:
        yield session
    finally:
        session.close()
