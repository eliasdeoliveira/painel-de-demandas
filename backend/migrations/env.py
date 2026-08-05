"""Ambiente de execução das migrations do Alembic."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings
from app.core.database import Base
from app.core.types import UtcDateTime

# Importar o módulo registra o modelo no metadata do Base, o que permite ao
# autogenerate enxergar a tabela. Cada novo módulo da aplicação deve ser
# importado aqui.
from app.modules.demands import models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# A URL vem das configurações da aplicação, e não do alembic.ini, para que
# exista uma única fonte de verdade e nenhuma credencial no arquivo versionado.
config.set_main_option("sqlalchemy.url", get_settings().database_url)

target_metadata = Base.metadata


def render_item(item_type: str, obj: object, autogen_context) -> str | bool:
    """Renderiza tipos customizados pelo tipo real que eles criam no banco.

    Sem isto, o autogenerate escreveria `app.core.types.UtcDateTime()` nas
    migrations, acoplando o histórico do schema ao código da aplicação. No
    banco, a coluna é apenas um DATETIME.
    """
    if item_type == "type" and isinstance(obj, UtcDateTime):
        # `sa` já é importado pelo template das migrations.
        return "sa.DateTime()"
    return False


def run_migrations_offline() -> None:
    """Gera o SQL das migrations sem abrir conexão com o banco."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_item=render_item,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Aplica as migrations conectado ao banco."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_item=render_item,
            # O SQLite não suporta a maior parte dos ALTER TABLE; o modo batch
            # recria a tabela quando necessário.
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
