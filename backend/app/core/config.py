"""Configuração da aplicação, carregada de variáveis de ambiente."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações da aplicação.

    Os valores padrão descrevem o ambiente de desenvolvimento local, de modo que
    a aplicação suba sem nenhum arquivo `.env`. Em outros ambientes, cada campo
    pode ser sobrescrito por uma variável de ambiente de mesmo nome.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Zeeway - Painel de Demandas"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"

    database_url: str = "sqlite:///./zeeway.db"

    # Lista separada por vírgula. Uma string é mais simples de definir em
    # docker-compose e em painéis de deploy do que o JSON exigido por list[str].
    cors_allowed_origins: str = "http://localhost:3000"

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Retorna as configurações em cache, para não reler o ambiente a cada acesso."""
    return Settings()
