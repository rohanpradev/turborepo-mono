# E-Commerce Microservices Makefile
# Manage all services, databases, Docker Compose, and Kubernetes/Helm workflows.

.PHONY: help ensure-env install dev stop clean clean-all setup setup-base generate-client kafka-ui db-setup db-migrate db-generate db-studio db-seed local-env-file local-db-migrate local-db-seed local-urls local-dev local-fresh-dev lint type-check format audit test verify build build-client build-admin logs-product logs-order logs-payment status docker-auth docker-certs docker-validate docker-images docker-lock-images docker-build docker-up docker-up-build docker-smoke docker-test docker-down docker-down-volumes docker-logs docker-logs-traefik docker-logs-product docker-logs-order docker-logs-payment docker-logs-client docker-logs-admin docker-logs-stripe docker-ps docker-restart docker-restart-service docker-rebuild-service docker-shell-traefik docker-shell-product docker-shell-order docker-shell-payment docker-infra-only docker-infra-local docker-stripe-up docker-stripe-down docker-clean docker-clean-images docker-prune docker-kill-all docker-setup docker-fresh-start helm-lint helm-template helm-dry-run helm-package k8s-doctor k8s-traefik k8s-traefik-status k8s-preflight k8s-local-deps k8s-namespace k8s-tls-secret k8s-runtime-secret k8s-build-images k8s-build-full-images k8s-load-images k8s-validate k8s-validate-full k8s-diff k8s-deploy k8s-deploy-full k8s-up k8s-up-full k8s-full k8s-wait k8s-smoke k8s-smoke-full k8s-test k8s-status k8s-events k8s-logs k8s-logs-traefik k8s-logs-client k8s-logs-admin k8s-logs-product k8s-logs-order k8s-logs-payment k8s-describe k8s-restart k8s-uninstall k8s-clear k8s-open k8s ks8 kubernetes clear quick-start quick-stop restart docker-quick-start

.DEFAULT_GOAL := help

BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

LOCAL_DATABASE_URL := postgresql://postgres:postgres@localhost:5432/product_db?schema=public
LOCAL_MONGO_URL := mongodb://127.0.0.1:27017/order_db
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
TRAEFIK_HTTP_PORT ?= 8080
TRAEFIK_HTTPS_PORT ?= 8443
HELM ?= helm
KUBECTL ?= kubectl
HELM_CHART ?= charts/ecommerce
HELM_RELEASE ?= ecommerce
HELM_NAMESPACE ?= ecommerce
TRAEFIK_NAMESPACE ?= traefik
TRAEFIK_GATEWAY_TLS_SECRET ?= local-selfsigned-tls
HELM_VALUES ?= charts/ecommerce/values.web-local.yaml
HELM_FULL_VALUES ?= charts/ecommerce/values.local.yaml
HELM_RUNTIME_SECRET ?= $(HELM_RELEASE)-runtime
HELM_TLS_SECRET ?= ecommerce-local-tls
K8S_ROUTE_SET_ARGS ?= --set gateway.enabled=false --set ingress.enabled=true --set ingress.className=traefik
HELM_SET_ARGS ?= --set secrets.name=$(HELM_RUNTIME_SECRET) --set ingress.tls.secretName=$(HELM_TLS_SECRET) $(K8S_ROUTE_SET_ARGS)
HELM_RENDERED_FILE ?= /tmp/$(HELM_RELEASE)-rendered.yaml
HELM_PACKAGE_DIR ?= /tmp/helm-packages
K8S_DATABASE_URL ?= postgresql://postgres:postgres@host.docker.internal:5432/product_db?schema=public
K8S_MONGO_URL ?= mongodb://host.docker.internal:27017/order_db
K8S_PUBLIC_CLIENT_APP_URL ?= https://shop.localhost
K8S_PUBLIC_ADMIN_APP_URL ?= https://admin.localhost
K8S_PUBLIC_API_URL ?= https://api.localhost
K8S_INGRESS_CLASS_NAME ?= traefik
K8S_ROLLOUT_TIMEOUT ?= 5m
K8S_LOG_TAIL ?= 200
K8S_SMOKE_TIMEOUT ?= 10
K8S_SERVICE ?= client
K8S_IMAGE_TAG ?= latest
K8S_LOCAL_IMAGES ?= turborepo-monorepo-product-service:$(K8S_IMAGE_TAG) turborepo-monorepo-order-service:$(K8S_IMAGE_TAG) turborepo-monorepo-payment-service:$(K8S_IMAGE_TAG) turborepo-monorepo-client:$(K8S_IMAGE_TAG) turborepo-monorepo-admin:$(K8S_IMAGE_TAG)
HELM_UPGRADE_ARGS ?= --rollback-on-failure --wait --timeout $(K8S_ROLLOUT_TIMEOUT)
DHI_CHECK_IMAGES ?= dhi.io/bun:1-debian13 dhi.io/traefik:3.7-debian13 dhi.io/postgres:18-debian13 dhi.io/kafka:4.2-debian13-native
DHI_AMD64_CHECK_IMAGES ?= dhi.io/mongodb:8.3-debian13
DOCKER_SMOKE_TIMEOUT ?= 10
DOCKER_IMAGE_LOCK_FILE ?= docker/compose.images.lock.yml
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

