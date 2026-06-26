ifneq (,$(wildcard .env))
    include .env
    export
endif

.PHONY: init test format lint init-embeddings generate-embeddings init-modern-viz run-modern-viz build-modern-viz

init:
	~/.local/bin/uv venv --clear
	~/.local/bin/uv pip install -r requirements.txt

test:
	PYTHONPATH=. .venv/bin/pytest tests/

format:
	.venv/bin/black scripts/ tests/ visualization/

lint:
	.venv/bin/ruff check scripts/ tests/ visualization/

init-embeddings:
	~/.local/bin/uv pip install -r requirements-embeddings.txt

generate-embeddings:
	.venv/bin/python scripts/generate_embeddings.py --project $(PROJECT_ID) --location $(EMBED_LOCATION)

init-visualization:
	~/.local/bin/uv pip install -r visualization/requirements.txt

run-visualization:
	.venv/bin/streamlit run visualization/app.py

init-modern-viz:
	npm install --prefix modern-viz

run-modern-viz:
	npm run dev --prefix modern-viz

build-modern-viz:
	npm run build --prefix modern-viz

