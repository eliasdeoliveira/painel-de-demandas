FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# A aplicação roda como usuário comum. No compose o banco é o PostgreSQL do
# serviço vizinho, então nada é gravado aqui; o chown existe para o caso de a
# imagem ser executada sem DATABASE_URL, quando o SQLite padrão precisa de
# permissão de escrita no diretório da aplicação.
RUN useradd --create-home --uid 1000 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# As migrations rodam antes do servidor: o contêiner sobe com o schema pronto.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