clean-all: clean docker-clean-images ## Clean everything including Docker data and images
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
	@echo "  Traefik Dashboard: https://dashboard.localhost:$(TRAEFIK_HTTPS_PORT)/dashboard/"
	@echo "  Client:            https://shop.localhost:$(TRAEFIK_HTTPS_PORT)"
	@echo "  Admin:             https://admin.localhost:$(TRAEFIK_HTTPS_PORT)"
	@echo "  Product RPC:       https://api.localhost:$(TRAEFIK_HTTPS_PORT)/rpc/product"
	@echo "  Order RPC:         https://api.localhost:$(TRAEFIK_HTTPS_PORT)/rpc/order"
	@echo "  Payment RPC:       https://api.localhost:$(TRAEFIK_HTTPS_PORT)/rpc/payment"
	@echo "  Kafka UI:          https://kafka.localhost:$(TRAEFIK_HTTPS_PORT)"
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
	@echo "  MongoDB:           mongodb://127.0.0.1:27017/order_db"
	@echo "  Kafka Brokers:     localhost:9094, localhost:9095, localhost:9096"

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
	@curl -4 -skSf --max-time $(DOCKER_SMOKE_TIMEOUT) https://shop.localhost:$(TRAEFIK_HTTPS_PORT)/api/health >/dev/null
	@curl -4 -skSf --max-time $(DOCKER_SMOKE_TIMEOUT) https://admin.localhost:$(TRAEFIK_HTTPS_PORT)/api/health >/dev/null
	@curl -4 -skSf --max-time $(DOCKER_SMOKE_TIMEOUT) -H 'content-type: application/json' --data '{"json":{"limit":1}}' https://api.localhost:$(TRAEFIK_HTTPS_PORT)/rpc/product/product/list >/dev/null
	$(DOCKER_COMPOSE) exec -T product-service bun -e "const r=await fetch('http://127.0.0.1:3000/health/ready'); if (!r.ok) process.exit(1);"
	$(DOCKER_COMPOSE) exec -T order-service bun -e "const r=await fetch('http://127.0.0.1:8001/health/ready'); if (!r.ok) process.exit(1);"
	$(DOCKER_COMPOSE) exec -T payment-service bun -e "const r=await fetch('http://127.0.0.1:8002/health/ready'); if (!r.ok) process.exit(1);"
	@echo "$(GREEN)Docker smoke tests passed$(NC)"

docker-test: docker-validate docker-up-build docker-smoke ## Validate, build, start, and smoke-test the full Docker stack
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
	@echo "$(RED)Stopping project stack and removing unused Docker images...$(NC)"
	$(DOCKER_COMPOSE) down -v --remove-orphans --rmi local
	docker image prune -af
	@echo "$(GREEN)Project stack stopped and unused Docker images removed$(NC)"

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

##@ Kubernetes / Helm

