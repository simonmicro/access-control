FROM python:3.9
WORKDIR /workspace
RUN curl -sSL https://install.python-poetry.org | python - --version 1.1.13
ENV PATH="/root/.local/bin:$PATH"
COPY api .
RUN poetry config virtualenvs.create false && poetry install --no-dev --no-interaction --no-ansi

ENV REDIS_HOST=127.0.0.1
ENV REDIS_PORT=6379
EXPOSE 80
CMD poetry run uvicorn api:app --workers $(nproc) --host 0.0.0.0 --port 80 --no-server-header