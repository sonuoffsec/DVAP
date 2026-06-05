.DEFAULT_GOAL := help
.PHONY: help up down restart logs ps build pull-model reset migrate upgrade lint test

COMPOSE := docker compose
API := $(COMPOSE) exec api
WEB := $(COMPOSE) exec web

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

up: ## Start all services
	$(COMPOSE) up -d --build

down: ## Stop and remove containers
	$(COMPOSE) down

restart: ## Restart all services
	$(COMPOSE) restart

logs: ## Tail logs for all services
	$(COMPOSE) logs -f

logs-api: ## Tail API logs
	$(COMPOSE) logs -f api

logs-web: ## Tail web logs
	$(COMPOSE) logs -f web

ps: ## Show service status
	$(COMPOSE) ps

build: ## Rebuild all images
	$(COMPOSE) build --no-cache

pull-model: ## Pull default Ollama model (llama3.2:3b)
	$(COMPOSE) exec ollama ollama pull llama3.2:3b

pull-embed: ## Pull embedding model
	$(COMPOSE) exec ollama ollama pull nomic-embed-text

reset: ## Full reset: stop containers, delete volumes, restart
	$(COMPOSE) down -v
	$(COMPOSE) up -d --build

upgrade: ## Pull latest changes and rebuild (migrations run automatically on restart)
	git pull
	$(COMPOSE) up -d --build

migrate: ## Manually run database migrations
	$(API) alembic upgrade head

migration-status: ## Show current migration revision
	$(API) alembic current

shell-api: ## Open shell in API container
	$(API) bash

shell-db: ## Open psql in database container
	$(COMPOSE) exec postgres psql -U dvap -d dvap

test-api: ## Run backend tests
	$(API) pytest tests/ -v

lint-api: ## Lint backend code
	$(API) ruff check app/
	$(API) ruff format --check app/
