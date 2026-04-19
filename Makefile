# E-Commerce Microservices Makefile
# Manage all services, databases, and the hardened local Docker stack.

.PHONY: help ensure-env install dev stop clean clean-all setup setup-base generate-client kafka-ui db-setup db-migrate db-generate db-studio db-seed local-env-file local-db-migrate local-db-seed local-urls local-dev local-fresh-dev lint type-check format audit test verify build build-client build-admin logs-product logs-order logs-payment status docker-auth docker-certs docker-build docker-up docker-up-build docker-down docker-down-volumes docker-logs docker-logs-traefik docker-logs-product docker-logs-order docker-logs-payment docker-logs-client docker-logs-admin docker-logs-stripe docker-ps docker-restart docker-restart-service docker-rebuild-service docker-shell-traefik docker-shell-product docker-shell-order docker-shell-payment docker-infra-only docker-infra-local docker-stripe-up docker-stripe-down docker-clean docker-prune docker-kill-all docker-setup docker-fresh-start quick-start quick-stop restart docker-quick-start

.DEFAULT_GOAL := help

BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

LOCAL_DATABASE_URL := postgresql://postgres:postgres@localhost:5432/product_db?schema=public
LOCAL_MONGO_URL := mongodb://admin:admin123@127.0.0.1:27017/order_db?authSource=admin
LOCAL_KAFKA_BROKERS := localhost:9094,localhost:9095,localhost:9096
LOCAL_PRODUCT_SERVICE_URL := http://localhost:3000
LOCAL_ORDER_SERVICE_URL := http://localhost:8001
LOCAL_PAYMENT_SERVICE_URL := http://localhost:8002
LOCAL_STRIPE_WEBHOOK_URL := http://localhost:8002/api/webhooks/stripe
LOCAL_CLIENT_APP_URL := http://localhost:3002
LOCAL_CORS_ALLOWED_ORIGINS := http://localhost:3002,http://localhost:3003
LOCAL_ENV_FILE := /tmp/ecommerce-local-dev.env
DOCKER_COMPOSE ?= docker compose
DOCKER_WAIT_TIMEOUT ?= 180
DHI_CHECK_IMAGE ?= dhi.io/bun:1
LOCAL_TLS_CERT_DIR ?= docker/certs
LOCAL_TLS_CERT_FILE ?= $(LOCAL_TLS_CERT_DIR)/localhost.pem
LOCAL_TLS_KEY_FILE ?= $(LOCAL_TLS_CERT_DIR)/localhost-key.pem

##@ General

help: ## Display this help message
	@echo "$(BLUE)E-Commerce Microservices Platform$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make $(YELLOW)<target>$(NC)\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(GREEN)%-24s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Installation & Setup

ensure-env: ## Create a Docker-ready .env file when one does not exist
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)Created .env from .env.example$(NC)"; \
	else \
		echo "$(YELLOW).env already exists; leaving it unchanged$(NC)"; \
	fi

install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	bun install
	@echo "$(GREEN)Dependencies installed$(NC)"

generate-client: ## Generate the Prisma client for product-db
	@echo "$(BLUE)Generating Prisma client...$(NC)"
	cd packages/product-db && bun run db:generate
	@echo "$(GREEN)Prisma client generated$(NC)"

setup-base: ensure-env install generate-client

setup: setup-base ## Prepare the repo with a Docker-ready env and local dependencies
	@echo "$(GREEN)Setup complete$(NC)"
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Review .env and add real Clerk/Stripe keys if you need them"
	@echo "  2. Run 'make docker-up-build' to start the full Docker stack"
	@echo "  3. Sign in to ops routes with 'admin / local-dev'"

##@ Development

dev: ## Start all services in development mode
	@echo "$(BLUE)Starting all services...$(NC)"
	bun --env-file=.env run dev

dev-client: ## Start only the client application
	@echo "$(BLUE)Starting client...$(NC)"
	bun --env-file=.env x turbo run dev --filter=client

dev-admin: ## Start only the admin dashboard
	@echo "$(BLUE)Starting admin dashboard...$(NC)"
	bun --env-file=.env x turbo run dev --filter=admin

