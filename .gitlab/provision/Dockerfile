# This image is more or less the same like the other Python images, but it
# is based on the kubectl image from bitnami (used by the provision service) instead!

FROM bitnami/kubectl
# Use root, as we need to install poetry and all the packages - not the best during runtime, but this service is not exposed anyways...
USER root
RUN install_packages python3 python3-venv python3-pip
RUN pip3 install -U setuptools pip
WORKDIR /workspace
RUN curl -sSL https://install.python-poetry.org | python3 - --version 1.1.13
ENV PATH="/.local/bin:$PATH"
COPY provision .
RUN poetry config virtualenvs.create false && poetry install --no-dev --no-interaction --no-ansi

ENV PYTHONUNBUFFERED=1
ENV CONFIGMAP=nginx-config-geo-ips
ENV PODSELECTOR=app=nginx
ENV REDIS_HOST=127.0.0.1
ENV REDIS_PORT=6379
ENTRYPOINT poetry run python3 main.py --redis_host $REDIS_HOST --redis_port $REDIS_PORT --configmap $CONFIGMAP --pod-selector=$PODSELECTOR