#!/bin/bash
cd api
poetry run python3 main_config.py --config config.sample.yml --redis_host localhost --redis_port 6379 #--debug