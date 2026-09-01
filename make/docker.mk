# Docker Compose lifecycle and diagnostics.

##@ Docker

docker-auth: ## Verify Docker Hardened Images access without prompting
	@echo "$(BLUE)Checking Docker Hardened Images access...$(NC)"
	@for image in $(DHI_CHECK_IMAGES); do \
		echo "  $$image"; \
		docker pull "$$image" >/dev/null || { \
			echo "$(RED)Docker Hardened Images access failed for $$image.$(NC)"; \
			echo "$(YELLOW)Run 'docker login dhi.io', then retry 'make docker-test'.$(NC)"; \
			exit 1; \
		}; \
	done
	@for image in $(DHI_AMD64_CHECK_IMAGES); do \
		echo "  $$image (linux/amd64)"; \
		docker pull --platform linux/amd64 "$$image" >/dev/null || { \
			echo "$(RED)Docker Hardened Images access failed for $$image on linux/amd64.$(NC)"; \
			echo "$(YELLOW)Run 'docker login dhi.io', then retry 'make docker-test'.$(NC)"; \
			exit 1; \
		}; \
	done
	@echo "$(GREEN)Docker Hardened Images access verified$(NC)"

docker-certs: ## Generate locally trusted TLS certificates for Traefik
	@echo "$(BLUE)Generating local TLS certificates...$(NC)"
	@mkdir -p $(LOCAL_TLS_CERT_DIR)
	@docker/generate-local-certs.sh $(LOCAL_TLS_CERT_DIR)
	@echo "$(GREEN)Local TLS certificates are ready$(NC)"

docker-validate: ensure-env ## Validate Docker Compose files without starting containers
	@echo "$(BLUE)Validating Docker Compose configuration...$(NC)"
	$(DOCKER_COMPOSE) --env-file .env config >/dev/null
	$(DOCKER_COMPOSE) -f packages/kafka/compose.yml config >/dev/null
	@echo "$(GREEN)Docker Compose configuration is valid$(NC)"

docker-images: ensure-env ## List the fully resolved Compose images
	$(DOCKER_COMPOSE) --env-file .env config --images

docker-lock-images: ensure-env ## Write a digest-locked Compose override for reproducible image pulls
	@echo "$(BLUE)Resolving Compose image digests...$(NC)"
	$(DOCKER_COMPOSE) --env-file .env config --lock-image-digests -o $(DOCKER_IMAGE_LOCK_FILE)
	@echo "$(GREEN)Wrote $(DOCKER_IMAGE_LOCK_FILE)$(NC)"

docker-build: ensure-env docker-auth docker-certs ## Build all Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	$(DOCKER_COMPOSE) build --pull
	@echo "$(GREEN)Docker images built$(NC)"

docker-up: ensure-env docker-auth docker-certs ## Start all services with Docker Compose
	@echo "$(BLUE)Starting all services with Docker...$(NC)"
	$(DOCKER_COMPOSE) up -d --pull always --remove-orphans --wait --wait-timeout $(DOCKER_WAIT_TIMEOUT)
	@echo "$(GREEN)All services started$(NC)"
	@echo "$(YELLOW)Stripe CLI is included by default. Use 'make docker-logs-stripe' to inspect webhook forwarding status.$(NC)"

docker-up-build: ensure-env docker-auth docker-certs ## Build and start all services with Docker Compose
	@echo "$(BLUE)Building and starting all services...$(NC)"
	$(DOCKER_COMPOSE) up -d --build --pull always --remove-orphans --wait --wait-timeout $(DOCKER_WAIT_TIMEOUT)
	@echo "$(GREEN)All services started$(NC)"
	@echo "$(YELLOW)Stripe CLI is included by default. Use 'make docker-logs-stripe' to inspect webhook forwarding status.$(NC)"