dev-product: ## Start only the product service
	@echo "$(BLUE)Starting product service...$(NC)"
	bun --env-file=.env x turbo run dev --filter=product-service

dev-order: ## Start only the order service
	@echo "$(BLUE)Starting order service...$(NC)"
	bun --env-file=.env x turbo run dev --filter=order-service

dev-payment: ## Start only the payment service
	@echo "$(BLUE)Starting payment service...$(NC)"
	bun --env-file=.env x turbo run dev --filter=payment-service

##@ Traefik & Kafka

traefik-dashboard: ## Open the Traefik dashboard in a browser
	@echo "$(BLUE)Opening Traefik dashboard...$(NC)"
	@start https://dashboard.localhost/dashboard/ 2>/dev/null || open https://dashboard.localhost/dashboard/ 2>/dev/null || xdg-open https://dashboard.localhost/dashboard/ 2>/dev/null
	@echo "$(YELLOW)Ops-route credentials are intended for local use only; rotate them before any shared use.$(NC)"

kafka-ui: ## Open Kafka UI in a browser
	@echo "$(BLUE)Opening Kafka UI...$(NC)"
	@start https://kafka.localhost 2>/dev/null || open https://kafka.localhost 2>/dev/null || xdg-open https://kafka.localhost 2>/dev/null

##@ Database

db-setup: db-generate ## Setup all databases
	@echo "$(GREEN)Database setup complete$(NC)"

db-migrate: ## Run product-service Prisma migrations
	@echo "$(BLUE)Running product service migrations...$(NC)"
	cd packages/product-db && bun run db:migrate
	@echo "$(GREEN)Migrations complete$(NC)"

db-generate: ## Generate the Prisma client
	@echo "$(BLUE)Generating Prisma client...$(NC)"
	cd packages/product-db && bun run db:generate
	@echo "$(GREEN)Prisma client generated$(NC)"

db-studio: ## Open Prisma Studio
	@echo "$(BLUE)Opening Prisma Studio...$(NC)"
	cd packages/product-db && bunx prisma studio

db-seed: ## Seed the product database
	@echo "$(BLUE)Seeding product database...$(NC)"
	cd apps/product-service && bun run src/scripts/seed.ts
	@echo "$(GREEN)Database seeded$(NC)"

local-env-file: ensure-env ## Create a merged env file for local apps with Docker-backed infra on localhost
	@cp .env $(LOCAL_ENV_FILE)
	@printf '\nDATABASE_URL=%s\nMONGO_URL=%s\nKAFKA_BROKERS=%s\nCLIENT_APP_URL=%s\nCORS_ALLOWED_ORIGINS=%s\nSTRIPE_WEBHOOK_URL=%s\nNEXT_PUBLIC_PRODUCT_SERVICE_URL=%s\nNEXT_PUBLIC_ORDER_SERVICE_URL=%s\nNEXT_PUBLIC_PAYMENT_SERVICE_URL=%s\nPRODUCT_SERVICE_INTERNAL_URL=%s\nORDER_SERVICE_INTERNAL_URL=%s\nPAYMENT_SERVICE_INTERNAL_URL=%s\n' \
		"$(LOCAL_DATABASE_URL)" \
		"$(LOCAL_MONGO_URL)" \
		"$(LOCAL_KAFKA_BROKERS)" \
		"$(LOCAL_CLIENT_APP_URL)" \
		"$(LOCAL_CORS_ALLOWED_ORIGINS)" \
		"$(LOCAL_STRIPE_WEBHOOK_URL)" \
		"$(LOCAL_PRODUCT_SERVICE_URL)" \
		"$(LOCAL_ORDER_SERVICE_URL)" \
		"$(LOCAL_PAYMENT_SERVICE_URL)" \
		"$(LOCAL_PRODUCT_SERVICE_URL)" \
		"$(LOCAL_ORDER_SERVICE_URL)" \
		"$(LOCAL_PAYMENT_SERVICE_URL)" >> $(LOCAL_ENV_FILE)
	@echo "$(GREEN)Created merged local env at $(LOCAL_ENV_FILE)$(NC)"

