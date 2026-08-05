# Estrutura do projeto

> Este documento descreve a arquitetura **do código**.
> As respostas da Etapa 2 do teste estão em [`../ARQUITETURA.md`](../ARQUITETURA.md).

## Visão geral

O projeto é um **monólito modular**: backend e frontend são duas aplicações que
sobem juntas, cada uma organizada em módulos coesos e independentes entre si.

```
zeeway-claude-code/
├── backend/          API em FastAPI
├── frontend/         Painel em Next.js
├── docs/             Documentação técnica
├── ARQUITETURA.md    Etapa 2 do teste
└── docker-compose.yml
```

Não há fila, worker, mensageria nem serviço separado. O teste pede uma
aplicação pequena, e cada peça a mais seria custo de manutenção sem retorno.

---

## Backend

### Organização por módulo

```
backend/
├── app/
│   ├── core/                     infraestrutura compartilhada
│   │   ├── config.py             configurações vindas do ambiente
│   │   ├── database.py           engine, sessão e base declarativa
│   │   ├── types.py              tipo de coluna de data em UTC
│   │   ├── exceptions.py         exceções de domínio
│   │   ├── schema.py             checagem do banco na subida da API
│   │   ├── error_handlers.py     tradução de exceção em resposta HTTP
│   │   └── schemas.py            base camelCase, paginação e formato de erro
│   ├── modules/
│   │   └── demands/              o módulo de negócio
│   │       ├── models.py         tabelas de demanda e de histórico, enum de status
│   │       ├── priority.py       a regra de cálculo da prioridade
│   │       ├── schemas.py        contratos de entrada e saída
│   │       ├── repository.py     consultas ao banco
│   │       ├── service.py        regras de negócio
│   │       ├── routes.py         endpoints HTTP
│   │       └── tests/            testes do módulo
│   └── main.py                   montagem da aplicação
├── migrations/                   Alembic
└── conftest.py                   fixtures compartilhadas de teste
```

Um novo assunto (por exemplo, times ou comentários) vira uma nova pasta em
`modules/`, com as mesmas seis peças. `core/` só recebe o que for realmente
usado por mais de um módulo.

### Camadas e responsabilidades

| Camada | Faz | Não faz |
| --- | --- | --- |
| `routes` | Recebe a requisição, delega ao service, devolve a resposta | Regra de negócio, acesso ao banco |
| `schemas` | Valida formato e faixa dos dados; define o contrato HTTP | Consultar o banco, decidir comportamento |
| `service` | Concentra as regras de negócio e orquestra a operação | Falar HTTP, montar SQL |
| `repository` | Traduz intenção em consulta SQL | Decidir regra de negócio |
| `models` | Descreve a tabela e as restrições do banco | Calcular, validar entrada |

O fluxo de uma requisição:

```
HTTP → routes → service → repository → banco
                  ↓
              priority.py (regra pura)
```

### Onde vive cada regra de negócio

| Regra | Onde | Por quê |
| --- | --- | --- |
| `prioridade = (impacto × 2) + urgência` | `priority.py` | Função pura, testável isoladamente, sem depender de banco ou HTTP |
| Toda demanda nasce `pending` | `service.create` | É uma decisão de negócio, não de transporte |
| A prioridade é recalculada em qualquer atualização | `service.update` | Um único ponto garante que o valor persistido nunca fique defasado |
| Impacto e urgência entre 1 e 5 | `schemas` + `CHECK` no banco | O schema dá a mensagem ao usuário; a constraint protege contra qualquer caminho que não passe pela API |
| Demanda inexistente vira 404 | `service` levanta, `error_handlers` traduz | O service não precisa conhecer códigos HTTP |
| Toda troca de status vira um evento de histórico | `service._apply_status` | Um único caminho registra o evento, seja pelo endpoint de status ou pelo de atualização |
| Reenviar o status atual não gera evento | `service._apply_status` | Uma transição de um valor para ele mesmo poluiria a linha do tempo |

### Decisões que merecem explicação

**A prioridade é persistida, e não calculada na leitura.**
Ela é derivada de impacto e urgência, então poderia ser calculada a cada
consulta. Persistir permite que a ordenação e a paginação aconteçam no banco,
com índice, em vez de carregar tudo em memória para ordenar. O risco de um
valor derivado ficar defasado é contido pelo `service`, que sempre recalcula a
partir do estado final da demanda.

**Nenhuma camada conhece o dialeto do banco.**
O repositório usa apenas construções do SQLAlchemy, sem SQL específico de
fornecedor. A data em UTC é resolvida por um tipo de coluna próprio, e o modo
batch das migrations — contorno para o suporte limitado do SQLite a
`ALTER TABLE` — fica restrito ao SQLite.

Isso é o que permite SQLite no desenvolvimento e PostgreSQL em produção sem
manter dois caminhos de código. E não é uma suposição: a suíte inteira roda
contra os dois bancos, e as migrations sobem e descem em ambos.

