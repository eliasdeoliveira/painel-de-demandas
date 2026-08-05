# Etapa 2 — Arquitetura e raciocínio sistêmico

> Respostas às perguntas da Etapa 2 do teste técnico da Zeeway.
> Esta etapa é independente da aplicação da Etapa 1: nada aqui está implementado
> no código entregue. A arquitetura do código está em
> [`docs/ESTRUTURA.md`](docs/ESTRUTURA.md).

**Cenário:** um recurso finito — 100 conexões, tokens ou slots — com demanda
constantemente maior que a oferta.

**Resumo da solução proposta:** um pool de *leases* com TTL, guardado em
PostgreSQL, adquirido com `SELECT ... FOR UPDATE SKIP LOCKED` dentro de uma
transação, devolvido com token de propriedade, e com espera limitada por prazo
declarado pelo cliente. Cada decisão está justificada abaixo, com as
alternativas que considerei e o que se perde em cada caminho.

---

## 1. Como começo a pensar a solução?

Antes de escolher tecnologia, eu trato isto como um problema de **política de
alocação**, não de armazenamento. Três perguntas vêm primeiro.

### O que exatamente é "ter o recurso"?

Preciso definir a unidade e o ciclo de vida antes de qualquer código:

- O recurso é **exclusivo** (um dono por vez) ou admite compartilhamento?
- Quanto tempo um cliente costuma segurá-lo? Qual é o máximo aceitável?
- Existe diferença entre **reservar** e **usar**? Uma reserva que nunca vira uso
  precisa expirar, senão vira capacidade desperdiçada.

### A conta fecha?

Essa é a pergunta que mais economiza trabalho, e a que mais se esquece de fazer.
Pela Lei de Little, a ocupação média do pool é `L = λ × W`, onde `λ` é a taxa de
chegada e `W` o tempo médio de posse.

Com 100 slots, 50 pedidos por segundo e 10 segundos de posse média, a demanda
sustentada é 500 — cinco vezes a capacidade. **Nenhuma arquitetura resolve
isso.** Se `λ × W > 100` de forma sustentada, existem só quatro saídas reais:

1. aumentar a capacidade;
2. reduzir o tempo de posse (`W`);
3. reduzir a demanda admitida (`λ`), rejeitando ou represando;
4. aceitar fila crescente — que na prática é a opção 3 disfarçada, porque a fila
   estoura em algum momento.

Fila só absorve **pico**, nunca **excesso sustentado**. Definir isso primeiro
evita construir uma fila elaborada para um problema que era de capacidade.

### Qual erro é o menos ruim?

Duas falhas são possíveis e elas se opõem:

| Falha | Consequência |
| --- | --- |
| **Emprestar mais de 100** (violar a segurança) | Sobrecarrega o recurso protegido — o banco cai, a API de terceiro bloqueia, a licença é violada |
| **Emprestar menos de 100** (perder liveness) | Capacidade ociosa, cliente espera à toa |

Na maioria dos casos, o limite existe justamente porque ultrapassá-lo quebra
algo. Então adoto: **nunca ultrapassar 100, mesmo ao custo de, por instantes,
usar menos que 100.** Toda decisão seguinte respeita essa ordem de prioridade.

### O invariante

Tudo se resume a manter uma única afirmação verdadeira o tempo todo:

> Em qualquer instante, o número de leases ativos é ≤ 100.

Um invariante só se sustenta se houver **um único lugar** que decide sobre ele,
e se a decisão for **atômica**. É disso que tratam as perguntas seguintes.

---

## 2. Dois clientes pedem o último slot ao mesmo tempo. Como garantir que só um recebe?

### O que não funciona

```
1. SELECT COUNT(*) FROM leases WHERE active   →  99
2. (o outro processo faz o mesmo e também lê 99)
3. INSERT INTO leases ...                     →  agora são 101
```

Ler e depois escrever é a condição de corrida clássica. A janela entre os dois
passos é pequena, mas sob concorrência alta ela é atingida rotineiramente — e o
bug aparece exatamente no pior momento, quando o sistema está sob carga.

