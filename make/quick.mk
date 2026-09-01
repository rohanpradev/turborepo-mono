# Convenience workflows composed from the focused target groups.

##@ Quick Commands

quick-start: ## Start infrastructure, then local dev services
	@$(MAKE) docker-infra-only
	@$(MAKE) dev

local-dev: ## Run apps locally over HTTP with Docker only for DB and Kafka
	@$(MAKE) setup-base
	@$(MAKE) docker-infra-local
	@$(MAKE) local-env-file
	@$(MAKE) local-db-migrate
	@$(MAKE) local-db-seed
	@$(MAKE) local-urls
	@echo "$(BLUE)Starting local application services...$(NC)"
	@trap 'rm -f "$(LOCAL_ENV_FILE)"' EXIT INT TERM; bun --env-file=$(LOCAL_ENV_FILE) run dev

local-fresh-dev: ## Reset only this project, start DB/Kafka infra, then run local apps over HTTP
	@$(MAKE) setup-base
	@$(MAKE) docker-down-volumes
	@$(MAKE) docker-infra-local
	@$(MAKE) local-env-file
	@$(MAKE) local-db-migrate
	@$(MAKE) local-db-seed
	@$(MAKE) local-urls
	@echo "$(BLUE)Starting local application services...$(NC)"
	@trap 'rm -f "$(LOCAL_ENV_FILE)"' EXIT INT TERM; bun --env-file=$(LOCAL_ENV_FILE) run dev

quick-stop: stop ## Stop everything quickly

restart: ## Restart project services in order
	@$(MAKE) stop
	@$(MAKE) quick-start

docker-quick-start: docker-setup ## Install, prepare env, and start the full Docker stack
