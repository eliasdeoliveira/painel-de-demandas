# API

Documentação interativa gerada pelo FastAPI: <http://localhost:8000/docs>

Prefixo de todas as rotas de negócio: `/api/v1`.

## Convenções

| Assunto | Decisão |
| --- | --- |
| Nomes de campo | `camelCase` no JSON, `snake_case` no Python |
| Datas | ISO 8601 em UTC, sempre com sufixo `Z` |
| Status | Códigos em inglês; a tradução é responsabilidade da interface |
| Prioridade | Calculada no servidor; o valor enviado pelo cliente é ignorado |

### Status possíveis

| Código | Rótulo na interface |
| --- | --- |
| `pending` | Pendente |
| `in_progress` | Em andamento |
| `completed` | Concluída |
| `cancelled` | Cancelada |

### Formato de erro

Toda resposta de erro tem o mesmo corpo:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Dados inválidos na requisição.",
    "details": [{ "field": "impact", "message": "Input should be less than or equal to 5" }]
  }
}
```

`details` só é preenchido em erros de validação.

| Código HTTP | `code` | Quando acontece |
| --- | --- | --- |
| 404 | `resource_not_found` | A demanda informada não existe |
| 422 | `validation_error` | Algum campo não atende às regras |
| 500 | `internal_error` | Erro não previsto; a causa vai para o log, não para a resposta |

---

## `GET /api/v1/demands`

Lista as demandas com filtros, busca, ordenação e paginação.

### Parâmetros de consulta

| Parâmetro | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `status` | enum | — | Filtra pelo status exato |
| `requester` | string | — | Filtra pelo solicitante (contém, ignora maiúsculas) |
| `impact` | int 1–5 | — | Filtra pelo nível de impacto exato |
| `search` | string | — | Busca no título (contém, ignora maiúsculas) |
| `sort` | `priority` \| `createdAt` \| `impact` \| `urgency` \| `title` \| `status` | `priority` | Campo de ordenação |
| `order` | `asc` \| `desc` | `desc` | Direção da ordenação |
| `page` | int ≥ 1 | `1` | Página desejada |
| `limit` | int 1–100 | `10` | Itens por página |

O desempate é sempre por `id` decrescente, para que a paginação não repita nem
omita demandas empatadas.

### Resposta `200`

```json
{
  "items": [
    {
      "id": 1,
      "title": "Exportar relatório em CSV",
      "description": "O time comercial precisa exportar a listagem já filtrada.",
      "requester": "Ana Souza",
      "impact": 5,
      "urgency": 3,
      "status": "pending",
      "priorityScore": 13,
      "createdAt": "2026-08-05T02:47:00.222191Z",
      "updatedAt": "2026-08-05T02:47:00.222195Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1,
  "totalPages": 1
}
```

---

## `GET /api/v1/demands/summary`

Resumo exibido no topo do painel. As canceladas entram na resposta para que a
soma dos estados feche com o total.

### Resposta `200`

```json
{ "total": 9, "pending": 4, "inProgress": 3, "completed": 1, "cancelled": 1 }
```

---

## `POST /api/v1/demands`

Cadastra uma demanda. O status inicial é sempre `pending` e a prioridade é
calculada pelo servidor.

### Corpo

| Campo | Regra |
| --- | --- |
| `title` | 3 a 120 caracteres |
| `description` | 3 a 2000 caracteres |
| `requester` | 2 a 80 caracteres |
| `impact` | inteiro de 1 a 5 |
| `urgency` | inteiro de 1 a 5 |

Espaços nas pontas dos campos de texto são removidos antes da validação.

```json
{
  "title": "Exportar relatório em CSV",
  "description": "O time comercial precisa exportar a listagem já filtrada.",
  "requester": "Ana Souza",
  "impact": 5,
  "urgency": 3
}
```

### Respostas

| Código | Corpo |
| --- | --- |
| `201` | A demanda criada |
| `422` | Erro de validação com os campos em `details` |

---

## `GET /api/v1/demands/{id}`

Consulta uma demanda. Devolve `404` se ela não existir.

---

## `PATCH /api/v1/demands/{id}`

Atualização parcial: apenas os campos enviados são alterados. Aceita `title`,
`description`, `requester`, `impact`, `urgency` e `status`.

A prioridade é recalculada a partir do estado final da demanda, mesmo quando
apenas um dos dois níveis é enviado.

```json
{ "impact": 2 }
```

| Código | Situação |
| --- | --- |
| `200` | A demanda atualizada |
| `404` | Demanda inexistente |
| `422` | Algum campo fora das regras |

---

## `GET /api/v1/demands/{id}/status-history`

Linha do tempo da demanda, do cadastro à última alteração, em ordem cronológica.

Sem paginação, de propósito: o histórico de uma demanda é curto por natureza e
cabe inteiro em uma resposta.

`fromStatus` é `null` apenas no primeiro evento, o do cadastro. Como a aplicação
não tem autenticação, o registro guarda **o quê** e **quando**, mas não **quem**.

### Resposta `200`

```json
[
  { "id": 1, "fromStatus": null, "toStatus": "pending", "changedAt": "2026-08-05T05:20:09.428615Z" },
  {
    "id": 2,
    "fromStatus": "pending",
    "toStatus": "in_progress",
    "changedAt": "2026-08-05T05:20:09.466908Z"
  }
]
```

| Código | Situação |
| --- | --- |
| `200` | A lista de eventos |
| `404` | Demanda inexistente |

Um evento é registrado sempre que o status muda — tanto por
`PATCH /demands/{id}/status` quanto por `PATCH /demands/{id}`. Reenviar o status
atual não gera evento. Remover a demanda remove o histórico junto.

---

## `PATCH /api/v1/demands/{id}/status`

Endpoint dedicado à troca de status, usado pelo seletor da tabela.

```json
{ "status": "in_progress" }
```

| Código | Situação |
| --- | --- |
| `200` | A demanda atualizada |
| `404` | Demanda inexistente |
| `422` | Status fora da lista aceita |

---

## `DELETE /api/v1/demands/{id}`

Remove a demanda. Devolve `204` sem corpo, ou `404` se ela não existir.

---

## `GET /health`

Sem prefixo de versão. Usado pelo healthcheck do Docker Compose.

```json
{ "status": "ok" }
```