Trava no código da aplicação (`lock` em memória, `synchronized`, semáforo do
processo) também não resolve: ela só protege contra as threads daquela
instância. Na pergunta 5 isso fica evidente.

### O que funciona: uma decisão atômica em uma fonte única

O ponto de decisão precisa ser único e a operação precisa ser indivisível.
Modelo que eu adotaria: **cada slot é uma linha**.

```sql
CREATE TABLE slots (
  id           INT PRIMARY KEY,          -- 1..100, criados uma vez
  lease_id     UUID,                     -- NULL quando livre
  holder       TEXT,
  expires_at   TIMESTAMPTZ
);
```

A aquisição é uma transação que pega a primeira linha livre, pulando as que
outra transação já está disputando:

```sql
BEGIN;
  SELECT id FROM slots
   WHERE lease_id IS NULL OR expires_at < now()
   ORDER BY id
   FOR UPDATE SKIP LOCKED
   LIMIT 1;
  -- se não veio linha: pool cheio, decide entre esperar e recusar (pergunta 6)
  UPDATE slots
     SET lease_id = $novo, holder = $cliente, expires_at = now() + $ttl
   WHERE id = $id;
COMMIT;
```

O `SKIP LOCKED` é o detalhe que importa: sem ele, cem clientes concorrentes
formariam uma fila serializada na mesma linha, cada um esperando o anterior
soltar a trava. Com ele, cada um encontra imediatamente uma linha diferente, e
quem chega quando não há nenhuma livre recebe conjunto vazio — resposta rápida,
sem bloqueio.

### Alternativas consideradas

| Alternativa | A favor | Contra |
| --- | --- | --- |
| **Contador único** — `UPDATE pool SET used = used + 1 WHERE used < 100`, verificando linhas afetadas | Atômico e simples; uma linha só | Todas as transações disputam a **mesma linha**: vira gargalo. E não identifica *qual* slot foi dado |
| **`SELECT ... FOR UPDATE SKIP LOCKED`** (adotado) | Atômico, sem ponto quente, identifica o slot, e o mesmo `WHERE` já reaproveita expirados | Exige banco transacional; custo por operação maior que Redis |
| **Lista de tokens no Redis** — `LPOP` de uma lista com 100 itens | Muito rápido; `LPOP`/`BLPOP` são atômicos e o `BLPOP` já resolve a espera | Replicação assíncrona: um failover pode perder a escrita e emprestar o mesmo slot duas vezes |
| **Lock distribuído** (Redlock, ZooKeeper) | Generaliza para outros recursos | Complexidade e modos de falha muito maiores do que o problema pede |

**Decisão:** começar no PostgreSQL. Ele já costuma estar no sistema, entrega
atomicidade real e durabilidade, e o custo por operação só passa a incomodar em
volumes altos. O Redis entra depois, se a medição mostrar necessidade — e aí a
troca é consciente: ganha-se latência, aceita-se uma chance pequena de estouro
em failover.

### Duas coisas que não podem faltar

**Idempotência.** O cliente envia uma chave (`Idempotency-Key`) junto do pedido.
Se ele não receber a resposta e repetir a requisição, a mesma chave devolve o
mesmo lease em vez de consumir um segundo slot. Sem isso, todo timeout de rede
vira vazamento de capacidade.

**Nunca confiar no relógio da aplicação.** `now()` é o do banco. Com várias
instâncias, relógios divergentes fazem uma máquina considerar expirado um lease
que outra ainda tem por válido.

---

## 3. O recurso pode ser devolvido ou expirar sozinho. Isso muda a arquitetura?

**Muda — e para melhor.** O recurso deixa de ser "emprestado até segunda ordem"
e passa a ser um **lease com prazo**. Essa é a mudança conceitual que torna o
sistema capaz de se recuperar sozinho.

Sem prazo, todo cliente que morre sem devolver leva um slot consigo,
permanentemente. Com 100 slots e clientes que às vezes travam, o pool se esgota
por acúmulo de lixo, não por demanda. A expiração é o que transforma uma falha
permanente em uma falha temporária.

### O que passa a ser necessário

**`expires_at` em toda alocação.** Já está no modelo acima.

