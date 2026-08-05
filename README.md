# Painel de Demandas de Produto

Aplicação web para registrar, priorizar e acompanhar solicitações de novas
funcionalidades — teste técnico da Zeeway (Etapa 1).

As respostas da **Etapa 2** estão em [`ARQUITETURA.md`](ARQUITETURA.md).

---

## 1. Descrição da solução

Uma equipe de produto cadastra demandas informando título, descrição,
solicitante, impacto e urgência. O servidor calcula a pontuação de prioridade —
**`(impacto × 2) + urgência`** — e a listagem aparece ordenada da maior para a
menor por padrão.

A tela principal reúne:

- **Resumo** com o total de demandas e a contagem por status;
- **Filtros** por status, solicitante e impacto, além de busca por título e
  ordenação configurável;
- **Listagem paginada**, ordenada por prioridade;
- **Cadastro** por formulário, com validação no navegador e no servidor;
- **Troca de status** direto na linha, com atualização otimista;
- **Histórico de status** por demanda, do cadastro à última alteração;
- **Remoção** com confirmação e atualização otimista.

Estados de carregamento, vazio e erro estão tratados em todas as listagens.

No celular a lista vira cartões, com os mesmos campos exigidos na tabela e sem
rolagem horizontal. Status e prioridade têm cor própria, coerente entre a lista
e o resumo, e a interface acompanha o tema claro ou escuro do sistema.

### Regras de negócio

| Regra | Onde é garantida |
| --- | --- |
| `prioridade = (impacto × 2) + urgência` | Servidor, em uma função pura (`priority.py`) |
| Impacto e urgência entre 1 e 5 | Schema de entrada **e** constraint no banco |
| Toda demanda nasce com status `pending` | Service do backend |
| A prioridade é recalculada em qualquer atualização | Service do backend |
| Toda troca de status gera um evento de histórico | Service do backend, no mesmo commit da alteração |
| Reenviar o status atual não gera evento | Service do backend |
| Listagem ordenada por prioridade decrescente | Consulta ao banco, com desempate estável |

A pontuação enviada pelo cliente é ignorada: quem calcula é sempre o servidor.

---

## 2. Tecnologias utilizadas

### Backend

| Tecnologia | Papel |
| --- | --- |
| Python 3.13+ | Linguagem |
| FastAPI | Framework HTTP e documentação automática (Swagger) |
| SQLAlchemy 2 | ORM, no estilo declarativo tipado |
| Alembic | Versionamento do schema |
| Pydantic 2 | Validação de entrada e contrato de saída |
| SQLite / PostgreSQL | Banco de dados — ver abaixo |
| pytest | Testes |
| Ruff | Lint |

### Frontend

| Tecnologia | Papel |
| --- | --- |
| Next.js 15 (App Router) | Framework React |
| React 19 + TypeScript | Interface e tipagem |
| Tailwind CSS 4 + shadcn/ui | Estilo e componentes |
| TanStack Query | Cache, estados de requisição e atualização otimista |
| React Hook Form + Zod | Formulário e validação |
| Axios | Cliente HTTP |
| Vitest + Testing Library + user-event | Testes |

### Banco de dados por ambiente

| Ambiente | Banco | Por quê |
| --- | --- | --- |
| Execução local | **SQLite** | Roda sem nenhum serviço externo: quem clona o repositório sobe a API sem instalar banco e sem Docker |
| `docker compose up` | **PostgreSQL** | Paridade com produção com um comando, sem instalar nada na máquina |
| Testes | **SQLite** em memória (padrão) e **PostgreSQL** (verificação) | Rápido no dia a dia, e com a garantia de que o código não depende de dialeto |
| Produção | **PostgreSQL** | Persistência real em provedor gerenciado |

