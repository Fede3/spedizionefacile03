# SpediamoFacile — Makefile shortcut comuni dev/test/build.
#
# Uso:
#   make              # mostra help
#   make dev          # avvia stack docker compose (5 servizi)
#   make dev-host     # avvia 3 processi in host (artisan + nuxt + caddy)
#   make test         # backend phpunit + frontend vitest
#   make test-e2e     # playwright E2E (richiede dev attivo)
#   make build        # build prod frontend (Nuxt SSR bundle)
#   make typecheck    # vue-tsc su apps/web
#   make lint         # eslint su apps/web
#   make seed         # rebuild DB + seeder demo
#   make logs         # tail logs container compose
#   make down         # stop compose (mantiene volumi)
#   make clean        # stop + rimuovi volumi (RESET COMPLETO)

.DEFAULT_GOAL := help
.PHONY: help dev dev-host test test-be test-fe test-e2e build typecheck lint seed logs down clean

help: ## Mostra questo help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dev: ## Avvia stack completo Docker (postgres+redis+laravel+nuxt+caddy)
	docker compose up -d
	@echo ""
	@echo "Stack pronto su http://127.0.0.1:8787"
	@echo "Logs: make logs"

dev-host: ## Avvia 3 processi host (php artisan + npm dev + caddy)
	@echo "Avvia in 3 terminali separati:"
	@echo "  1) php artisan serve --port=8000"
	@echo "  2) npm run dev --prefix apps/web"
	@echo "  3) caddy run --config infra/caddy/Caddyfile"

test: test-be test-fe ## Esegue tutti i test (backend + frontend unit)

test-be: ## Esegue test backend PHPUnit
	php artisan test

test-fe: ## Esegue test frontend Vitest unit
	cd apps/web && npm run test:unit

test-e2e: ## Esegue test E2E Playwright (richiede stack dev attivo)
	cd apps/web && npx playwright test

build: ## Build production frontend (.output/)
	cd apps/web && npm run build

typecheck: ## Vue-tsc strict su apps/web
	cd apps/web && npm run typecheck

lint: ## ESLint su apps/web
	cd apps/web && npm run lint

seed: ## Rebuild DB + seeder demo (admin/cliente/pro)
	php artisan migrate:fresh --seed

logs: ## Tail logs container docker compose
	docker compose logs -f --tail=100

down: ## Stop container (mantiene volumi)
	docker compose down

clean: ## RESET COMPLETO: stop + rimuovi volumi (drop DB + cache)
	docker compose down -v