docker-smoke: ## Smoke-test the running Docker stack over Traefik and service health endpoints
	@echo "$(BLUE)Smoke-testing Docker stack...$(NC)"
	@curl -4 -sSf --cacert "$(LOCAL_TLS_CERT_FILE)" --max-time $(DOCKER_SMOKE_TIMEOUT) https://shop.localhost:$(TRAEFIK_HTTPS_PORT)/api/health >/dev/null
	@curl -4 -sSf --cacert "$(LOCAL_TLS_CERT_FILE)" --max-time $(DOCKER_SMOKE_TIMEOUT) https://admin.localhost:$(TRAEFIK_HTTPS_PORT)/api/health >/dev/null
	@curl -4 -sSf --cacert "$(LOCAL_TLS_CERT_FILE)" --max-time $(DOCKER_SMOKE_TIMEOUT) -H 'content-type: application/json' --data '{"json":{"limit":1}}' https://api.localhost:$(TRAEFIK_HTTPS_PORT)/rpc/product/product/list >/dev/null
	$(DOCKER_COMPOSE) exec -T product-service bun -e "const r=await fetch('http://127.0.0.1:3000/health/ready'); if (!r.ok) process.exit(1);"
	$(DOCKER_COMPOSE) exec -T order-service bun -e "const r=await fetch('http://127.0.0.1:8001/health/ready'); if (!r.ok) process.exit(1);"
	$(DOCKER_COMPOSE) exec -T payment-service bun -e "const r=await fetch('http://127.0.0.1:8002/health/ready'); if (!r.ok) process.exit(1);"
	@echo "$(GREEN)Docker smoke tests passed$(NC)"

docker-test: ## Validate, build, start, and smoke-test the full Docker stack in order
	@$(MAKE) docker-validate
	@$(MAKE) docker-up-build
	@$(MAKE) docker-smoke
	@echo "$(GREEN)Docker test pipeline passed$(NC)"

docker-down: ## Stop all Docker services
	@echo "$(BLUE)Stopping Docker services...$(NC)"
	$(DOCKER_COMPOSE) down --remove-orphans
	@echo "$(GREEN)Docker services stopped$(NC)"

docker-down-volumes: ## Stop all Docker services and remove volumes
	@echo "$(RED)Stopping Docker services and removing volumes...$(NC)"
	$(DOCKER_COMPOSE) down -v --remove-orphans
	@echo "$(GREEN)Docker services stopped and volumes removed$(NC)"

docker-logs: ## View logs from all Docker services
	$(DOCKER_COMPOSE) logs -f

docker-logs-traefik: ## View Traefik logs
	$(DOCKER_COMPOSE) logs -f traefik

docker-logs-product: ## View product service logs
	$(DOCKER_COMPOSE) logs -f product-service

docker-logs-order: ## View order service logs
	$(DOCKER_COMPOSE) logs -f order-service

docker-logs-payment: ## View payment service logs
	$(DOCKER_COMPOSE) logs -f payment-service

docker-logs-client: ## View client logs
	$(DOCKER_COMPOSE) logs -f client

docker-logs-admin: ## View admin logs
	$(DOCKER_COMPOSE) logs -f admin

docker-logs-stripe: ## View Stripe CLI logs
	$(DOCKER_COMPOSE) logs -f stripe-cli

docker-ps: ## Show running Docker containers
	$(DOCKER_COMPOSE) ps

docker-restart: ## Restart all Docker services in order
	@$(MAKE) docker-down
	@$(MAKE) docker-up

docker-restart-service: ## Restart a specific service (SERVICE=product-service)
	@echo "$(BLUE)Restarting $(SERVICE)...$(NC)"
	$(DOCKER_COMPOSE) restart $(SERVICE)
	$(DOCKER_COMPOSE) up -d --wait --wait-timeout $(DOCKER_WAIT_TIMEOUT) --no-deps $(SERVICE)
	@echo "$(GREEN)$(SERVICE) restarted$(NC)"

docker-rebuild-service: ensure-env docker-auth ## Rebuild and restart a specific service (SERVICE=product-service)
	@echo "$(BLUE)Rebuilding $(SERVICE)...$(NC)"
	$(DOCKER_COMPOSE) up -d --no-deps --build --wait --wait-timeout $(DOCKER_WAIT_TIMEOUT) $(SERVICE)
	@echo "$(GREEN)$(SERVICE) rebuilt and restarted$(NC)"

docker-shell-traefik: ## DHI runtime images do not include a shell
	@echo "$(YELLOW)Traefik has no shell. Resolve its ID with '$(DOCKER_COMPOSE) ps -q traefik', then use 'docker debug <container-id>'.$(NC)"

docker-shell-product: ## DHI runtime images do not include a shell
	@echo "$(YELLOW)Product service has no shell. Resolve its ID with '$(DOCKER_COMPOSE) ps -q product-service', then use 'docker debug <container-id>'.$(NC)"