Nada no código conhece o dialeto: trocar de banco é trocar a `DATABASE_URL`.
Isso não é uma promessa do README — **os mesmos 64 testes rodam nos dois bancos,
e as migrations sobem e descem em ambos.** Como verificar está em
[Testes](#testes).

O esquema `postgresql://` que os provedores entregam é traduzido
automaticamente para o dialeto do driver instalado (psycopg 3), então a URL
pode ser colada como vem do painel.

---

## 3. Instruções de instalação e execução

Pré-requisitos: **Python 3.13+** e **Node.js 20+** (ou apenas **Docker**).

Validado nas duas formas: local com Python 3.14 e Node 24, e em contêiner com
Python 3.13 e Node 24.

### Opção A — Docker Compose

```bash
docker compose up --build
```

- Painel: <http://localhost:3000>
- API: <http://localhost:8000>
- Swagger: <http://localhost:8000/docs>

Sobem três serviços: **PostgreSQL**, backend e frontend, em ordem. O backend só
inicia depois que o Postgres responde ao `pg_isready`, e o frontend só depois
que o healthcheck do backend passa. As migrations rodam no entrypoint do
backend. Os dados ficam em volume nomeado, então sobrevivem a
`docker compose restart`.

Nenhum serviço externo é necessário: o Postgres do compose é local.

As portas 3000 e 8000 precisam estar livres — se você já estiver rodando a
aplicação localmente, pare antes de subir os contêineres.

### Opção B — Execução local

**Backend** — Linux ou macOS, a partir da raiz do repositório:

```bash
cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements-dev.txt && alembic upgrade head && uvicorn app.main:app --reload --port 8000
```

**Backend** — Windows (PowerShell):

```powershell
cd backend; python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements-dev.txt; alembic upgrade head; uvicorn app.main:app --reload --port 8000
```

Ao subir novamente depois, basta `alembic upgrade head` e `uvicorn`. O
`alembic upgrade head` é obrigatório: subir sem ele faz a API **recusar
iniciar**, com uma mensagem dizendo exatamente qual comando rodar. No Docker
esse passo já acontece sozinho na subida do contêiner.

**Frontend** (em outro terminal, em qualquer sistema):

```bash
cd frontend && npm install && npm run dev
```

O painel sobe em <http://localhost:3000> e já aponta para
`http://localhost:8000/api/v1`. Nenhum arquivo `.env` é necessário — os padrões
de desenvolvimento estão no código. Para apontar para outra API, copie
`frontend/.env.example` para `frontend/.env.local`.

### Testes

Com o ambiente virtual do backend ativado:

```bash
cd backend && python -m pytest
```

```bash
cd frontend && npm test
```

Situação atual: **64 testes no backend** e **50 no frontend**, todos passando.

Para rodar a mesma suíte do backend contra PostgreSQL, suba um banco
descartável e aponte `TEST_DATABASE_URL` para ele:

```bash
docker run --rm -d --name pg-teste -e POSTGRES_USER=zeeway -e POSTGRES_PASSWORD=zeeway -e POSTGRES_DB=zeeway -p 55432:5432 postgres:17-alpine
```

```bash
cd backend && TEST_DATABASE_URL=postgresql://zeeway:zeeway@localhost:55432/zeeway python -m pytest
```

No Windows (PowerShell), defina a variável com
`$env:TEST_DATABASE_URL = "postgresql://zeeway:zeeway@localhost:55432/zeeway"`
antes do `pytest`.

### Verificações de qualidade

```bash
cd backend && ruff check .
```

```bash
cd frontend && npm run lint && npx tsc --noEmit && npm run build
```

---

## 4. Decisões técnicas relevantes

A arquitetura completa está em [`docs/ESTRUTURA.md`](docs/ESTRUTURA.md) e o
contrato da API em [`docs/API.md`](docs/API.md). O resumo das decisões que mais
influenciaram o código:

**Monólito modular, com o backend organizado por módulo de negócio.**
Cada módulo (`app/modules/demands/`) tem modelo, regra, contrato, repositório,
service, rotas e testes juntos. Um novo assunto vira uma nova pasta com as
mesmas peças, sem tocar nas existentes. `core/` guarda só o que é realmente
compartilhado.

**Camadas com responsabilidade única.** Rotas traduzem HTTP, schemas validam,
services concentram regra de negócio, repositórios só falam com o banco. Nenhuma
regra vazou para a rota ou para o frontend.

**A regra de prioridade é uma função pura.** Fica isolada em `priority.py`, sem
depender de banco nem de HTTP, e é testada diretamente — inclusive nos extremos
(3 e 15) e no fato de o impacto pesar mais que a urgência.

**A prioridade é persistida, não calculada na leitura.** Isso permite ordenar e
paginar no banco, com índice. O risco de um valor derivado ficar defasado é
contido no service, que **sempre** recalcula a partir do estado final da demanda
— por isso não há um `if` verificando se impacto ou urgência mudaram.

**Frontend organizado por feature.** Tudo que diz respeito a demandas está em
`features/demands/`. `shared/` recebe apenas o que já é usado em mais de um
lugar; nada foi criado antecipadamente.

**Contrato em `camelCase`, código Python em `snake_case`.** Quem consome a API é
um frontend TypeScript, então o JSON usa a convenção da linguagem que o consome,
sem contaminar o Python. A conversão acontece em um lugar só, na classe base dos
schemas.

**Status em inglês no domínio, português na interface.** `pending`,
`in_progress`, `completed` e `cancelled` são códigos estáveis; "Pendente",
"Em andamento", "Concluída" e "Cancelada" vivem em um único mapa no frontend.

**Datas sempre em UTC.** O SQLite não guarda fuso horário, o que faria o
navegador exibir a data de criação deslocada. Um tipo de coluna próprio
(`UtcDateTime`) normaliza a conversão em um lugar só.

**Ordenação com desempate estável.** Demandas empatam em prioridade com
frequência. Sem uma ordem total, `LIMIT/OFFSET` poderia repetir ou omitir itens
entre páginas — há um teste cobrindo exatamente isso.

**A API recusa subir com o banco sem as tabelas.** Sem essa checagem, ela
iniciava normalmente e só quebrava na primeira requisição, com um erro de SQL no
meio de um traceback longo que não dizia o que fazer. Agora a falha acontece na
subida e a mensagem traz o comando. É uma verificação por tabela, não por
coluna: cobre os casos que acontecem de verdade — banco nunca migrado e módulo
novo sem migration — sem reimplementar a comparação completa do `alembic check`.

As migrations continuam explícitas, e não embutidas na subida da aplicação: com
mais de uma instância, migrar automaticamente no start faria réplicas
concorrerem pelo mesmo schema. No Docker o `CMD` roda `alembic upgrade head`
antes do servidor, que é o mesmo passo, só que no lugar certo — o entrypoint.

**Erros com formato único.** Toda resposta de erro tem o mesmo corpo
(`{ error: { code, message, details } }`), inclusive as de validação, com o
campo problemático em `details`. Erros inesperados são registrados no log e
devolvem uma mensagem genérica, sem expor detalhes internos.

**Atualização otimista na troca de status e na remoção, mas não no cadastro.**
Trocar status e remover têm resultado previsível: dá para desenhar o estado
final antes da resposta e desfazer se a API recusar — a tabela, os cartões e os
contadores do resumo reagem na hora. O cadastro fica de fora porque a pontuação
e o identificador vêm do servidor, e a posição da demanda depende da ordenação e
da página atual: um item provisório apareceria no lugar errado com frequência.
Seria um erro visível para economizar uma fração de segundo.

**Cartões no celular, tabela no desktop.** Oito colunas não cabem em 375px — na
prática, prioridade e status ficavam atrás de uma rolagem horizontal que quase
ninguém descobre, justamente os campos que o teste exige exibir. A troca é feita
por CSS, e não medindo a janela em JavaScript: no servidor não há largura, e
decidir em tempo de execução causaria diferença entre o HTML renderizado e o
hidratado. As duas versões consomem os mesmos dados e reaproveitam os mesmos
componentes de status, prioridade e ações — só o arranjo muda.

**A cor de cada status vive em um lugar só.** Selo, seletor da linha e card de
resumo leem do mesmo mapa, com variantes para tema claro e escuro. Isso também
eliminou uma redundância: o seletor de status carrega a própria cor, então não
existe mais um selo ao lado repetindo a mesma palavra.

**O histórico de status entra no mesmo commit da alteração.** O evento é anexado
à demanda pela `relationship` do SQLAlchemy, em vez de gravado por uma segunda
escrita. Não existe janela em que o status mudou mas o evento não foi
registrado, e remover a demanda leva o histórico junto por cascade.

---

## 5. Limitações conhecidas

- **Sem autenticação.** O teste dispensa, então qualquer pessoa com acesso à API
  pode criar, alterar e remover demandas.
- **A edição completa da demanda existe só na API.** O `PATCH /demands/{id}`
  aceita todos os campos, mas a interface só oferece troca de status e remoção —
  que é o que o teste pede.
- **O histórico não registra o autor.** Sem autenticação, guarda-se o quê e
  quando, mas não quem — inventar um autor seria pior do que não ter.
- **Filtros não vão para a URL.** Recarregar a página volta aos filtros padrão, e
  o estado da busca não é compartilhável por link.
- **Paginação por `LIMIT/OFFSET`.** Simples e adequada ao volume esperado;
  degradaria em tabelas muito grandes com páginas muito distantes.
- **A suíte roda em SQLite por padrão, e a produção usa PostgreSQL.** A
  diferença é coberta rodando os mesmos testes contra os dois bancos, mas isso
  é um passo manual: sem CI, nada obriga a repetição a cada mudança.
- **A ordenação por título depende da collation do banco.** SQLite compara byte
  a byte, PostgreSQL usa a locale — títulos acentuados podem sair em ordem
  ligeiramente diferente entre os dois ambientes.
- **Busca por título apenas**, sem a descrição e sem acento-insensibilidade.

---

## 6. Melhorias que seriam feitas com mais tempo

**Produto**

- Edição completa da demanda pela interface, reaproveitando o formulário atual.
- Autor no histórico de status, assim que houver autenticação — a tabela de
  eventos já existe e só precisaria de mais uma coluna.
- Ordenação clicando no cabeçalho da tabela, além dos seletores atuais.
- Seleção múltipla para alterar o status de várias demandas de uma vez.

**Técnicas**

- Filtros na query string, para links compartilháveis e botão de voltar
  funcionando.
- Busca também na descrição, com normalização de acentos.
- Autenticação e autorização, registrando quem criou e quem alterou cada demanda.
- CI no GitHub Actions rodando lint, testes e build a cada push — incluindo a
  suíte do backend contra PostgreSQL, hoje um passo manual.
- Cobertura de testes medida e com limite mínimo.
- Paginação por cursor, se o volume justificar.
- Deploy: frontend na Vercel e backend em contêiner, com o banco gerenciado.

---

## 7. Ferramentas de IA utilizadas

**Ferramenta:** Claude Code (modelo Claude Opus), usado como par de programação
durante toda a construção.

**Onde ajudou**

- Leitura do enunciado e transformação dos requisitos em um plano incremental,
  antes de qualquer código.
- Geração da estrutura inicial do backend (camadas, configuração, tratamento de
  erros) e do frontend (feature, hooks, componentes).
- Escrita dos testes, especialmente na varredura de casos de borda que é fácil
  esquecer — paginação com itens empatados, título só com espaços, atualização
  parcial sem nenhum campo.
- Redação da documentação e das respostas de arquitetura da Etapa 2.

**Como revisei e validei**

O código gerado foi tratado como proposta, não como resultado. A validação foi
feita em quatro frentes:

1. **Execução real.** Backend e frontend foram levantados e o fluxo completo foi
   percorrido no navegador: cadastro, cálculo da prioridade, ordenação, filtros,
   busca, troca de status e remoção — conferindo as respostas da API a cada
   passo.
2. **Testes automatizados.** 79 testes escritos e executados, cobrindo a regra de
   prioridade, os services, os endpoints e os componentes de interface.
3. **Ferramentas de verificação.** `ruff` no backend; `eslint`, `tsc --noEmit` e
   `next build` no frontend, todos limpos. A aplicação também foi subida com
   `docker compose up --build` e exercitada dentro dos contêineres.
4. **Revisão de decisão a decisão.** Cada sugestão foi confrontada com o
   enunciado. Onde a proposta inicial era complexa demais para o problema, foi
   simplificada.

**O que a revisão pegou**

Vale registrar dois exemplos concretos, porque mostram por que a revisão importa:

- **IDs duplicados no DOM.** Os campos do formulário e os da barra de filtros
  usavam os mesmos `id` (`impact`, `status`, `requester`). Com o diálogo aberto,
  havia elementos repetidos na página, o que quebra a ligação entre `<label>` e
  campo e a acessibilidade dos erros. Só apareceu ao inspecionar a página rodando
  de verdade — nenhum teste ou linter acusava. Os ids passaram a ser prefixados
  por contexto.
- **Índice redundante no banco.** A primeira versão do modelo criava um índice
  em `priority_score` e outro composto em `(priority_score, created_at)`. O
  segundo já cobre o primeiro. Percebido ao ler a migration gerada, antes de
  versioná-la.
- **Método com nome de builtin quebrando a aplicação no Python 3.13.** O service
  tinha um método `list`, que passa a sombrear o builtin dentro do corpo da
  classe. No Python 3.14 — a versão da máquina de desenvolvimento — as
  anotações são avaliadas sob demanda e nada acontece; no 3.13, avaliadas na
  criação da classe, a anotação `list[DemandStatusChange]` de um método
  seguinte fazia a importação do módulo falhar e a API sequer subia. Os 58
  testes passavam localmente: **quem pegou foi o contêiner**, que roda 3.13. O
  método foi renomeado e um teste passou a barrar nomes de builtin em service e
  repository, já que a máquina de desenvolvimento não reproduz a falha.

Além disso, algumas sugestões foram descartadas por adicionarem complexidade sem
retorno no escopo do teste.

---

## 8. Tempo dedicado

<!-- Confira e ajuste este valor antes de enviar. -->
Aproximadamente **8 horas**, distribuídas em:

| Etapa | Tempo aproximado |
| --- | --- |
| Leitura do enunciado, decisões de escopo e arquitetura | 1h |
| Backend (domínio, API, migrations) | 2h |
| Frontend (feature, componentes, integração) | 2h30 |
| Testes (backend e frontend) | 1h30 |
| Docker, documentação e Etapa 2 | 1h |

---

## Estrutura do repositório

```
.
├── backend/              API em FastAPI (monólito modular por módulo de negócio)
│   ├── app/core/         configuração, banco, erros e schemas compartilhados
│   ├── app/modules/      módulos de negócio (hoje: demands)
│   └── migrations/       Alembic
├── frontend/             Painel em Next.js (organizado por feature)
│   └── src/features/     features (hoje: demands)
│   └── src/shared/       o que é usado por mais de um lugar
├── docs/
│   ├── ESTRUTURA.md      arquitetura do código, camadas e decisões
│   └── API.md            contrato dos endpoints
├── ARQUITETURA.md        Etapa 2 do teste
└── docker-compose.yml
```

Detalhamento em [`docs/ESTRUTURA.md`](docs/ESTRUTURA.md).

---

## Como seria o backend em Elixir

O teste cita Elixir como diferencial. Não o usei na entrega: introduzir um
segundo runtime para um CRUD deste tamanho aumentaria a complexidade sem retorno
— e o próprio enunciado pede para evitar isso. Mas o desenho equivalente seria
direto, porque o problema é bem alinhado com o que o Phoenix faz bem.

### Equivalência de peças

| Aqui | Em Elixir |
| --- | --- |
| FastAPI | Phoenix, em modo API (`--no-html --no-assets`) |
| SQLAlchemy + Alembic | Ecto + `mix ecto.gen.migration` |
| Pydantic | `Ecto.Changeset` sobre schemas embutidos |
| `app/modules/demands/` | Contexto `Demands` |
| Service | Funções públicas do módulo de contexto |
| Repository | `Demands.Query` + `Repo` |
| Rotas | `DemandController` + `Router` |
| pytest | ExUnit, com `Ecto.Adapters.SQL.Sandbox` |

### Como ficaria organizado

```
lib/
├── painel/
│   ├── demands.ex                 API pública do contexto (o "service")
│   ├── demands/demand.ex          schema Ecto + changeset
│   ├── demands/priority.ex        a regra pura
│   └── demands/query.ex           composição das consultas
└── painel_web/
    ├── controllers/demand_controller.ex
    ├── controllers/demand_json.ex  serialização
    └── router.ex
```

A regra de prioridade seria a mesma função pura, aplicada no changeset:

```elixir
defmodule Painel.Demands.Priority do
  @impact_weight 2

  def score(impact, urgency), do: impact * @impact_weight + urgency
end
```

```elixir
def changeset(demand, attrs) do
  demand
  |> cast(attrs, [:title, :description, :requester, :impact, :urgency, :status])
  |> validate_required([:title, :description, :requester, :impact, :urgency])
  |> validate_length(:title, min: 3, max: 120)
  |> validate_inclusion(:impact, 1..5)
  |> validate_inclusion(:urgency, 1..5)
  |> put_priority_score()
end
```

Os filtros virariam composição de queries, que é onde o Ecto fica mais
agradável que o SQLAlchemy:

```elixir
def filter(query, %{status: status}) when not is_nil(status),
  do: where(query, [d], d.status == ^status)
```

### O que mudaria de verdade

**A favor.** Changesets tornam validação e transformação uma coisa só, com erros
por campo já estruturados. A composição de queries é mais legível. E o teste
roda em transação isolada por padrão, sem preparo de banco.

**Contra.** É um runtime a mais para instalar, versionar e implantar.

**Onde Elixir realmente compensaria.** Não neste CRUD, mas na hora de crescer:
Phoenix Channels ou LiveView dariam atualização em tempo real do painel — a
demanda que um colega move para "Em andamento" aparecendo na tela de todos, sem
polling — e a árvore de supervisão do OTP cuidaria de trabalho periódico sem
depender de fila externa. É esse tipo de requisito que justificaria a escolha.

Curiosamente, o cenário da Etapa 2 é um caso em que o BEAM brilharia: um
`GenServer` serializa naturalmente o acesso a um recurso finito dentro de um nó,
e a espera com prazo é trivial com `GenServer.call/3`. Ainda assim, eu manteria
o estado no banco pelas razões da pergunta 4 — o processo pode morrer, o
invariante não pode.