local-db-migrate: local-env-file ## Run Prisma migrations against local Docker Postgres
	@echo "$(BLUE)Running local product service migrations...$(NC)"
	@cd packages/product-db && bun --env-file=$(LOCAL_ENV_FILE) run db:migrate
	@echo "$(GREEN)Local migrations complete$(NC)"

local-db-seed: local-env-file ## Seed the local Docker-backed catalog and publish Kafka product events
	@echo "$(BLUE)Seeding local product catalog...$(NC)"
	@bun --env-file=$(LOCAL_ENV_FILE) run apps/product-service/src/scripts/seed.ts
	@echo "$(GREEN)Local catalog seeded$(NC)"

##@ Code Quality

lint: ## Run Biome checks across the monorepo
	@echo "$(BLUE)Running Biome checks...$(NC)"
	bun run lint
	@echo "$(GREEN)Biome checks complete$(NC)"

type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Running type checks...$(NC)"
	bun run check-types
	@echo "$(GREEN)Type checking complete$(NC)"

format: ## Format code with Biome
	@echo "$(BLUE)Formatting code with Biome...$(NC)"
	bun run format
	@echo "$(GREEN)Code formatted$(NC)"

audit: ## Run the dependency security audit
	@echo "$(BLUE)Running Bun security audit...$(NC)"
	bun run audit
	@echo "$(GREEN)Security audit complete$(NC)"

test: ## Run the automated contract and smoke tests
	@echo "$(BLUE)Running Bun tests...$(NC)"
	bun run test
	@echo "$(GREEN)Tests complete$(NC)"

verify: ## Run the full local verification pipeline
	@echo "$(BLUE)Running the full verification pipeline...$(NC)"
	bun run verify
	@echo "$(GREEN)Verification complete$(NC)"

##@ Build

build: ## Build all applications for production
	@echo "$(BLUE)Building all applications...$(NC)"
	bun run build
	@echo "$(GREEN)Build complete$(NC)"

build-client: ## Build the client application
	@echo "$(BLUE)Building client...$(NC)"
	bunx turbo run build --filter=client
	@echo "$(GREEN)Client built$(NC)"

build-admin: ## Build the admin dashboard
	@echo "$(BLUE)Building admin...$(NC)"
	bunx turbo run build --filter=admin
	@echo "$(GREEN)Admin built$(NC)"

##@ Cleanup

clean: ## Clean build artifacts and caches
	@echo "$(RED)Cleaning build artifacts...$(NC)"
	@bunx turbo daemon stop || true
	@find . -type d \( \
		-name node_modules -o \
		-name .next -o \
		-name .turbo -o \
		-name out -o \
		-name coverage -o \
		-name dist -o \
		-name build -o \
		-name .cache \
	\) -prune -exec rm -rf {} +
	@find . -type f -name '*.tsbuildinfo' -delete
	@rm -f $(LOCAL_ENV_FILE)
	@echo "$(GREEN)Cleanup complete$(NC)"

clean-all: clean docker-clean ## Clean everything including Docker data
	@echo "$(GREEN)Full cleanup complete$(NC)"

stop: ## Stop all running services
	@echo "$(BLUE)Stopping all services...$(NC)"
	@pkill -f "turbo dev" || true
	@pkill -f "next dev" || true
	@pkill -f "bun run" || true
	@docker compose down 2>/dev/null || true
	@echo "$(GREEN)All services stopped$(NC)"

##@ Monitoring

logs-product: ## Stream product service logs
	bunx turbo run dev --filter=product-service

logs-order: ## Stream order service logs
	bunx turbo run dev --filter=order-service

logs-payment: ## Stream payment service logs
	bunx turbo run dev --filter=payment-service

status: ## Show service status and URLs
	@echo "$(BLUE)Service Status:$(NC)"
	@echo ""
	@echo "$(YELLOW)Docker Compose:$(NC)"
	@$(DOCKER_COMPOSE) ps || echo "  $(RED)Not running$(NC)"
	@echo ""
	@echo "$(YELLOW)Service URLs:$(NC)"
	@echo "  Traefik Dashboard: https://dashboard.localhost/dashboard/"
	@echo "  Client:            https://shop.localhost"
	@echo "  Admin:             https://admin.localhost"
	@echo "  Product API:       https://api.localhost/products"
	@echo "  Order API:         https://api.localhost/api/orders"
	@echo "  Payment API:       https://api.localhost/api/session"
	@echo "  Kafka UI:          https://kafka.localhost"
	@echo "  Stripe CLI Logs:   make docker-logs-stripe"
	@echo "  Ops Auth:          admin / local-dev"

