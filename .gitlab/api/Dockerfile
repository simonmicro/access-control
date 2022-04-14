FROM debian
RUN apt-get update && apt-get install -y curl python3 python3-venv python3-pip
WORKDIR /workspace
RUN curl -sSL https://install.python-poetry.org | python3 - --version 1.1.13
ENV PATH="/root/.local/bin:$PATH"
COPY api .
RUN poetry config virtualenvs.create false && poetry install --no-dev --no-interaction --no-ansi

ENV PYTHONUNBUFFERED=1
ENV REDIS_HOST=127.0.0.1
ENV REDIS_PORT=6379
EXPOSE 80
CMD poetry run uvicorn main:app --workers $(nproc) --host 0.0.0.0 --port 80 --no-server-header