helm-lint: ## Lint the ecommerce Helm chart
	@echo "$(BLUE)Linting Helm chart...$(NC)"
	$(HELM) lint $(HELM_CHART)
	@echo "$(GREEN)Helm chart lint passed$(NC)"

helm-template: ## Render the ecommerce Helm chart locally
	@$(HELM) template $(HELM_RELEASE) $(HELM_CHART) --namespace $(HELM_NAMESPACE) --values $(HELM_VALUES) $(HELM_SET_ARGS)

helm-dry-run: helm-lint ## Run a Helm install/upgrade dry run against the current cluster
	@echo "$(BLUE)Running Helm dry run...$(NC)"
	$(HELM) upgrade --install $(HELM_RELEASE) $(HELM_CHART) --namespace $(HELM_NAMESPACE) --create-namespace --values $(HELM_VALUES) $(HELM_SET_ARGS) --dry-run=client

helm-package: helm-lint ## Package the Helm chart for release or registry publishing
	@mkdir -p $(HELM_PACKAGE_DIR)
	$(HELM) package $(HELM_CHART) --destination $(HELM_PACKAGE_DIR)
	@echo "$(GREEN)Packaged chart in $(HELM_PACKAGE_DIR)$(NC)"

k8s-doctor: ## Show local Kubernetes tooling, context, ingress, and release diagnostics
	@echo "$(BLUE)Kubernetes doctor$(NC)"
	@printf "  helm: "; if command -v $(HELM) >/dev/null; then $(HELM) version --short; else echo "$(RED)missing$(NC)"; fi
	@printf "  kubectl: "; if command -v $(KUBECTL) >/dev/null; then $(KUBECTL) version --client=true --short 2>/dev/null || $(KUBECTL) version --client=true; else echo "$(RED)missing$(NC)"; fi
	@printf "  context: "; $(KUBECTL) config current-context 2>/dev/null || echo "$(RED)unavailable$(NC)"
	@printf "  cluster: "; $(KUBECTL) cluster-info >/dev/null 2>&1 && echo "$(GREEN)reachable$(NC)" || echo "$(RED)unreachable$(NC)"
	@echo ""
	@$(KUBECTL) get ingressclass "$(K8S_INGRESS_CLASS_NAME)" 2>/dev/null || echo "$(YELLOW)IngressClass '$(K8S_INGRESS_CLASS_NAME)' not found. Run 'make k8s-traefik'.$(NC)"
	@$(KUBECTL) -n $(TRAEFIK_NAMESPACE) get pods,svc 2>/dev/null || true
	@$(KUBECTL) -n $(HELM_NAMESPACE) get pods,svc,ingress,httproute 2>/dev/null || true

k8s-traefik: ## Install or upgrade Traefik ingress for the local Kubernetes workflow
	@echo "$(BLUE)Installing Traefik ingress...$(NC)"
	@command -v $(HELM) >/dev/null || { echo "$(RED)helm is required$(NC)"; exit 1; }
	@command -v $(KUBECTL) >/dev/null || { echo "$(RED)kubectl is required$(NC)"; exit 1; }
	@$(KUBECTL) cluster-info >/dev/null
	$(HELM) upgrade --install traefik traefik \
		--repo https://traefik.github.io/charts \
		--namespace $(TRAEFIK_NAMESPACE) \
		--create-namespace \
		--skip-crds \
		--set ingressClass.enabled=true \
		--set ingressClass.name=$(K8S_INGRESS_CLASS_NAME) \
		--set providers.kubernetesIngress.enabled=true \
		--set service.type=LoadBalancer \
		--wait \
		--timeout $(K8S_ROLLOUT_TIMEOUT)
	@echo "$(GREEN)Traefik ingress is ready$(NC)"

k8s-traefik-status: ## Show Traefik resources in Kubernetes
	$(KUBECTL) -n $(TRAEFIK_NAMESPACE) get pods,svc
	$(KUBECTL) get ingressclass $(K8S_INGRESS_CLASS_NAME)

