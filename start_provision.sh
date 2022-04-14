#!/bin/bash
cd provision
poetry run python3 main.py --redis_host localhost --redis_port 6379 --configmap nginx-config-geo-ips --pod-selector=app=nginx #--debug