#!/bin/bash
docker run -v "$(pwd)/redis:/data" -p 6379:6379 redis redis-server --save 60 1 --loglevel warning
