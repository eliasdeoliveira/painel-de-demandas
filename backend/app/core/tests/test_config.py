"""Testes das configurações que o deploy depende para funcionar."""

import pytest

from app.core.config import Settings, to_sqlalchemy_url


def build_settings(**overrides) -> Settings:
    """Configurações a partir de valores explícitos, sem ler o ambiente."""
    return Settings(_env_file=None, **overrides)


class TestAllowedOrigins:
    def test_accepts_a_single_origin(self):
        settings = build_settings(cors_allowed_origins="http://localhost:3000")

        assert settings.allowed_origins == ["http://localhost:3000"]

    def test_accepts_several_origins_separated_by_comma(self):
        """Permite atender o domínio publicado e a execução local ao mesmo tempo."""
        settings = build_settings(
            cors_allowed_origins="https://painel.exemplo.com,http://localhost:3000"
        )

        assert settings.allowed_origins == ["https://painel.exemplo.com", "http://localhost:3000"]

    def test_ignores_spaces_around_the_separator(self):
        settings = build_settings(
            cors_allowed_origins=" https://painel.exemplo.com , http://localhost:3000 "
        )

        assert settings.allowed_origins == ["https://painel.exemplo.com", "http://localhost:3000"]

    def test_ignores_empty_entries(self):
        settings = build_settings(cors_allowed_origins="https://painel.exemplo.com,,")

        assert settings.allowed_origins == ["https://painel.exemplo.com"]

    def test_returns_nothing_when_no_origin_is_configured(self):
        # Sem origem liberada, nenhum navegador consegue consumir a API — é uma
        # configuração inválida, e a lista vazia deixa isso explícito.
        assert build_settings(cors_allowed_origins="").allowed_origins == []


class TestSqlalchemyUrl:
    @pytest.mark.parametrize("scheme", ["postgresql", "postgres"])
    def test_translates_provider_schemes_to_the_installed_driver(self, scheme: str):
        """Provedores entregam a URL num esquema que aponta para outro driver."""
        translated = to_sqlalchemy_url(f"{scheme}://usuario:senha@host:5432/banco")

        assert translated == "postgresql+psycopg://usuario:senha@host:5432/banco"

    def test_preserves_query_parameters_like_sslmode(self):
        translated = to_sqlalchemy_url("postgresql://u:s@host/banco?sslmode=require")

        assert translated.endswith("/banco?sslmode=require")
        assert translated.startswith("postgresql+psycopg://")

    def test_leaves_sqlite_untouched(self):
        assert to_sqlalchemy_url("sqlite:///./zeeway.db") == "sqlite:///./zeeway.db"

    def test_does_not_translate_an_already_explicit_dialect(self):
        explicit = "postgresql+psycopg://u:s@host/banco"

        assert to_sqlalchemy_url(explicit) == explicit