**Recuperação preguiçosa, antes da ativa.** A cláusula
`WHERE lease_id IS NULL OR expires_at < now()` já trata um lease vencido como
livre no momento da aquisição. A correção não depende de nenhum processo de
limpeza estar vivo — o que importa, porque um sistema que só está correto
enquanto o cron funciona é frágil.

Um varredor periódico ainda é útil, mas por outros motivos: manter as métricas
de ocupação honestas e **avisar quem está esperando** que surgiu vaga
(pergunta 6). Ele é otimização, não requisito de correção.

**Token de propriedade na devolução.** Este é o ponto sutil, e o que mais gera
bug em produção:

```
t0  cliente A recebe o slot 7, lease L1, TTL 30s
t35 L1 expira; cliente B recebe o slot 7, lease L2
t36 A "acorda" de uma pausa e chama devolver(slot 7)
```

Se a devolução for por slot, A libera o slot que **B** está usando — e o sistema
empresta o slot 7 para um terceiro enquanto B ainda o utiliza. O limite continua
respeitado no papel, mas a exclusividade foi quebrada.

A correção é devolver por lease, não por slot:

```sql
UPDATE slots SET lease_id = NULL, holder = NULL, expires_at = NULL
 WHERE id = $slot AND lease_id = $lease_do_cliente;
```

Se o lease já não é o atual, nenhuma linha é afetada e a devolução vira um
no-op. Isso também torna a devolução **idempotente**: repetir não causa dano.
É o mesmo raciocínio de *fencing token* usado em locks distribuídos.

**Renovação para trabalhos longos.** Quem precisa de mais tempo faz heartbeat e
estende o `expires_at` — sempre condicionado ao lease ainda ser seu. Isso
permite um TTL curto sem punir operações demoradas.

### O trade-off do TTL

| TTL curto | TTL longo |
| --- | --- |
| Recupera rápido de clientes mortos | Tolera operações lentas sem renovação |
| Risco de tomar o recurso de quem ainda trabalha | Slot preso por muito tempo após uma queda |

Não existe valor universal. O caminho prático é derivá-lo da distribuição real
de tempo de posse — algo como o percentil 99 com folga — e usar renovação para
cobrir a cauda longa em vez de inflar o TTL para todo mundo.

---

## 4. Se o serviço que controla o pool cair no meio da operação, o que acontece com os recursos emprestados?

A resposta depende inteiramente de **onde o estado mora**. Por isso essa decisão
é tomada no primeiro dia, e não quando o problema aparece.

### Se o estado estiver na memória do processo

Perde-se tudo. Ao reiniciar, o serviço acredita ter 100 slots livres enquanto
clientes reais ainda usam o recurso — e passa a emprestar acima do limite, que é
exatamente a falha que o sistema existia para evitar. **Contador em memória é
inaceitável** para um invariante que precisa sobreviver a reinício.

### Com o estado durável (a proposta)

O estado está no banco, então a queda do serviço não apaga nada:

- **Leases já concedidos continuam válidos.** Quem tem o recurso segue
  trabalhando; a queda não invalida o que já foi combinado.
- **Novas aquisições e devoluções ficam indisponíveis** enquanto o serviço não
  volta. É indisponibilidade, não incorreção — e essa é a troca certa.
- **Ao voltar, a verdade está na tabela.** Não há reconstrução de estado, não há
  necessidade de os clientes se reapresentarem.
- **O que ficou órfão expira sozinho.** Leases sem renovação vencem e voltam ao
  pool. O sistema se conserta sem intervenção.

### As duas janelas perigosas

**Escrita parcial.** Se conceder um lease exigisse dois passos (decrementar um
contador *e* gravar o registro), uma queda entre eles deixaria o pool
inconsistente. Por isso a concessão é **uma transação só**: ou o slot está
marcado com dono e prazo, ou não está. Não existe meio-termo.

**Resposta perdida.** O caso genuinamente difícil: o `COMMIT` acontece, o
serviço cai antes de responder. O slot está reservado; o cliente não sabe que o
tem. Sem tratamento, o slot fica ocupado até expirar e o cliente pede outro —
consumindo dois. É aqui que a **chave de idempotência** paga o próprio custo: ao
repetir com a mesma chave, o cliente recebe o lease que já era dele.

