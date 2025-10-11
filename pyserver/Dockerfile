FROM python:3.11-slim as builder

WORKDIR /app

RUN pip install --upgrade pip
RUN pip install poetry

COPY poetry.lock pyproject.toml ./

RUN poetry config virtualenvs.in-project true

RUN poetry install --no-root --only main

FROM python:3.11-slim

WORKDIR /app

RUN addgroup --system app && adduser --system --group app

COPY --from=builder /app/.venv /app/.venv

ENV PATH="/app/.venv/bin:$PATH"

COPY . .

RUN chown -R app:app /app

USER app

EXPOSE 8000

CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:8000"]