O único ponto que precisa de tradução é o esquema da URL. Provedores entregam
`postgresql://`, que o SQLAlchemy associa ao psycopg2; o driver usado aqui é o
psycopg 3, cujo dialeto é `postgresql+psycopg`. A conversão acontece em
`core/config.py`, para que a URL possa ser colada como vem do painel do
provedor sem quebrar o deploy por um motivo difícil de diagnosticar.

**Migrations explícitas, com a aplicação recusando subir sem elas.**
Migrar automaticamente dentro do `lifespan` seria conveniente, mas com mais de
uma instância faria réplicas concorrerem pelo mesmo schema na subida. Então o
`alembic upgrade head` continua sendo um passo próprio — no `CMD` do contêiner,
que é o entrypoint, e no comando documentado para execução local.

O que a aplicação faz na subida é apenas **conferir**: se faltar alguma tabela,
ela não inicia e a mensagem diz qual comando rodar. Antes disso, esquecer a
migration só aparecia como erro de SQL na primeira requisição.

**Datas em UTC, via tipo de coluna próprio.**
O SQLite não guarda o fuso horário. Sem tratamento, um `datetime` consciente do
fuso entraria e sairia ingênuo do banco, e o navegador interpretaria a data de
criação como horário local — exibindo o dia errado perto da meia-noite. O tipo
`UtcDateTime` resolve isso em um lugar só.

**O histórico é anexado à demanda, não gravado à parte.**
O evento entra pela `relationship` (`demand.status_changes.append(...)`), o que
faz demanda e evento caírem no **mesmo commit** sem que o service precise
coordenar duas escritas — não existe janela em que o status mudou mas o evento
não foi registrado. O `cascade="all, delete-orphan"` também garante que remover
a demanda leve o histórico junto, sem uma limpeza manual.

**Um `id` decrescente como desempate na ordenação.**
Várias demandas empatam em prioridade. Sem uma ordem total, `LIMIT/OFFSET`
poderia repetir ou omitir itens entre páginas.

**Códigos de status em inglês.**
O domínio não muda quando a interface muda de idioma. A tradução vive em um
único mapa no frontend.

---

## Frontend

### Organização por feature

```
frontend/src/
├── app/                          rotas do App Router
│   ├── layout.tsx                providers globais
│   └── page.tsx                  monta o painel
├── features/
│   └── demands/
│       ├── api/                  chamadas HTTP e chaves de cache
│       ├── components/           componentes da feature (+ seus testes)
│       ├── constants/            rótulos, filtros padrão e aparência dos status
│       ├── hooks/                queries e mutations
│       ├── schemas/              validação do formulário
│       ├── types/                contrato espelhado da API
│       └── utils/                funções auxiliares da feature
├── shared/
│   ├── components/               EmptyState, ErrorState, FormField
│   ├── components/ui/            componentes shadcn/ui
│   ├── hooks/                    useDebouncedValue
│   ├── lib/                      cn, formatação de data
│   ├── providers/                QueryProvider
│   ├── services/                 cliente Axios e leitura de erro da API
│   └── types/                    envelope de paginação
└── test/                         fábricas e render com providers
```

A pasta é organizada por assunto, não por tipo de arquivo. Tudo que diz respeito
a demandas está em um lugar só; `shared/` recebe apenas o que já é usado por
mais de um lugar — nada foi criado "para o caso de precisar".

### Responsabilidades

O frontend **apresenta dados, envia requisições, valida formulários e controla o
estado da interface**. Nenhuma regra de negócio é reimplementada aqui: a
pontuação de prioridade chega pronta do servidor e é apenas exibida.

A validação do formulário com Zod existe para a experiência de uso — dar o erro
antes do envio. Ela espelha as regras do backend, que continua sendo quem
garante a integridade dos dados.

### Composição da tela

```
DemandsPanel                       estado dos filtros, orquestra o resto
├── CreateDemandDialog → DemandForm
├── DemandSummaryCards             resumo (com skeleton)
├── DemandFilters                  busca, filtros e ordenação
└── seção da lista
    ├── ErrorState                 falha na requisição
    ├── DemandTableSkeleton        carregando
    ├── EmptyState                 sem resultado (mensagem muda se há filtro)
    └── DemandList + DemandPagination
        ├── DemandCard             até `md` — mesmos campos, sem rolagem lateral
        └── DemandTable            a partir de `md`
            └── ambos usam DemandStatusSelect, DemandPriorityBadge
                e DemandActions (histórico + remoção)
```

`DemandsPanel` é o único componente com estado de tela. Todos os outros recebem
dados e devolvem eventos, o que os torna simples de testar isoladamente.

### Decisões que merecem explicação

**Atualização otimista na troca de status e na remoção.**
As duas têm resultado previsível, então o estado final é desenhado antes da
resposta: a lista e os contadores do resumo reagem na hora, e o cache anterior é
restaurado se a API recusar. A aritmética do resumo — mover uma unidade de um
contador para outro, descontar do total ao remover — está isolada em funções
puras em `utils/summary-changes.ts`, testadas sem envolver rede nem React.