k8s-preflight: ## Verify local Kubernetes, Helm, kubectl, and Traefik ingress prerequisites
	@echo "$(BLUE)Checking Kubernetes prerequisites...$(NC)"
	@command -v $(HELM) >/dev/null || { echo "$(RED)helm is required$(NC)"; exit 1; }
	@command -v $(KUBECTL) >/dev/null || { echo "$(RED)kubectl is required$(NC)"; exit 1; }
	@$(KUBECTL) version --client=true >/dev/null
	@$(HELM) version >/dev/null
	@$(KUBECTL) cluster-info >/dev/null
	@$(KUBECTL) get ingressclass "$(K8S_INGRESS_CLASS_NAME)" >/dev/null 2>&1 || { \
		echo "$(YELLOW)IngressClass '$(K8S_INGRESS_CLASS_NAME)' was not found. Run 'make k8s-traefik' or 'make k8s' to install Traefik first.$(NC)"; \
		exit 1; \
	}
	@echo "$(GREEN)Kubernetes prerequisites passed$(NC)"

k8s-local-deps: ensure-env docker-auth ## Start local external dependencies used by the Kubernetes web profile
	@echo "$(BLUE)Starting Kubernetes local backing services...$(NC)"
	KAFKA_EXTERNAL_HOST=host.docker.internal $(DOCKER_COMPOSE) up -d postgres mongodb kafka-broker-1 kafka-broker-2 kafka-broker-3 --wait
	@echo "$(GREEN)Kubernetes local backing services are ready$(NC)"

k8s-namespace: k8s-preflight ## Create the Kubernetes namespace if needed
	$(KUBECTL) create namespace $(HELM_NAMESPACE) --dry-run=client -o yaml | $(KUBECTL) apply -f -

k8s-tls-secret: docker-certs k8s-namespace ## Sync the local mkcert certificate into Kubernetes
	$(KUBECTL) -n $(HELM_NAMESPACE) create secret tls $(HELM_TLS_SECRET) --cert=$(LOCAL_TLS_CERT_FILE) --key=$(LOCAL_TLS_KEY_FILE) --dry-run=client -o yaml | $(KUBECTL) apply -f -
	$(KUBECTL) -n $(TRAEFIK_NAMESPACE) create secret tls $(TRAEFIK_GATEWAY_TLS_SECRET) --cert=$(LOCAL_TLS_CERT_FILE) --key=$(LOCAL_TLS_KEY_FILE) --dry-run=client -o yaml | $(KUBECTL) apply -f -

k8s-runtime-secret: ensure-env k8s-namespace ## Sync app runtime secrets from .env into Kubernetes
	@if [ "$$($(KUBECTL) -n $(HELM_NAMESPACE) get secret $(HELM_RUNTIME_SECRET) -o jsonpath='{.metadata.annotations.meta\.helm\.sh/release-name}' 2>/dev/null)" = "$(HELM_RELEASE)" ]; then \
		echo "$(YELLOW)Replacing Helm-managed $(HELM_RUNTIME_SECRET) with an external runtime secret$(NC)"; \
		$(KUBECTL) -n $(HELM_NAMESPACE) delete secret $(HELM_RUNTIME_SECRET); \
	fi
	@K8S_DATABASE_URL="$(K8S_DATABASE_URL)" K8S_MONGO_URL="$(K8S_MONGO_URL)" bun run scripts/k8s-runtime-secret.ts --env-file .env --name $(HELM_RUNTIME_SECRET) --namespace $(HELM_NAMESPACE) | $(KUBECTL) apply -f -

k8s-build-images: ensure-env docker-auth ## Build local web, public catalog, and checkout images for Kubernetes
	@echo "$(BLUE)Building local web, public catalog, and checkout images for Kubernetes...$(NC)"
	DOCKER_PUBLIC_CLIENT_APP_URL=$(K8S_PUBLIC_CLIENT_APP_URL) \
	DOCKER_PUBLIC_ADMIN_APP_URL=$(K8S_PUBLIC_ADMIN_APP_URL) \
	DOCKER_PUBLIC_PRODUCT_SERVICE_URL=$(K8S_PUBLIC_API_URL) \
	DOCKER_PUBLIC_ORDER_SERVICE_URL=$(K8S_PUBLIC_API_URL) \
	DOCKER_PUBLIC_PAYMENT_SERVICE_URL=$(K8S_PUBLIC_API_URL) \
	$(DOCKER_COMPOSE) build product-service order-service payment-service client admin
	@echo "$(GREEN)Local web, public catalog, and checkout images built$(NC)"