local-urls: ## Show localhost URLs for local apps plus Docker infrastructure
	@echo "$(BLUE)Local Dev URLs:$(NC)"
	@echo ""
	@echo "$(YELLOW)Applications:$(NC)"
	@echo "  Client:            http://localhost:3002"
	@echo "  Admin:             http://localhost:3003"
	@echo "  Product API:       http://localhost:3000/products"
	@echo "  Category API:      http://localhost:3000/categories"
	@echo "  Order API:         http://localhost:8001/api/orders"
	@echo "  Payment API:       http://localhost:8002/api/session"
	@echo "  Stripe Webhook:    http://localhost:8002/api/webhooks/stripe"
	@echo ""
	@echo "$(YELLOW)Infrastructure:$(NC)"
	@echo "  Postgres:          postgresql://postgres:postgres@localhost:5432/product_db?schema=public"
	@echo "  MongoDB:           mongodb://admin:admin123@localhost:27017/order_db?authSource=admin"
	@echo "  Kafka Brokers:     localhost:9094, localhost:9095, localhost:9096"

##@ Docker

docker-auth: ## Verify Docker Hardened Images access without prompting
	@echo "$(BLUE)Checking Docker Hardened Images access...$(NC)"
	@docker pull $(DHI_CHECK_IMAGE) >/dev/null
	@echo "$(GREEN)Docker Hardened Images access verified$(NC)"

docker-certs: ## Generate locally trusted TLS certificates for Traefik
	@echo "$(BLUE)Generating local TLS certificates...$(NC)"
	@mkdir -p $(LOCAL_TLS_CERT_DIR)
	@docker/generate-local-certs.sh $(LOCAL_TLS_CERT_DIR)
	@echo "$(GREEN)Local TLS certificates are ready$(NC)"

docker-build: ensure-env docker-auth docker-certs ## Build all Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	$(DOCKER_COMPOSE) build --pull
	@echo "$(GREEN)Docker images built$(NC)"

docker-up: ensure-env docker-auth docker-certs ## Start all services with Docker Compose
	@echo "$(BLUE)Starting all services with Docker...$(NC)"
	$(DOCKER_COMPOSE) up -d --remove-orphans --wait --wait-timeout $(DOCKER_WAIT_TIMEOUT)
	@echo "$(GREEN)All services started$(NC)"
	@echo "$(YELLOW)Stripe CLI is included by default. Use 'make docker-logs-stripe' to inspect webhook forwarding status.$(NC)"

docker-up-build: ensure-env docker-auth docker-certs ## Build and start all services with Docker Compose
	@echo "$(BLUE)Building and starting all services...$(NC)"
	$(DOCKER_COMPOSE) up -d --build --remove-orphans --wait --wait-timeout $(DOCKER_WAIT_TIMEOUT)
	@echo "$(GREEN)All services started$(NC)"
	@echo "$(YELLOW)Stripe CLI is included by default. Use 'make docker-logs-stripe' to inspect webhook forwarding status.$(NC)"

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

docker-restart: docker-down docker-up ## Restart all Docker services

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
	@echo "$(YELLOW)Traefik now runs on a shell-less hardened image. Use 'docker debug ecommerce-traefik' when interactive inspection is needed.$(NC)"

docker-shell-product: ## DHI runtime images do not include a shell
	@echo "$(YELLOW)Product service now runs on a shell-less hardened image. Use 'docker debug ecommerce-product-service' when interactive inspection is needed.$(NC)"

docker-shell-order: ## DHI runtime images do not include a shell
	@echo "$(YELLOW)Order service now runs on a shell-less hardened image. Use 'docker debug ecommerce-order-service' when interactive inspection is needed.$(NC)"

