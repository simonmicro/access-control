FROM python:3.9
WORKDIR /workspace
RUN curl -sSL https://install.python-poetry.org | python - --version 1.1.13
ENV PATH="/root/.local/bin:$PATH"
COPY api .
RUN poetry config virtualenvs.create false && poetry install --no-dev --no-interaction --no-ansi

ENV CONFIG_PATH=/config.yml
ENV REDIS_HOST=127.0.0.1
ENV REDIS_PORT=6379
CMD poetry run python3 main_config.py --config $CONFIG_PATH --redis_host $REDIS_HOST --redis_port $REDIS_PORT