"""Verificação de que o banco está pronto antes de a API começar a atender."""

from sqlalchemy import Engine, inspect

from app.core.database import Base


class SchemaNotReadyError(RuntimeError):
    """O banco não tem o schema que a aplicação espera."""


def find_missing_tables(engine: Engine) -> list[str]:
    """Tabelas declaradas pelos modelos que ainda não existem no banco."""
    existing_tables = set(inspect(engine).get_table_names())
    return sorted(set(Base.metadata.tables) - existing_tables)


def assert_schema_is_ready(engine: Engine) -> None:
    """Impede a API de subir com o banco desatualizado.

    Sem esta checagem a aplicação inicia normalmente e só quebra na primeira
    requisição, com um erro de SQL no meio de um traceback longo que não diz o
    que fazer. Aqui a falha acontece na subida, com a instrução na mensagem.

    A verificação é por tabela, não por coluna: cobre os dois casos que
    acontecem de verdade — banco nunca migrado e módulo novo sem migration — sem
    reimplementar a comparação completa que o Alembic já faz em `alembic check`.
    """
    missing_tables = find_missing_tables(engine)
    if not missing_tables:
        return

    raise SchemaNotReadyError(
        "O banco de dados não está com o schema esperado. "
        f"Tabelas ausentes: {', '.join(missing_tables)}. "
        "Rode as migrations antes de subir a API: alembic upgrade head"
    )
