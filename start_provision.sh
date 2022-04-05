#!/bin/bash
cd api
poetry run python3 main_provision.py --redis_host localhost --redis_port 6379 #--debug