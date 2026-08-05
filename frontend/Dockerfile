# ─── Dependências ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─── Build ─────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis NEXT_PUBLIC_* são embutidas no bundle durante o build, e não lidas
# em tempo de execução. Por isso a URL da API precisa chegar como build arg.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# ─── Execução ──────────────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

# O servidor do modo standalone escuta em `process.env.HOSTNAME || '0.0.0.0'`, e
# o Docker define HOSTNAME como o id do contêiner: sem fixar o valor, o Next
# atende em uma interface só. Publicando portas o problema passa despercebido,
# mas atrás de um proxy reverso o contêiner fica em mais de uma rede e o proxy
# tenta justamente o endereço em que ninguém está escutando.
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# O projeto não tem pasta `public/`: o favicon segue a convenção do App Router,
# em `src/app/`. Ao adicionar arquivos estáticos, copie `/app/public` também.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER node
EXPOSE 3000

CMD ["node", "server.js"]