k8s-build-full-images: ensure-env docker-auth ## Build all local application images for full Kubernetes deployments
	@echo "$(BLUE)Building all application images for Kubernetes...$(NC)"
	DOCKER_PUBLIC_CLIENT_APP_URL=$(K8S_PUBLIC_CLIENT_APP_URL) \
	DOCKER_PUBLIC_ADMIN_APP_URL=$(K8S_PUBLIC_ADMIN_APP_URL) \
	DOCKER_PUBLIC_PRODUCT_SERVICE_URL=$(K8S_PUBLIC_API_URL) \
	DOCKER_PUBLIC_ORDER_SERVICE_URL=$(K8S_PUBLIC_API_URL) \
	DOCKER_PUBLIC_PAYMENT_SERVICE_URL=$(K8S_PUBLIC_API_URL) \
	$(DOCKER_COMPOSE) build --pull product-service order-service payment-service client admin
	@echo "$(GREEN)Application images built$(NC)"

k8s-load-images: ## Load locally built images into kind or minikube when the current context needs it
	@context="$$( $(KUBECTL) config current-context 2>/dev/null || true )"; \
	case "$$context" in \
		kind-*) \
			command -v kind >/dev/null || { echo "$(YELLOW)kind context '$$context' detected, but kind is not installed; skipping image load.$(NC)"; exit 0; }; \
			cluster="$${context#kind-}"; \
			echo "$(BLUE)Loading images into kind cluster '$$cluster'...$(NC)"; \
			kind load docker-image --name "$$cluster" $(K8S_LOCAL_IMAGES); \
			;; \
		minikube*) \
			command -v minikube >/dev/null || { echo "$(YELLOW)minikube context detected, but minikube is not installed; skipping image load.$(NC)"; exit 0; }; \
			echo "$(BLUE)Loading images into minikube...$(NC)"; \
			for image in $(K8S_LOCAL_IMAGES); do minikube image load "$$image"; done; \
			;; \
		*) \
			echo "$(YELLOW)Using cluster context '$$context'; Docker Desktop and OrbStack can usually see local Docker images directly.$(NC)"; \
			;; \
	esac

k8s-validate: helm-lint ## Render and client-validate Kubernetes manifests without deploying
	@echo "$(BLUE)Rendering Helm manifests to $(HELM_RENDERED_FILE)...$(NC)"
	@$(MAKE) helm-template > $(HELM_RENDERED_FILE)
	$(KUBECTL) apply --namespace $(HELM_NAMESPACE) --dry-run=client --validate=false -f $(HELM_RENDERED_FILE)
	@echo "$(GREEN)Kubernetes manifests validated$(NC)"

k8s-validate-full: ## Render and client-validate full-stack Kubernetes manifests without deploying
	@$(MAKE) k8s-validate HELM_VALUES=$(HELM_FULL_VALUES)

k8s-diff: k8s-validate ## Show server-side differences for the rendered release when helm-diff is installed
	@$(HELM) plugin list | awk '{print $$1}' | grep -qx diff || { echo "$(YELLOW)helm-diff plugin is not installed. Install it with: helm plugin install https://github.com/databus23/helm-diff$(NC)"; exit 1; }
	$(HELM) diff upgrade --install $(HELM_RELEASE) $(HELM_CHART) --namespace $(HELM_NAMESPACE) --values $(HELM_VALUES) $(HELM_SET_ARGS)

k8s-deploy: helm-lint k8s-validate k8s-tls-secret k8s-runtime-secret ## Deploy or upgrade the local web-tier Helm release atomically
	@echo "$(BLUE)Deploying ecommerce to Kubernetes...$(NC)"
	$(HELM) upgrade --install $(HELM_RELEASE) $(HELM_CHART) --namespace $(HELM_NAMESPACE) --create-namespace --values $(HELM_VALUES) $(HELM_SET_ARGS) $(HELM_UPGRADE_ARGS)
	@echo "$(GREEN)Kubernetes deployment submitted$(NC)"

