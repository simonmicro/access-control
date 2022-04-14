#!/bin/bash
cd config
poetry run python3 main.py --config config.sample.yml --redis_host localhost --redis_port 6379 #--debug
