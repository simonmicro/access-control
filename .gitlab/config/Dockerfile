FROM debian
RUN apt-get update && apt-get install -y curl python3 python3-venv python3-pip
WORKDIR /workspace
RUN curl -sSL https://install.python-poetry.org | python3 - --version 1.1.13
ENV PATH="/root/.local/bin:$PATH"
COPY config .
RUN poetry config virtualenvs.create false && poetry install --no-dev --no-interaction --no-ansi

ENV PYTHONUNBUFFERED=1
ENV CONFIG_PATH=/config.yml
ENV REDIS_HOST=127.0.0.1
ENV REDIS_PORT=6379
CMD poetry run python3 main.py --config $CONFIG_PATH --redis_host $REDIS_HOST --redis_port $REDIS_PORT