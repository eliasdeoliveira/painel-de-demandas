"""Tradução de exceções em respostas HTTP com formato único.

Centralizar isso aqui mantém os services livres de detalhes de transporte e
garante que todo erro da API tenha sempre o mesmo corpo.
"""

import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import ApplicationError
from app.core.schemas import ErrorBody, ErrorDetail, ErrorResponse

logger = logging.getLogger(__name__)


def _error_response(
    status_code: int, code: str, message: str, details: list[ErrorDetail] | None = None
) -> JSONResponse:
    payload = ErrorResponse(error=ErrorBody(code=code, message=message, details=details or []))
    return JSONResponse(status_code=status_code, content=payload.model_dump(by_alias=True))


def _status_code_to_error_code(status_code: int) -> str:
    try:
        return HTTPStatus(status_code).phrase.lower().replace(" ", "_")
    except ValueError:
        return "http_error"


def _field_path(location: tuple[int | str, ...]) -> str:
    """Converte a localização do Pydantic em um caminho legível para o cliente.

    O primeiro elemento indica a origem do dado (`body`, `query`, `path`) e não
    interessa a quem preenche o formulário, então é descartado.
    """
    return ".".join(str(part) for part in location[1:]) or "body"


async def _handle_application_error(_: Request, exc: ApplicationError) -> JSONResponse:
    return _error_response(exc.status_code, exc.code, exc.message)


async def _handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        ErrorDetail(field=_field_path(error["loc"]), message=error["msg"]) for error in exc.errors()
    ]
    return _error_response(422, "validation_error", "Dados inválidos na requisição.", details)


async def _handle_http_exception(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    return _error_response(exc.status_code, _status_code_to_error_code(exc.status_code), str(exc.detail))


async def _handle_unexpected_error(_: Request, exc: Exception) -> JSONResponse:
    # A mensagem original é registrada no log, mas nunca devolvida ao cliente,
    # para não expor detalhes internos da aplicação.
    logger.exception("Erro não tratado durante a requisição", exc_info=exc)
    return _error_response(500, "internal_error", "Erro interno no servidor.")


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApplicationError, _handle_application_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(Exception, _handle_unexpected_error)