k8s-deploy-full: helm-lint k8s-validate-full k8s-tls-secret k8s-runtime-secret ## Deploy the full app release for clusters with Postgres, MongoDB, and Kafka
	@echo "$(BLUE)Deploying full ecommerce stack to Kubernetes...$(NC)"
	$(HELM) upgrade --install $(HELM_RELEASE) $(HELM_CHART) --namespace $(HELM_NAMESPACE) --create-namespace --values $(HELM_FULL_VALUES) $(HELM_SET_ARGS) $(HELM_UPGRADE_ARGS)
	@echo "$(GREEN)Full Kubernetes deployment submitted$(NC)"

k8s-up: k8s-traefik k8s-local-deps k8s-build-images k8s-load-images k8s-deploy k8s-wait k8s-smoke ## Build images, deploy local web tier with Helm, wait, and smoke-test Traefik
	@echo "$(GREEN)Kubernetes stack is ready$(NC)"

k8s-up-full: k8s-traefik k8s-local-deps k8s-build-full-images k8s-load-images k8s-deploy-full k8s-wait k8s-smoke-full ## Build images, start backing services, deploy the full app, and smoke-test it
	@echo "$(GREEN)Full Kubernetes stack is ready$(NC)"

k8s: k8s-up ## One-command local Kubernetes setup with Docker-backed Postgres, MongoDB, and Kafka
	@echo "$(GREEN)Kubernetes setup complete$(NC)"

ks8: k8s ## One-command Kubernetes setup alias for the common typo
	@echo "$(GREEN)Kubernetes setup complete$(NC)"

kubernetes: k8s ## One-command Kubernetes setup alias
	@echo "$(GREEN)Kubernetes setup complete$(NC)"

k8s-full: k8s-up-full ## One-command full Kubernetes setup with Docker-backed Postgres, MongoDB, and Kafka
	@echo "$(GREEN)Full Kubernetes setup complete$(NC)"

k8s-wait: ## Wait for all ecommerce deployments to finish rolling out
	$(KUBECTL) -n $(HELM_NAMESPACE) rollout status deployment -l app.kubernetes.io/instance=$(HELM_RELEASE) --timeout=$(K8S_ROLLOUT_TIMEOUT)

k8s-smoke: ## Smoke-test local Kubernetes web routes over HTTPS
	@echo "$(BLUE)Smoke-testing Kubernetes ingress...$(NC)"
	@curl -4 -skSf --max-time $(K8S_SMOKE_TIMEOUT) https://shop.localhost/api/health >/dev/null
	@curl -4 -skSf --max-time $(K8S_SMOKE_TIMEOUT) https://admin.localhost/api/health >/dev/null
	@curl -4 -skSf --max-time $(K8S_SMOKE_TIMEOUT) https://shop.localhost/ >/dev/null
	@echo "$(GREEN)Kubernetes smoke tests passed$(NC)"

k8s-smoke-full: k8s-smoke ## Smoke-test full Kubernetes API routes
	@echo "$(BLUE)Smoke-testing Kubernetes API ingress...$(NC)"
	@curl -4 -skSf --max-time $(K8S_SMOKE_TIMEOUT) -H 'content-type: application/json' --data '{"json":{"limit":1}}' https://api.localhost/rpc/product/product/list >/dev/null
	@echo "$(GREEN)Full Kubernetes smoke tests passed$(NC)"

k8s-test: ## Run Helm tests for the deployed ecommerce release
	$(HELM) test $(HELM_RELEASE) --namespace $(HELM_NAMESPACE)

k8s-status: ## Show Kubernetes release and workload status
	$(HELM) status $(HELM_RELEASE) --namespace $(HELM_NAMESPACE)
	$(KUBECTL) get pods,svc,ingress,httproute,jobs --namespace $(HELM_NAMESPACE)
	$(KUBECTL) get events --namespace $(HELM_NAMESPACE) --sort-by=.lastTimestamp | tail -n 20

