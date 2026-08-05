"""Schemas compartilhados por todos os módulos da aplicação."""

from math import ceil

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelCaseModel(BaseModel):
    """Base que expõe os campos em camelCase, mantendo snake_case no Python.

    O consumidor da API é um frontend TypeScript, então o contrato HTTP usa a
    convenção da linguagem que o consome, sem contaminar o código Python.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        # Espaços nas pontas de um campo de texto são sempre digitação acidental
        # e não devem chegar ao banco nem furar o tamanho mínimo exigido.
        str_strip_whitespace=True,
    )


class Page[ItemT](CamelCaseModel):
    """Envelope de resposta paginada."""

    items: list[ItemT]
    page: int
    limit: int
    total: int
    total_pages: int

    @classmethod
    def create(cls, items: list[ItemT], page: int, limit: int, total: int) -> "Page[ItemT]":
        return cls(
            items=items,
            page=page,
            limit=limit,
            total=total,
            total_pages=ceil(total / limit) if total else 0,
        )


class ErrorDetail(CamelCaseModel):
    """Detalhe de um campo específico que falhou na validação."""

    field: str
    message: str


class ErrorBody(CamelCaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = []


class ErrorResponse(CamelCaseModel):
    """Formato único de erro devolvido pela API."""

    error: ErrorBody