O cadastro fica de fora: a pontuação e o identificador vêm do servidor, e a
posição da demanda depende da ordenação e da página atual. Um item provisório
apareceria no lugar errado com frequência, o que é pior do que esperar.

**Cartões no celular, tabela no desktop.**
Oito colunas não cabem em 375px: prioridade e status acabavam atrás de uma
rolagem horizontal, justamente campos que o teste exige exibir. A escolha entre
os arranjos é feita por CSS (`md:hidden` e `hidden md:block`), e não medindo a
janela em JavaScript — no servidor não há largura, e decidir em tempo de
execução causaria diferença entre o HTML renderizado e o hidratado.

O custo é ter as duas versões no HTML. Como a escondida fica com `display:none`,
ela não é anunciada por leitores de tela nem alcançada pelo teclado; nos testes,
as consultas são feitas dentro da tabela ou do cartão, conforme o caso.

**A aparência de cada status vive em um mapa só.**
`constants/demand-status-appearance.ts` guarda o ícone e as classes de cada
status, com variantes para tema claro e escuro. Selo, seletor e card de resumo
leem de lá, de modo que "Em andamento" seja sempre o mesmo azul nos três. Foi o
que permitiu remover uma redundância: o seletor carrega a própria cor, então não
existe mais um selo ao lado repetindo a mesma palavra.

**O histórico só é buscado quando o diálogo abre.**
A consulta nasce com `enabled: false`. Carregar a linha do tempo de todas as
linhas da tabela seria uma requisição por demanda, para um dado que quase nunca
é aberto. A chave de cache fica sob `demandKeys.all`, então uma troca de status
já invalida o histórico daquela demanda sem nenhum código extra.

**Busca com debounce, não a cada tecla.**
O campo responde imediatamente na interface, mas só chega à API após uma pausa.

**Filtros em estado de componente, não na URL.**
Guardar os filtros na query string daria links compartilháveis e botão de voltar
funcionando. Ficou de fora por ser custo sem retorno claro no escopo do teste —
está listado como melhoria no README.

---

## Testes

| Camada | Ferramenta | O que cobre |
| --- | --- | --- |
| Regra de prioridade | pytest | A fórmula, os extremos (3 e 15) e o peso maior do impacto |
| Service | pytest | Criação, atualização parcial, recálculo, filtros, busca, ordenação, paginação, resumo |
| Histórico | pytest | Evento no cadastro, em cada troca, ausência de evento quando o status se repete, remoção em cascata |
| Estrutura | pytest | Nenhum método de service ou repository pode ter nome de builtin — ver abaixo |
| Subida da API | pytest | A aplicação recusa iniciar com o banco sem as tabelas, e a mensagem traz o comando |
| Endpoints | pytest + TestClient | Códigos HTTP, formato de erro, validação, 404, paginação |
| Componentes | Vitest + Testing Library | Renderização, validação de formulário, interação do usuário |
| Cartão do celular | Vitest + Testing Library | Todos os campos exigidos presentes e troca de status funcionando |
| Resumo otimista | Vitest | Aritmética dos contadores, sem rede nem React |
| Painel e histórico | Vitest + Testing Library | Carregamento, lista, estado vazio e de erro, linha do tempo e o estado otimista antes da resposta, com a API simulada |

Os testes do backend rodam contra um SQLite em memória, recriado a cada teste.
Os do frontend simulam o módulo de API, para exercitar o comportamento da
interface sem depender de rede.

### A mesma suíte nos dois bancos

`TEST_DATABASE_URL` troca o banco usado pelos testes. Sem a variável, roda
SQLite em memória: rápido e sem exigir nenhum serviço de quem só quer executar a
suíte. Apontando para um PostgreSQL, os **mesmos 64 testes** rodam contra o
banco de produção.

Isso responde à objeção óbvia de desenvolver em um banco e entregar em outro.
Em vez de padronizar tudo em PostgreSQL — o que obrigaria quem clona o
repositório a subir um banco para rodar um CRUD —, a paridade é verificada.
O comando está no README.

A verificação usa um PostgreSQL descartável, nunca o banco de produção: as
fixtures criam e apagam as tabelas a cada teste.

### Por que existe um teste sobre nomes de método

Um método chamado como um builtin — `list`, `type`, `filter` — passa a sombrear
esse builtin **dentro do corpo da classe**. No Python 3.13, que avalia as
anotações na criação da classe, uma anotação seguinte como
`list[DemandStatusChange]` resolve `list` para o método e a importação do módulo
falha: a aplicação não sobe.

No Python 3.14 a avaliação é adiada (PEP 649) e o problema fica invisível. Como
a máquina de desenvolvimento roda 3.14 e o contêiner roda 3.13, a suíte local
não reproduz a falha. O teste verifica diretamente a condição que a causa, e por
isso funciona em qualquer versão.