k8s-events: ## Show recent Kubernetes events for the ecommerce namespace
	$(KUBECTL) get events --namespace $(HELM_NAMESPACE) --sort-by=.lastTimestamp

k8s-logs: ## Stream logs for one Kubernetes service (K8S_SERVICE=client|admin|product-service|order-service|payment-service)
	$(KUBECTL) -n $(HELM_NAMESPACE) logs -f -l app.kubernetes.io/instance=$(HELM_RELEASE),app.kubernetes.io/component=$(K8S_SERVICE) --tail=$(K8S_LOG_TAIL)

k8s-logs-traefik: ## Stream Traefik logs from Kubernetes
	$(KUBECTL) -n $(TRAEFIK_NAMESPACE) logs -f -l app.kubernetes.io/name=traefik --tail=$(K8S_LOG_TAIL)

k8s-logs-client: ## Stream Kubernetes storefront logs
	@$(MAKE) k8s-logs K8S_SERVICE=client

k8s-logs-admin: ## Stream Kubernetes admin logs
	@$(MAKE) k8s-logs K8S_SERVICE=admin

k8s-logs-product: ## Stream Kubernetes product-service logs
	@$(MAKE) k8s-logs K8S_SERVICE=product-service

k8s-logs-order: ## Stream Kubernetes order-service logs
	@$(MAKE) k8s-logs K8S_SERVICE=order-service

k8s-logs-payment: ## Stream Kubernetes payment-service logs
	@$(MAKE) k8s-logs K8S_SERVICE=payment-service

k8s-describe: ## Describe pods for one Kubernetes service (K8S_SERVICE=client|admin|product-service|order-service|payment-service)
	$(KUBECTL) -n $(HELM_NAMESPACE) describe pod -l app.kubernetes.io/instance=$(HELM_RELEASE),app.kubernetes.io/component=$(K8S_SERVICE)

k8s-restart: ## Restart all ecommerce deployments and wait for rollout
	$(KUBECTL) -n $(HELM_NAMESPACE) rollout restart deployment -l app.kubernetes.io/instance=$(HELM_RELEASE)
	$(KUBECTL) -n $(HELM_NAMESPACE) rollout status deployment -l app.kubernetes.io/instance=$(HELM_RELEASE) --timeout=$(K8S_ROLLOUT_TIMEOUT)

k8s-uninstall: ## Uninstall the ecommerce Helm release
	$(HELM) uninstall $(HELM_RELEASE) --namespace $(HELM_NAMESPACE) --wait --timeout $(K8S_ROLLOUT_TIMEOUT)

k8s-clear: ## Stop and remove local Kubernetes resources plus Docker backing services
	@echo "$(RED)Clearing local Kubernetes and Docker resources...$(NC)"
	-$(HELM) uninstall $(HELM_RELEASE) --namespace $(HELM_NAMESPACE) --wait --timeout $(K8S_ROLLOUT_TIMEOUT) --ignore-not-found
	-$(HELM) uninstall traefik --namespace $(TRAEFIK_NAMESPACE) --wait --timeout $(K8S_ROLLOUT_TIMEOUT) --ignore-not-found
	-$(KUBECTL) delete namespace $(HELM_NAMESPACE) --ignore-not-found=true --wait=true
	-$(KUBECTL) delete namespace $(TRAEFIK_NAMESPACE) --ignore-not-found=true --wait=true
	$(DOCKER_COMPOSE) down -v --remove-orphans
	@echo "$(GREEN)Local Kubernetes and Docker resources cleared$(NC)"

clear: k8s-clear ## Alias for k8s-clear

k8s-open: ## Open the local Kubernetes routes in a browser
	@start https://shop.localhost 2>/dev/null || open https://shop.localhost 2>/dev/null || xdg-open https://shop.localhost 2>/dev/null
	@start https://admin.localhost 2>/dev/null || open https://admin.localhost 2>/dev/null || xdg-open https://admin.localhost 2>/dev/null

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
