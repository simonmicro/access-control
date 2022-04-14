#!/bin/bash
set -x

cd api
export REDIS_HOST=127.0.0.1
export REDIS_PORT=6379

# For development
poetry run uvicorn main:app --reload
#sleep 4

# For production
#poetry run uvicorn main:app --workers $(nproc) --no-server-header