Vale notar que isso não some: é o problema dos dois generais. Não dá para
garantir que cliente e servidor concordem com uma única troca de mensagens. O
que dá para fazer é tornar a repetição segura — que é o que a idempotência faz —
e limitar o estrago com TTL.

### E se o banco cair?

Aí o pool inteiro para. É a consequência assumida de ter uma fonte única de
verdade, e vale a pena ser explícito sobre a escolha:

- Aceitar a indisponibilidade e reduzi-la com réplica e failover (a rota que eu
  seguiria);
- Degradar para modo permissivo, emprestando sem controle — o que abandona o
  invariante, e só faz sentido se ultrapassar o limite for barato;
- Degradar para modo restritivo, recusando tudo — seguro, e adequado quando
  estourar o limite é caro.

A escolha é de produto, não de infraestrutura: depende de o que dói mais,
ultrapassar o limite ou ficar sem serviço.

---

## 5. Com uma segunda instância atrás de um load balancer, como manter o limite global de 100?

O limite é **global**; a decisão precisa ser tomada em um lugar que ambas as
instâncias enxergam. Isso é consequência direta da resposta 2 — e a boa notícia
é que a solução proposta já escala horizontalmente sem mudança alguma: o estado
nunca esteve no processo.

### O que quebra na hora

| Abordagem | Por que falha |
| --- | --- |
| Contador ou semáforo em memória | Cada instância controla os próprios 100: com duas, o sistema empresta 200 |
| Sticky sessions no load balancer | Prende o cliente a uma instância, não o **recurso**. Duas instâncias continuam decidindo em paralelo |
| Dividir o pool (50 por instância) | Mantém o teto, mas desperdiça: uma instância recusa com 50 livres na outra. E rebalancear ao escalar é um problema novo |

### A propriedade que importa

O ponto não é "ter um banco compartilhado" — é que a **decisão** seja atômica
naquele estado compartilhado. Duas instâncias lendo a mesma tabela e decidindo
cada uma por si reproduzem exatamente a corrida da pergunta 2, com outro nome.

Por isso a aquisição é a transação com `FOR UPDATE SKIP LOCKED`: o serializador
é o próprio banco. O número de instâncias passa a ser irrelevante para a
correção. Escalar de 2 para 20 não muda nada no raciocínio — só aumenta a
concorrência sobre a tabela, que é um problema de desempenho, mensurável e
tratável.

### O que passa a exigir atenção

**O estado compartilhado vira o ponto único de falha e de contenção.** Foi para
onde o problema se mudou, e é onde a capacidade precisa ser garantida: réplica,
failover, monitoramento de espera em lock.

**Contenção sob concorrência alta.** Se a tabela de slots começar a limitar, as
saídas, em ordem de preferência:

1. reduzir o tempo de transação (nada de I/O externo com a trava na mão);
2. trocar por uma estrutura mais barata (lista no Redis), assumindo o risco de
   failover descrito na pergunta 2;
3. particionar em blocos alugados dinamicamente — cada instância pega 10 slots
   por vez e devolve o que sobra. Reduz muito o tráfego no ponto central, mas
   traz de volta o desperdício e exige devolver blocos ociosos. Só com número
   medido justificando.

**O relógio, de novo.** Com várias instâncias, `now()` tem que ser o do banco.
Duas máquinas com relógios distantes discordariam sobre o que já expirou, e o
lease de uma seria roubado pela outra.

---

## 6. Não há recurso agora, mas um está prestes a ser devolvido. O cliente recebe erro ou espera?

Não existe resposta única — e um sistema que decide isso sozinho, sempre do mesmo
jeito, vai estar errado para metade dos clientes. **Quem sabe quanto vale a pena
esperar é quem chamou.**

### O que influencia a decisão