docker-shell-order: ## DHI runtime images do not include a shell
	@echo "$(YELLOW)Order service has no shell. Resolve its ID with '$(DOCKER_COMPOSE) ps -q order-service', then use 'docker debug <container-id>'.$(NC)"

docker-shell-payment: ## DHI runtime images do not include a shell
	@echo "$(YELLOW)Payment service has no shell. Resolve its ID with '$(DOCKER_COMPOSE) ps -q payment-service', then use 'docker debug <container-id>'.$(NC)"

docker-infra-only: ensure-env docker-auth docker-certs ## Start only infrastructure services
	@echo "$(BLUE)Starting infrastructure...$(NC)"
	$(DOCKER_COMPOSE) up -d --pull always --wait --wait-timeout $(DOCKER_WAIT_TIMEOUT) traefik postgres mongodb kafka-broker-1 kafka-broker-2 kafka-broker-3 kafka-ui
	@echo "$(GREEN)Infrastructure started$(NC)"

docker-infra-local: ensure-env docker-auth ## Start only database and Kafka infrastructure for local HTTP app development
	@echo "$(BLUE)Starting local development infrastructure...$(NC)"
	$(DOCKER_COMPOSE) up -d --pull always --wait --wait-timeout $(DOCKER_WAIT_TIMEOUT) postgres mongodb kafka-broker-1 kafka-broker-2 kafka-broker-3
	@echo "$(GREEN)Local development infrastructure started$(NC)"

docker-stripe-up: ensure-env ## Start the Stripe CLI listener for webhook forwarding
	@echo "$(BLUE)Starting Stripe CLI webhook forwarding...$(NC)"
	$(DOCKER_COMPOSE) up -d --pull always --wait --wait-timeout $(DOCKER_WAIT_TIMEOUT) stripe-cli
	@echo "$(YELLOW)Stripe webhook secret sync is automatic. Use 'make docker-logs-stripe' to confirm the listener is ready.$(NC)"

docker-stripe-down: ## Stop the Stripe CLI listener
	@echo "$(BLUE)Stopping Stripe CLI webhook forwarding...$(NC)"
	$(DOCKER_COMPOSE) stop stripe-cli
	@echo "$(GREEN)Stripe CLI stopped$(NC)"

docker-clean: ## Remove project Docker containers, network, volumes, and local images
	@echo "$(RED)Cleaning all Docker resources...$(NC)"
	$(DOCKER_COMPOSE) down -v --remove-orphans --rmi local
	@echo "$(GREEN)Docker resources cleaned$(NC)"

docker-clean-images: ## Stop the project stack and remove all unused Docker images
	@test "$(CONFIRM)" = "docker-clean-images" || { echo "$(RED)Host-wide image deletion requires CONFIRM=docker-clean-images.$(NC)"; exit 2; }
	@echo "$(RED)Stopping project stack and removing unused Docker images...$(NC)"
	$(DOCKER_COMPOSE) down -v --remove-orphans --rmi local
	docker image prune -af
	@echo "$(GREEN)Project stack stopped and unused Docker images removed$(NC)"

docker-prune: ## Prune unused Docker resources
	@test "$(CONFIRM)" = "docker-prune" || { echo "$(RED)Host-wide Docker pruning requires CONFIRM=docker-prune.$(NC)"; exit 2; }
	@echo "$(BLUE)Pruning Docker system...$(NC)"
	docker system prune -af --volumes
	@echo "$(GREEN)Docker system pruned$(NC)"

docker-kill-all: ## Kill every running Docker container on the machine
	@test "$(CONFIRM)" = "docker-kill-all" || { echo "$(RED)Stopping every host container requires CONFIRM=docker-kill-all.$(NC)"; exit 2; }
	@echo "$(RED)Killing all running Docker containers...$(NC)"
	@ids="$$(docker ps -q)"; if [ -n "$$ids" ]; then docker kill $$ids; fi
	@echo "$(GREEN)All running Docker containers stopped$(NC)"

docker-setup: setup-base docker-certs ## Run setup and start the full Docker stack
	@echo "$(BLUE)Starting the full Docker setup...$(NC)"
	@$(MAKE) docker-up-build

docker-fresh-start: ensure-env docker-certs ## Rebuild the Docker stack from a clean project state
	@echo "$(RED)Resetting the project Docker stack...$(NC)"
	$(DOCKER_COMPOSE) down -v --remove-orphans --rmi local
	@$(MAKE) docker-up-build