docker-shell-payment: ## DHI runtime images do not include a shell
	@echo "$(YELLOW)Payment service now runs on a shell-less hardened image. Use 'docker debug ecommerce-payment-service' when interactive inspection is needed.$(NC)"

docker-infra-only: ensure-env docker-auth docker-certs ## Start only infrastructure services
	@echo "$(BLUE)Starting infrastructure...$(NC)"
	$(DOCKER_COMPOSE) up -d --wait --wait-timeout $(DOCKER_WAIT_TIMEOUT) traefik postgres mongodb kafka-broker-1 kafka-broker-2 kafka-broker-3 kafka-ui
	@echo "$(GREEN)Infrastructure started$(NC)"

docker-infra-local: ensure-env docker-auth ## Start only database and Kafka infrastructure for local HTTP app development
	@echo "$(BLUE)Starting local development infrastructure...$(NC)"
	$(DOCKER_COMPOSE) up -d --wait --wait-timeout $(DOCKER_WAIT_TIMEOUT) postgres mongodb kafka-broker-1 kafka-broker-2 kafka-broker-3
	@echo "$(GREEN)Local development infrastructure started$(NC)"

docker-stripe-up: ensure-env ## Start the Stripe CLI listener for webhook forwarding
	@echo "$(BLUE)Starting Stripe CLI webhook forwarding...$(NC)"
	$(DOCKER_COMPOSE) up -d --wait --wait-timeout $(DOCKER_WAIT_TIMEOUT) stripe-cli
	@echo "$(YELLOW)Stripe webhook secret sync is automatic. Use 'make docker-logs-stripe' to confirm the listener is ready.$(NC)"

docker-stripe-down: ## Stop the Stripe CLI listener
	@echo "$(BLUE)Stopping Stripe CLI webhook forwarding...$(NC)"
	$(DOCKER_COMPOSE) stop stripe-cli
	@echo "$(GREEN)Stripe CLI stopped$(NC)"

docker-clean: ## Remove project Docker containers, network, volumes, and local images
	@echo "$(RED)Cleaning all Docker resources...$(NC)"
	$(DOCKER_COMPOSE) down -v --remove-orphans --rmi local
	@echo "$(GREEN)Docker resources cleaned$(NC)"

docker-prune: ## Prune unused Docker resources
	@echo "$(BLUE)Pruning Docker system...$(NC)"
	docker system prune -af --volumes
	@echo "$(GREEN)Docker system pruned$(NC)"

docker-kill-all: ## Kill every running Docker container on the machine
	@echo "$(RED)Killing all running Docker containers...$(NC)"
	@docker ps -q | xargs -r docker kill
	@echo "$(GREEN)All running Docker containers stopped$(NC)"

docker-setup: setup-base docker-certs ## Run setup and start the full Docker stack
	@echo "$(BLUE)Starting the full Docker setup...$(NC)"
	@$(MAKE) docker-up-build

docker-fresh-start: ensure-env docker-certs ## Rebuild the Docker stack from a clean project state
	@echo "$(RED)Resetting the project Docker stack...$(NC)"
	$(DOCKER_COMPOSE) down -v --remove-orphans --rmi local
	@$(MAKE) docker-up-build

##@ Quick Commands

quick-start: docker-infra-only dev ## Start infrastructure plus local dev services

local-dev: setup-base docker-infra-local local-env-file local-db-migrate local-db-seed local-urls ## Run apps locally over HTTP with Docker only for DB and Kafka
	@echo "$(BLUE)Starting local application services...$(NC)"
	@bun --env-file=$(LOCAL_ENV_FILE) run dev

local-fresh-dev: setup-base ## Kill all containers, start only DB/Kafka infra, then run local apps over HTTP
	@$(MAKE) docker-kill-all
	@$(MAKE) docker-infra-local
	@$(MAKE) local-env-file
	@$(MAKE) local-db-migrate
	@$(MAKE) local-db-seed
	@$(MAKE) local-urls
	@echo "$(BLUE)Starting local application services...$(NC)"
	@bun --env-file=$(LOCAL_ENV_FILE) run dev

quick-stop: stop ## Stop everything quickly

restart: stop quick-start ## Restart everything

docker-quick-start: docker-setup ## Install, prepare env, and start the full Docker stack
