"""Exceções de domínio da aplicação.

Os módulos de negócio levantam essas exceções sem conhecer o FastAPI. A tradução
para uma resposta HTTP acontece em um único lugar: `app.core.error_handlers`.
"""


class ApplicationError(Exception):
    """Erro esperado da aplicação, com código e status HTTP associados."""

    status_code = 500
    code = "internal_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class ResourceNotFoundError(ApplicationError):
    """O recurso solicitado não existe."""

    status_code = 404
    code = "resource_not_found"
