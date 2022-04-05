-> https://python-poetry.org/docs/basic-usage/
poetry install
poetry run uvicorn api:app --reload

-> later on uvicorn main:app --host 0.0.0.0 --port 80
-> or integrate it! https://www.uvicorn.org/deployment/#running-programmatically
...poetry run python3 main.py