| Fator | Como pesa |
| --- | --- |
| **Prazo do cliente** | Uma requisição HTTP com timeout de 3s não pode esperar 10s. Esperar além do prazo dele é trabalho jogado fora dos dois lados |
| **Espera prevista** | Com tempo de posse conhecido e tamanho de fila conhecido, dá para estimar. Se a estimativa já ultrapassa o prazo, recusar agora é mais honesto |
| **Natureza do chamador** | Usuário na tela quer resposta rápida, ainda que negativa. Processo em lote prefere esperar a ter que reagendar |
| **Custo da recusa** | Se recusar significa refazer trabalho caro, esperar compensa. Se o cliente só tenta de novo, esperar economiza uma ida e volta |
| **Tamanho da fila** | Fila que não drena dentro do prazo de ninguém é só latência acumulada antes de um erro inevitável |
| **Justiça** | Sem ordem definida, o cliente azarado pode nunca ser atendido enquanto outros passam na frente |

### A decisão: espera limitada, declarada pelo cliente

O cliente informa quanto pode esperar; o servidor respeita esse teto e o próprio
orçamento:

```
POST /leases        { "max_wait_ms": 2000 }

201 Created         → recebeu o lease (imediatamente ou após esperar)
429 Too Many Requests + Retry-After → não deu no prazo
```

Assim o mesmo endpoint serve o usuário impaciente (`max_wait_ms: 0`, falha
rápida) e o job noturno (`max_wait_ms: 60000`), sem duas APIs.

### Três regras que eu não abriria mão

**Espera sempre limitada.** Espera infinita não elimina a escassez: ela troca
"faltam slots" por "faltam threads e conexões". O pool esgotado vira aplicação
esgotada, e a falha vaza para quem nem queria o recurso. É como uma
indisponibilidade localizada vira um incidente geral.

**Fila também tem teto.** Limitar só o tempo de espera não basta. Se a fila já é
maior do que consegue drenar dentro do prazo, o pedido novo é recusado **na
entrada** — ele não tem chance de ser atendido e ocuparia memória e conexão até
descobrir isso. Isso é controle de admissão, e é o que impede o colapso sob
sobrecarga.

**Esperar sem poluir.** Nada de o cliente ficar consultando de meio em meio
segundo: mil clientes em polling geram mais carga que o próprio trabalho. A
espera é por notificação — `LISTEN/NOTIFY` do PostgreSQL, ou `BLPOP` se o pool
estiver no Redis, que resolve espera, timeout e aquisição em uma operação
atômica. Nas retentativas, backoff exponencial **com jitter**: sem o jitter,
todos os clientes recusados voltam no mesmo instante e derrubam o serviço logo
depois de ele se recuperar.

### Sobre justiça

Com fila FIFO, ninguém morre de fome — mas todos esperam igual. Com classes de
prioridade, o tráfego crítico passa na frente, ao custo de os pedidos de baixa
prioridade poderem nunca ser atendidos sob pressão constante. Se houver classes,
elas precisam de reserva mínima garantida ou de envelhecimento na fila, senão a
classe baixa é abandonada na prática.

---

## Resumo das decisões

| Questão | Decisão | Principal alternativa descartada |
| --- | --- | --- |
| Onde mora o estado | Tabela no PostgreSQL, durável | Memória do processo — não sobrevive a reinício nem a duas instâncias |
| Como se decide | Transação com `FOR UPDATE SKIP LOCKED` | Ler-depois-escrever — condição de corrida; contador único — ponto quente |
| Unidade de alocação | Lease com TTL e identificador próprio | Posse indefinida — vaza capacidade a cada cliente que morre |
| Devolução | Condicionada ao lease atual, idempotente | Devolução por slot — libera o recurso de outro dono |
| Escala horizontal | Nenhuma mudança: o banco serializa | Particionar o pool por instância — desperdiça e complica |
| Sem recurso disponível | Espera limitada pelo prazo do cliente, com fila limitada | Espera infinita — troca escassez de slot por escassez de thread |
| Prioridade em conflito | Nunca ultrapassar 100, ainda que se use menos | Otimizar ocupação — arrisca justamente o que o limite protege |

O fio condutor: **um invariante, uma fonte de verdade, uma decisão atômica,
prazo em tudo.** O resto é ajuste de números com base em medição.
