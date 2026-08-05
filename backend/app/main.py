"""Ponto de entrada da API do Painel de Demandas."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import engine
from app.core.error_handlers import register_error_handlers
from app.core.schema import assert_schema_is_ready
from app.modules.demands.routes import router as demands_router

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Recusa iniciar com o banco sem as tabelas, em vez de errar na primeira requisição."""
    assert_schema_is_ready(engine)
    yield


def create_app() -> FastAPI:
    """Monta a aplicação.

    Existe como função (e não como módulo com efeito colateral) para que os
    testes possam construir instâncias isoladas quando necessário.
    """
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="API de gerenciamento e priorização de demandas de produto.",
        docs_url="/docs",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_error_handlers(app)

    @app.get("/health", tags=["Infraestrutura"], summary="Verifica se a API está no ar")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(demands_router, prefix=settings.api_prefix)

    return app


app = create_app()
