# E-Commerce Microservices Makefile
# Manage all services, databases, Docker Compose, and Kubernetes/Helm workflows.

SHELL := /bin/bash
.SHELLFLAGS := -o pipefail -c

.PHONY: help runtime-dir ensure-env install dev stop clean clean-all setup setup-base generate-client kafka-ui db-setup db-migrate db-generate db-studio db-seed local-env-file local-db-migrate local-db-seed local-urls local-dev local-fresh-dev lint type-check format audit test boundaries turbo-summary turbo-graph turbo-report turbo-inspect verify build build-client build-admin logs-product logs-order logs-payment status docker-auth docker-certs docker-validate docker-images docker-lock-images docker-build docker-up docker-up-build docker-smoke docker-test docker-down docker-down-volumes docker-logs docker-logs-traefik docker-logs-product docker-logs-order docker-logs-payment docker-logs-client docker-logs-admin docker-logs-stripe docker-ps docker-restart docker-restart-service docker-rebuild-service docker-shell-traefik docker-shell-product docker-shell-order docker-shell-payment docker-infra-only docker-infra-local docker-stripe-up docker-stripe-down docker-clean docker-clean-images docker-prune docker-kill-all docker-setup docker-fresh-start helm-lint helm-lint-supported helm-validate-supported helm-template helm-dry-run helm-package k8s-doctor k8s-gateway-api k8s-traefik k8s-traefik-status k8s-observability k8s-observability-status k8s-grafana k8s-prometheus k8s-preflight k8s-local-deps k8s-namespace k8s-fresh-namespace k8s-reset-local k8s-tls-secret k8s-runtime-secret k8s-build-images k8s-build-full-images k8s-tag-images k8s-load-images k8s-validate k8s-validate-full k8s-diff k8s-deploy k8s-deploy-observed k8s-deploy-full k8s-up k8s-up-observed k8s-up-full k8s-full k8s-wait k8s-smoke k8s-smoke-full k8s-test k8s-status k8s-events k8s-logs k8s-logs-traefik k8s-logs-client k8s-logs-admin k8s-logs-product k8s-logs-order k8s-logs-payment k8s-describe k8s-restart k8s-uninstall k8s-clear k8s-delete-namespaces k8s ks8 kubernetes clear quick-start quick-stop restart docker-quick-start
.PHONY: k8s-payment-doctor k8s-logs-stripe

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
RUNTIME_DIR ?= $(CURDIR)/.runtime
LOCAL_ENV_FILE := $(RUNTIME_DIR)/local-dev.env
DOCKER_COMPOSE ?= docker compose
DOCKER_WAIT_TIMEOUT ?= 180
TRAEFIK_HTTP_PORT ?= 8080
TRAEFIK_HTTPS_PORT ?= 8443
K8S_LOCAL_HTTPS_PORT ?= 9443
K8S_SMOKE_MAX_ATTEMPTS ?= 30
HELM ?= helm
KUBECTL ?= kubectl
HELM_VERSION ?= 4.2.3
K8S_TARGET_VERSION ?= 1.36.2
K8S_SUPPORTED_VERSIONS ?= 1.34.9 1.35.6 1.36.2
K8S_POD_SECURITY_LEVEL ?= restricted
K8S_POD_SECURITY_VERSION ?= v1.34
KUBECONFORM_IMAGE ?= ghcr.io/yannh/kubeconform:v0.8.0@sha256:faffaf43f95aa6425306e1ab8d6fcad72acb9049158f38e574c085ea1ec0f64e
GATEWAY_API_VERSION ?= 1.5.1
GATEWAY_API_MANIFEST_SHA256 ?= 751002b3b91a87f7ae3bd2517c79a47a8d7ed6702901808a1cf9bd97d284f9b8
TRAEFIK_CHART_VERSION ?= 41.2.0
TRAEFIK_IMAGE_VERSION ?= v3.7.10
TRAEFIK_IMAGE_DIGEST ?= sha256:9c3b91d5fb7770853ca5c1124a23c34bf2d9b47ffaebeab2614cbaf410dcb2ac
OBS_CHART_VERSION ?= 88.2.0
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
HELM_SET_ARGS ?= --set secrets.name=$(HELM_RUNTIME_SECRET) --set ingress.tls.secretName=$(HELM_TLS_SECRET) $(K8S_ROUTE_SET_ARGS) $(K8S_IMAGE_SET_ARGS)
OBS_NAMESPACE ?= monitoring
OBS_RELEASE ?= kube-prometheus-stack
TRAEFIK_VALUES ?= charts/platform/traefik.values.yaml
OBS_VALUES ?= charts/platform/kube-prometheus-stack.values.yaml
K8S_OBSERVABILITY_SET_ARGS ?= --set observability.serviceMonitor.enabled=true --set observability.serviceMonitor.labels.release=$(OBS_RELEASE) --set observability.traefik.serviceMonitor.enabled=true --set observability.traefik.serviceMonitor.labels.release=$(OBS_RELEASE) --set observability.prometheusRule.enabled=true --set observability.prometheusRule.labels.release=$(OBS_RELEASE) --set observability.grafanaDashboard.enabled=true
GRAFANA_PORT ?= 3000
PROMETHEUS_PORT ?= 9090
HELM_RENDERED_FILE ?= $(RUNTIME_DIR)/$(HELM_RELEASE)-rendered.yaml
HELM_PACKAGE_DIR ?= $(RUNTIME_DIR)/helm-packages
K8S_DATABASE_URL ?= postgresql://postgres:postgres@host.docker.internal:5432/product_db?schema=public
K8S_MONGO_URL ?= mongodb://host.docker.internal:27017/order_db
# These values are compiled into browser bundles. Keep them aligned with the
# local Traefik port-forward instead of assuming the host's privileged 443.
K8S_PUBLIC_CLIENT_APP_URL ?= https://shop.localhost:$(K8S_LOCAL_HTTPS_PORT)
K8S_PUBLIC_ADMIN_APP_URL ?= https://admin.localhost:$(K8S_LOCAL_HTTPS_PORT)
K8S_PUBLIC_API_URL ?= https://api.localhost:$(K8S_LOCAL_HTTPS_PORT)
K8S_IMAGE_STOREFRONT_ORIGIN ?= http://$(HELM_RELEASE)-client.$(HELM_NAMESPACE).svc.cluster.local:3002
K8S_INGRESS_CLASS_NAME ?= traefik
K8S_ROLLOUT_TIMEOUT ?= 5m
K8S_LOG_TAIL ?= 200
K8S_SMOKE_TIMEOUT ?= 10
K8S_SERVICE ?= client
K8S_CONTAINER ?=
K8S_CONTAINER_ARGS = $(if $(K8S_CONTAINER),-c $(K8S_CONTAINER),--all-containers=true)
ifndef K8S_IMAGE_TAG
K8S_IMAGE_TAG := dev-$(shell date -u +%Y%m%d%H%M%S)
endif
export K8S_IMAGE_TAG
K8S_IMAGE_SET_ARGS ?= --set-string services.product.image.tag=$(K8S_IMAGE_TAG) --set-string services.order.image.tag=$(K8S_IMAGE_TAG) --set-string services.payment.image.tag=$(K8S_IMAGE_TAG) --set-string services.client.image.tag=$(K8S_IMAGE_TAG) --set-string services.admin.image.tag=$(K8S_IMAGE_TAG)
K8S_LOCAL_IMAGES ?= turborepo-monorepo-product-service:$(K8S_IMAGE_TAG) turborepo-monorepo-order-service:$(K8S_IMAGE_TAG) turborepo-monorepo-payment-service:$(K8S_IMAGE_TAG) turborepo-monorepo-client:$(K8S_IMAGE_TAG) turborepo-monorepo-admin:$(K8S_IMAGE_TAG)
HELM_UPGRADE_ARGS ?= --rollback-on-failure --wait --timeout $(K8S_ROLLOUT_TIMEOUT)
DHI_CHECK_IMAGES ?= dhi.io/bun:1.3.14-debian13@sha256:fb5dda72d73bd1e581d014e6546352766f8565bb78ce66a290e4f11fdc188c11 dhi.io/postgres:18.4-debian13@sha256:a807e832c1fc9ded731956abcb53dc98ed003fd82e27275eaef8dcf52fb90236 dhi.io/kafka:4.3.1-debian13-native@sha256:89691f2d47ded5c88186e0e61a68b2fe77e2a19dea29ad2669e5626aff7965ff
DHI_AMD64_CHECK_IMAGES ?= dhi.io/mongodb:8.3.7-debian13@sha256:c868540fe59312058c7f4d340766f286416cb5932d93d20e02fb5e033a261220
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

runtime-dir:
	@umask 077; mkdir -p "$(RUNTIME_DIR)"; chmod 0700 "$(RUNTIME_DIR)"

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

setup-base: ## Prepare the env, install dependencies, and generate Prisma in deterministic order
	@$(MAKE) ensure-env
	@$(MAKE) install
	@$(MAKE) generate-client

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

local-env-file: ensure-env runtime-dir ## Create a private merged env file for local apps with Docker-backed infra on localhost
	@umask 077; install -m 0600 .env "$(LOCAL_ENV_FILE)"
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
		"$(LOCAL_PAYMENT_SERVICE_URL)" >> "$(LOCAL_ENV_FILE)"
	@chmod 0600 "$(LOCAL_ENV_FILE)"
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

boundaries: ## Run Turborepo package boundary checks
	@echo "$(BLUE)Checking package boundaries...$(NC)"
	bun run boundaries
	@echo "$(GREEN)Package boundaries are valid$(NC)"

turbo-summary: ## Generate a Turborepo run summary for typecheck and build tasks
	@echo "$(BLUE)Generating Turborepo run summary...$(NC)"
	bun run turbo:summary
	@echo "$(GREEN)Turborepo run summary generated$(NC)"

turbo-graph: ## Generate the Turborepo task graph in docs/task-graph.mermaid
	@echo "$(BLUE)Generating Turborepo task graph...$(NC)"
	bun run turbo:graph
	@echo "$(GREEN)Turborepo task graph generated$(NC)"

turbo-report: ## Render the latest Turborepo run summary into docs/turbo-report.md
	@echo "$(BLUE)Rendering Turborepo run report...$(NC)"
	bun run turbo:report
	@echo "$(GREEN)Turborepo run report rendered$(NC)"

turbo-inspect: ## Generate Turbo summary, task graph, and human-readable report
	@echo "$(BLUE)Inspecting Turborepo task performance...$(NC)"
	bun run turbo:inspect
	@echo "$(GREEN)Turborepo inspection artifacts generated$(NC)"

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
	@./scripts/clean-workspace.sh
	@echo "$(GREEN)Cleanup complete$(NC)"

clean-all: ## Clean workspace artifacts and project-owned Docker resources
	@$(MAKE) clean
	@$(MAKE) docker-clean
	@echo "$(GREEN)Full cleanup complete$(NC)"

stop: ## Stop all running services
	@echo "$(BLUE)Stopping project-owned background services...$(NC)"
	@bunx turbo daemon stop 2>/dev/null || true
	@$(DOCKER_COMPOSE) down --remove-orphans 2>/dev/null || true
	@echo "$(GREEN)Project background services stopped. Stop foreground dev commands with Ctrl-C.$(NC)"

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

##@ Kubernetes / Helm

helm-lint: ## Lint the ecommerce Helm chart
	@echo "$(BLUE)Linting Helm chart...$(NC)"
	$(HELM) lint $(HELM_CHART) --kube-version $(K8S_TARGET_VERSION)
	@echo "$(GREEN)Helm chart lint passed$(NC)"

helm-lint-supported: ## Lint all chart profiles against every supported Kubernetes minor
	@for kubernetes_version in $(K8S_SUPPORTED_VERSIONS); do \
		echo "$(BLUE)Linting for Kubernetes $$kubernetes_version...$(NC)"; \
		$(HELM) lint $(HELM_CHART) --kube-version "$$kubernetes_version" || exit 1; \
		$(HELM) lint $(HELM_CHART) --values $(HELM_CHART)/values.local.yaml --kube-version "$$kubernetes_version" || exit 1; \
		$(HELM) lint $(HELM_CHART) --values $(HELM_CHART)/values.web-local.yaml --kube-version "$$kubernetes_version" || exit 1; \
	done
	@echo "$(GREEN)Helm chart supports Kubernetes $(K8S_SUPPORTED_VERSIONS)$(NC)"

helm-validate-supported: helm-lint-supported ## Strictly validate every chart profile against supported Kubernetes schemas
	@for kubernetes_version in $(K8S_SUPPORTED_VERSIONS); do \
		for profile in default local web-local; do \
			echo "$(BLUE)Validating $$profile profile for Kubernetes $$kubernetes_version...$(NC)"; \
			case "$$profile" in \
				default) profile_args="--set gateway.enabled=true --set ingress.enabled=false" ;; \
				local) profile_args="--values $(HELM_CHART)/values.local.yaml" ;; \
				web-local) profile_args="--values $(HELM_CHART)/values.web-local.yaml" ;; \
			esac; \
			$(HELM) template $(HELM_RELEASE) $(HELM_CHART) --namespace $(HELM_NAMESPACE) --kube-version "$$kubernetes_version" $$profile_args \
				| docker run --rm -i $(KUBECONFORM_IMAGE) -strict -summary -ignore-missing-schemas -kubernetes-version "$$kubernetes_version" - || exit 1; \
		done; \
	done
	@echo "$(GREEN)All Helm profiles passed kubeconform validation$(NC)"

helm-template: ## Render the ecommerce Helm chart locally
	@$(HELM) template $(HELM_RELEASE) $(HELM_CHART) --namespace $(HELM_NAMESPACE) --kube-version $(K8S_TARGET_VERSION) --values $(HELM_VALUES) $(HELM_SET_ARGS)

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
	@echo "  expected Helm: $(HELM_VERSION)"
	@echo "  chart Kubernetes support: $(K8S_SUPPORTED_VERSIONS)"
	@printf "  context: "; $(KUBECTL) config current-context 2>/dev/null || echo "$(RED)unavailable$(NC)"
	@printf "  cluster: "; $(KUBECTL) cluster-info >/dev/null 2>&1 && echo "$(GREEN)reachable$(NC)" || echo "$(RED)unreachable$(NC)"
	@echo ""
	@$(KUBECTL) get ingressclass "$(K8S_INGRESS_CLASS_NAME)" 2>/dev/null || echo "$(YELLOW)IngressClass '$(K8S_INGRESS_CLASS_NAME)' not found. Run 'make k8s-traefik'.$(NC)"
	@$(KUBECTL) -n $(TRAEFIK_NAMESPACE) get pods,svc 2>/dev/null || true
	@$(KUBECTL) -n $(HELM_NAMESPACE) get pods,svc,ingress,httproute 2>/dev/null || true

k8s-payment-doctor: k8s-doctor ## Diagnose payment/order readiness without printing credentials
	@echo ""
	@echo "$(BLUE)Runtime secret keys (base64 lengths only)$(NC)"
	@$(KUBECTL) -n $(HELM_NAMESPACE) get secret $(HELM_RUNTIME_SECRET) -o go-template='{{range $$key, $$value := .data}}{{printf "%s=%d base64-bytes\n" $$key (len $$value)}}{{end}}' 2>/dev/null | sort || echo "$(RED)Runtime secret unavailable$(NC)"
	@echo ""
	@echo "$(BLUE)Previous payment logs$(NC)"
	@$(KUBECTL) -n $(HELM_NAMESPACE) logs -l app.kubernetes.io/instance=$(HELM_RELEASE),app.kubernetes.io/component=payment-service --all-containers=true --previous --tail=$(K8S_LOG_TAIL) 2>/dev/null || echo "$(YELLOW)No previous payment container logs.$(NC)"
	@echo ""
	@echo "$(BLUE)Current payment logs$(NC)"
	@$(KUBECTL) -n $(HELM_NAMESPACE) logs -l app.kubernetes.io/instance=$(HELM_RELEASE),app.kubernetes.io/component=payment-service --all-containers=true --tail=$(K8S_LOG_TAIL) 2>/dev/null || true
	@echo ""
	@echo "$(BLUE)Previous order logs$(NC)"
	@$(KUBECTL) -n $(HELM_NAMESPACE) logs -l app.kubernetes.io/instance=$(HELM_RELEASE),app.kubernetes.io/component=order-service --all-containers=true --previous --tail=$(K8S_LOG_TAIL) 2>/dev/null || echo "$(YELLOW)No previous order container logs.$(NC)"

k8s-gateway-api: runtime-dir ## Install the checksum-verified Gateway API standard CRDs
	@echo "$(BLUE)Installing Gateway API $(GATEWAY_API_VERSION) standard CRDs...$(NC)"
	@umask 077; curl -fsSL "https://github.com/kubernetes-sigs/gateway-api/releases/download/v$(GATEWAY_API_VERSION)/standard-install.yaml" -o "$(RUNTIME_DIR)/gateway-api-$(GATEWAY_API_VERSION).yaml"
	@printf '%s  %s\n' "$(GATEWAY_API_MANIFEST_SHA256)" "$(RUNTIME_DIR)/gateway-api-$(GATEWAY_API_VERSION).yaml" | shasum -a 256 -c -
	@$(KUBECTL) apply --server-side -f "$(RUNTIME_DIR)/gateway-api-$(GATEWAY_API_VERSION).yaml"
	@echo "$(GREEN)Gateway API $(GATEWAY_API_VERSION) CRDs are installed$(NC)"

k8s-traefik: ## Install or upgrade the pinned Traefik ingress chart
	@echo "$(BLUE)Installing Traefik ingress...$(NC)"
	@command -v $(HELM) >/dev/null || { echo "$(RED)helm is required$(NC)"; exit 1; }
	@command -v $(KUBECTL) >/dev/null || { echo "$(RED)kubectl is required$(NC)"; exit 1; }
	@$(KUBECTL) cluster-info >/dev/null
	@echo "$(BLUE)Applying Traefik $(TRAEFIK_CHART_VERSION) CRDs before the controller upgrade...$(NC)"
	$(HELM) show crds traefik \
		--repo https://traefik.github.io/charts \
		--version $(TRAEFIK_CHART_VERSION) | \
		$(KUBECTL) apply --server-side --force-conflicts -f -
	$(HELM) upgrade --install traefik traefik \
		--repo https://traefik.github.io/charts \
		--version $(TRAEFIK_CHART_VERSION) \
		--set image.registry=docker.io \
		--set image.repository=traefik \
		--set image.tag=$(TRAEFIK_IMAGE_VERSION) \
		--set image.digest=$(TRAEFIK_IMAGE_DIGEST) \
		--set versionOverride=$(TRAEFIK_IMAGE_VERSION) \
		--values $(TRAEFIK_VALUES) \
		--namespace $(TRAEFIK_NAMESPACE) \
		--create-namespace \
		--skip-crds \
		--set ingressClass.name=$(K8S_INGRESS_CLASS_NAME) \
		--wait \
		--timeout $(K8S_ROLLOUT_TIMEOUT)
	@echo "$(GREEN)Traefik ingress is ready$(NC)"

k8s-traefik-status: ## Show Traefik resources in Kubernetes
	$(KUBECTL) -n $(TRAEFIK_NAMESPACE) get pods,svc
	$(KUBECTL) get ingressclass $(K8S_INGRESS_CLASS_NAME)

k8s-observability: ## Install or upgrade Prometheus Operator, Prometheus, Alertmanager, and Grafana
	@echo "$(BLUE)Installing kube-prometheus-stack...$(NC)"
	@command -v $(HELM) >/dev/null || { echo "$(RED)helm is required$(NC)"; exit 1; }
	@command -v $(KUBECTL) >/dev/null || { echo "$(RED)kubectl is required$(NC)"; exit 1; }
	@$(KUBECTL) cluster-info >/dev/null
	@echo "$(BLUE)Applying kube-prometheus-stack $(OBS_CHART_VERSION) CRDs before the controller upgrade...$(NC)"
	$(HELM) show crds kube-prometheus-stack \
		--repo https://prometheus-community.github.io/helm-charts \
		--version $(OBS_CHART_VERSION) | \
		$(KUBECTL) apply --server-side --force-conflicts -f -
	$(HELM) upgrade --install $(OBS_RELEASE) kube-prometheus-stack \
		--repo https://prometheus-community.github.io/helm-charts \
		--version $(OBS_CHART_VERSION) \
		--namespace $(OBS_NAMESPACE) \
		--create-namespace \
		--skip-crds \
		--values $(OBS_VALUES) \
		--wait \
		--timeout 10m
	@echo "$(GREEN)Observability stack is ready$(NC)"

k8s-observability-status: ## Show Prometheus, Grafana, ServiceMonitor, and rule resources
	$(KUBECTL) -n $(OBS_NAMESPACE) get pods,svc
	-$(KUBECTL) -n $(HELM_NAMESPACE) get servicemonitor,prometheusrule
	-$(KUBECTL) -n $(HELM_NAMESPACE) get configmap -l grafana_dashboard=1
	-$(KUBECTL) get servicemonitor --all-namespaces 2>/dev/null | grep -E '$(HELM_RELEASE)|traefik' || true

k8s-grafana: ## Port-forward Grafana locally at the configured Grafana port
	$(KUBECTL) -n $(OBS_NAMESPACE) port-forward svc/$(OBS_RELEASE)-grafana $(GRAFANA_PORT):80

k8s-prometheus: ## Port-forward Prometheus locally at the configured Prometheus port
	$(KUBECTL) -n $(OBS_NAMESPACE) port-forward svc/$(OBS_RELEASE)-prometheus $(PROMETHEUS_PORT):9090

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
	$(DOCKER_COMPOSE) up -d postgres mongodb kafka-broker-1 kafka-broker-2 kafka-broker-3 --wait
	@echo "$(GREEN)Kubernetes local backing services are ready$(NC)"

k8s-namespace: k8s-preflight ## Create the Kubernetes namespace if needed
	$(KUBECTL) create namespace $(HELM_NAMESPACE) --dry-run=client -o yaml | $(KUBECTL) apply -f -
	$(KUBECTL) label namespace $(HELM_NAMESPACE) --overwrite \
		pod-security.kubernetes.io/enforce=$(K8S_POD_SECURITY_LEVEL) \
		pod-security.kubernetes.io/enforce-version=$(K8S_POD_SECURITY_VERSION) \
		pod-security.kubernetes.io/audit=$(K8S_POD_SECURITY_LEVEL) \
		pod-security.kubernetes.io/audit-version=$(K8S_POD_SECURITY_VERSION) \
		pod-security.kubernetes.io/warn=$(K8S_POD_SECURITY_LEVEL) \
		pod-security.kubernetes.io/warn-version=$(K8S_POD_SECURITY_VERSION)

k8s-fresh-namespace: k8s-preflight ## Delete and recreate the application namespace (requires explicit confirmation)
	@test "$(CONFIRM)" = "k8s-reset-local" || { echo "$(RED)Namespace deletion requires CONFIRM=k8s-reset-local.$(NC)"; exit 2; }
	@echo "$(BLUE)Resetting Kubernetes namespace $(HELM_NAMESPACE)...$(NC)"
	-$(KUBECTL) delete namespace $(HELM_NAMESPACE) --ignore-not-found=true --wait=true
	$(KUBECTL) create namespace $(HELM_NAMESPACE) --dry-run=client -o yaml | $(KUBECTL) apply -f -
	$(KUBECTL) label namespace $(HELM_NAMESPACE) --overwrite \
		pod-security.kubernetes.io/enforce=$(K8S_POD_SECURITY_LEVEL) \
		pod-security.kubernetes.io/enforce-version=$(K8S_POD_SECURITY_VERSION) \
		pod-security.kubernetes.io/audit=$(K8S_POD_SECURITY_LEVEL) \
		pod-security.kubernetes.io/audit-version=$(K8S_POD_SECURITY_VERSION) \
		pod-security.kubernetes.io/warn=$(K8S_POD_SECURITY_LEVEL) \
		pod-security.kubernetes.io/warn-version=$(K8S_POD_SECURITY_VERSION)
	@echo "$(GREEN)Kubernetes namespace $(HELM_NAMESPACE) is fresh$(NC)"

k8s-reset-local: ## Explicitly reset only the ecommerce namespace
	@$(MAKE) k8s-fresh-namespace CONFIRM=k8s-reset-local

k8s-tls-secret: docker-certs k8s-namespace ## Sync the local mkcert certificate into Kubernetes
	$(KUBECTL) -n $(HELM_NAMESPACE) create secret tls $(HELM_TLS_SECRET) --cert=$(LOCAL_TLS_CERT_FILE) --key=$(LOCAL_TLS_KEY_FILE) --dry-run=client -o yaml | $(KUBECTL) apply -f -
	$(KUBECTL) -n $(TRAEFIK_NAMESPACE) create secret tls $(TRAEFIK_GATEWAY_TLS_SECRET) --cert=$(LOCAL_TLS_CERT_FILE) --key=$(LOCAL_TLS_KEY_FILE) --dry-run=client -o yaml | $(KUBECTL) apply -f -

k8s-runtime-secret: ensure-env k8s-namespace ## Sync app runtime secrets from .env into Kubernetes
	@if [ "$$($(KUBECTL) -n $(HELM_NAMESPACE) get secret $(HELM_RUNTIME_SECRET) -o jsonpath='{.metadata.annotations.meta\.helm\.sh/release-name}' 2>/dev/null)" = "$(HELM_RELEASE)" ]; then \
		echo "$(YELLOW)Replacing Helm-managed $(HELM_RUNTIME_SECRET) with an external runtime secret$(NC)"; \
		$(KUBECTL) -n $(HELM_NAMESPACE) delete secret $(HELM_RUNTIME_SECRET); \
	fi
	@K8S_DATABASE_URL="$(K8S_DATABASE_URL)" K8S_MONGO_URL="$(K8S_MONGO_URL)" bun run scripts/k8s-runtime-secret.ts --require-commerce --env-file .env --name $(HELM_RUNTIME_SECRET) --namespace $(HELM_NAMESPACE) | $(KUBECTL) apply -f -

k8s-build-images: ensure-env docker-auth ## Build local web, public catalog, and checkout images for Kubernetes
	@echo "$(BLUE)Building local web, public catalog, and checkout images for Kubernetes...$(NC)"
	DOCKER_PUBLIC_CLIENT_APP_URL=$(K8S_PUBLIC_CLIENT_APP_URL) \
	DOCKER_PUBLIC_ADMIN_APP_URL=$(K8S_PUBLIC_ADMIN_APP_URL) \
	DOCKER_IMAGE_STOREFRONT_ORIGIN=$(K8S_IMAGE_STOREFRONT_ORIGIN) \
	DOCKER_PUBLIC_PRODUCT_SERVICE_URL=$(K8S_PUBLIC_API_URL) \
	DOCKER_PUBLIC_ORDER_SERVICE_URL=$(K8S_PUBLIC_API_URL) \
	DOCKER_PUBLIC_PAYMENT_SERVICE_URL=$(K8S_PUBLIC_API_URL) \
	$(DOCKER_COMPOSE) build product-service order-service payment-service client admin
	@echo "$(GREEN)Local web, public catalog, and checkout images built$(NC)"

k8s-build-full-images: ensure-env docker-auth ## Build all local application images for full Kubernetes deployments
	@echo "$(BLUE)Building all application images for Kubernetes...$(NC)"
	DOCKER_PUBLIC_CLIENT_APP_URL=$(K8S_PUBLIC_CLIENT_APP_URL) \
	DOCKER_PUBLIC_ADMIN_APP_URL=$(K8S_PUBLIC_ADMIN_APP_URL) \
	DOCKER_IMAGE_STOREFRONT_ORIGIN=$(K8S_IMAGE_STOREFRONT_ORIGIN) \
	DOCKER_PUBLIC_PRODUCT_SERVICE_URL=$(K8S_PUBLIC_API_URL) \
	DOCKER_PUBLIC_ORDER_SERVICE_URL=$(K8S_PUBLIC_API_URL) \
	DOCKER_PUBLIC_PAYMENT_SERVICE_URL=$(K8S_PUBLIC_API_URL) \
	$(DOCKER_COMPOSE) build --pull product-service order-service payment-service client admin
	@echo "$(GREEN)Application images built$(NC)"

k8s-tag-images: ## Tag freshly built Compose images with the immutable Kubernetes deployment tag
	@echo "$(BLUE)Tagging Kubernetes images with $(K8S_IMAGE_TAG)...$(NC)"
	@for service in product-service order-service payment-service client admin; do \
		docker image inspect "turborepo-monorepo-$$service:latest" >/dev/null || { echo "$(RED)Missing turborepo-monorepo-$$service:latest; run a Kubernetes image build first.$(NC)"; exit 1; }; \
		docker tag "turborepo-monorepo-$$service:latest" "turborepo-monorepo-$$service:$(K8S_IMAGE_TAG)"; \
	done
	@echo "$(GREEN)Kubernetes images tagged with $(K8S_IMAGE_TAG)$(NC)"

k8s-load-images: ## Load locally built images into kind or minikube when the current context needs it
	@context="$$( $(KUBECTL) config current-context 2>/dev/null || true )"; \
	case "$$context" in \
		kind-*) \
			command -v kind >/dev/null || { echo "$(RED)kind context '$$context' detected, but kind is not installed.$(NC)"; exit 1; }; \
			cluster="$${context#kind-}"; \
			echo "$(BLUE)Loading images into kind cluster '$$cluster'...$(NC)"; \
			kind load docker-image --name "$$cluster" $(K8S_LOCAL_IMAGES); \
			;; \
		minikube*) \
			command -v minikube >/dev/null || { echo "$(RED)minikube context detected, but minikube is not installed.$(NC)"; exit 1; }; \
			echo "$(BLUE)Loading images into minikube...$(NC)"; \
			for image in $(K8S_LOCAL_IMAGES); do minikube image load "$$image"; done; \
			;; \
		*) \
			echo "$(YELLOW)Using cluster context '$$context'; Docker Desktop and OrbStack can usually see local Docker images directly.$(NC)"; \
			;; \
	esac

k8s-validate: helm-lint runtime-dir ## Render and schema-validate Kubernetes manifests without deploying
	@echo "$(BLUE)Rendering Helm manifests to $(HELM_RENDERED_FILE)...$(NC)"
	@umask 077; $(MAKE) helm-template > "$(HELM_RENDERED_FILE)"; chmod 0600 "$(HELM_RENDERED_FILE)"
	docker run --rm -i $(KUBECONFORM_IMAGE) -strict -summary -ignore-missing-schemas -kubernetes-version $(K8S_TARGET_VERSION) < "$(HELM_RENDERED_FILE)"
	@echo "$(GREEN)Kubernetes manifests validated$(NC)"

k8s-validate-full: ## Render and schema-validate full-stack Kubernetes manifests without deploying
	@$(MAKE) k8s-validate HELM_VALUES=$(HELM_FULL_VALUES)

k8s-diff: k8s-validate ## Show server-side differences for the rendered release when helm-diff is installed
	@$(HELM) plugin list | awk '{print $$1}' | grep -qx diff || { echo "$(YELLOW)helm-diff plugin is not installed. Install it with: helm plugin install https://github.com/databus23/helm-diff$(NC)"; exit 1; }
	$(HELM) diff upgrade --install $(HELM_RELEASE) $(HELM_CHART) --namespace $(HELM_NAMESPACE) --values $(HELM_VALUES) $(HELM_SET_ARGS)

k8s-deploy: ## Validate and deploy the local web tier in place
	@$(MAKE) helm-lint
	@$(MAKE) k8s-validate
	@$(MAKE) k8s-tls-secret
	@$(MAKE) k8s-runtime-secret
	@echo "$(BLUE)Deploying ecommerce to Kubernetes...$(NC)"
	$(HELM) upgrade --install $(HELM_RELEASE) $(HELM_CHART) --namespace $(HELM_NAMESPACE) --create-namespace --values $(HELM_VALUES) $(HELM_SET_ARGS) $(HELM_UPGRADE_ARGS)
	@echo "$(GREEN)Kubernetes deployment submitted$(NC)"

k8s-deploy-observed: ## Deploy the local web tier with ServiceMonitors, PrometheusRule, and Grafana dashboard enabled
	@$(MAKE) k8s-deploy HELM_SET_ARGS='$(HELM_SET_ARGS) $(K8S_OBSERVABILITY_SET_ARGS)'

k8s-deploy-full: ## Validate and deploy the full app release in place
	@$(MAKE) helm-lint
	@$(MAKE) k8s-validate-full
	@$(MAKE) k8s-tls-secret
	@$(MAKE) k8s-runtime-secret
	@echo "$(BLUE)Deploying full ecommerce stack to Kubernetes...$(NC)"
	$(HELM) upgrade --install $(HELM_RELEASE) $(HELM_CHART) --namespace $(HELM_NAMESPACE) --create-namespace --values $(HELM_FULL_VALUES) $(HELM_SET_ARGS) $(HELM_UPGRADE_ARGS)
	@echo "$(GREEN)Full Kubernetes deployment submitted$(NC)"

k8s-up: ## Prepare data, build images, deploy the local web tier, and smoke-test Traefik in order
	@$(MAKE) k8s-traefik
	@$(MAKE) k8s-local-deps
	@$(MAKE) k8s-build-images
	@$(MAKE) k8s-tag-images
	@$(MAKE) k8s-load-images
	@$(MAKE) k8s-deploy
	@$(MAKE) k8s-wait
	@$(MAKE) k8s-smoke
	@echo "$(GREEN)Kubernetes stack is ready$(NC)"

k8s-up-observed: ## Prepare data, build, and deploy observed local Kubernetes in order
	@$(MAKE) k8s-observability
	@$(MAKE) k8s-traefik
	@$(MAKE) k8s-local-deps
	@$(MAKE) k8s-build-images
	@$(MAKE) k8s-tag-images
	@$(MAKE) k8s-load-images
	@$(MAKE) k8s-deploy-observed
	@$(MAKE) k8s-wait
	@$(MAKE) k8s-smoke
	@echo "$(GREEN)Observed Kubernetes stack is ready$(NC)"

k8s-up-full: ## Prepare data, build images, deploy the full app, and smoke-test it in order
	@$(MAKE) k8s-traefik
	@$(MAKE) k8s-local-deps
	@$(MAKE) k8s-build-full-images
	@$(MAKE) k8s-tag-images
	@$(MAKE) k8s-load-images
	@$(MAKE) k8s-deploy-full
	@$(MAKE) k8s-wait
	@$(MAKE) k8s-smoke-full
	@echo "$(GREEN)Full Kubernetes stack is ready$(NC)"

k8s: k8s-up-observed runtime-dir ## One-command local Kubernetes setup with Prometheus, Grafana, and Docker-backed Postgres, MongoDB, and Kafka
	@echo "$(BLUE)Starting local forwards for the Kubernetes stack...$(NC)"
	@forward() ( \
		log_file="$$1"; shift; \
		trap 'test -n "$$child_pid" && kill "$$child_pid" 2>/dev/null || true; exit 0' EXIT INT TERM; \
		while true; do \
			"$$@" >>"$$log_file" 2>&1 & child_pid=$$!; \
			wait "$$child_pid" || true; \
			sleep 1; \
		done \
	); \
		traefik_log="$(RUNTIME_DIR)/$(HELM_RELEASE)-traefik-port-forward.log"; \
		grafana_log="$(RUNTIME_DIR)/$(OBS_RELEASE)-grafana-port-forward.log"; \
		prometheus_log="$(RUNTIME_DIR)/$(OBS_RELEASE)-prometheus-port-forward.log"; \
		: >"$$traefik_log"; : >"$$grafana_log"; : >"$$prometheus_log"; \
		forward "$$traefik_log" $(KUBECTL) -n $(TRAEFIK_NAMESPACE) port-forward svc/traefik $(K8S_LOCAL_HTTPS_PORT):443 & traefik_pid=$$!; \
		forward "$$grafana_log" $(KUBECTL) -n $(OBS_NAMESPACE) port-forward svc/$(OBS_RELEASE)-grafana $(GRAFANA_PORT):80 & grafana_pid=$$!; \
		forward "$$prometheus_log" $(KUBECTL) -n $(OBS_NAMESPACE) port-forward svc/$(OBS_RELEASE)-prometheus $(PROMETHEUS_PORT):9090 & prometheus_pid=$$!; \
		trap 'kill "$$traefik_pid" "$$grafana_pid" "$$prometheus_pid" 2>/dev/null || true; wait "$$traefik_pid" "$$grafana_pid" "$$prometheus_pid" 2>/dev/null || true' EXIT INT TERM; \
		printf "$(GREEN)Local forwards active. Press Ctrl-C to stop them.$(NC)\\n"; \
		printf "  Storefront:  https://shop.localhost:$(K8S_LOCAL_HTTPS_PORT)\\n"; \
		printf "  Admin:       https://admin.localhost:$(K8S_LOCAL_HTTPS_PORT)\\n"; \
		printf "  Grafana:     http://localhost:$(GRAFANA_PORT)\\n"; \
		printf "  Prometheus:  http://localhost:$(PROMETHEUS_PORT)\\n"; \
		wait

ks8: k8s ## One-command Kubernetes setup alias for the common typo
	@echo "$(GREEN)Kubernetes setup complete$(NC)"

kubernetes: k8s ## One-command Kubernetes setup alias
	@echo "$(GREEN)Kubernetes setup complete$(NC)"

k8s-full: k8s-up-full ## One-command full Kubernetes setup with Docker-backed Postgres, MongoDB, and Kafka
	@echo "$(GREEN)Full Kubernetes setup complete$(NC)"

k8s-wait: ## Wait for all ecommerce deployments to finish rolling out
	$(KUBECTL) -n $(HELM_NAMESPACE) rollout status deployment -l app.kubernetes.io/instance=$(HELM_RELEASE) --timeout=$(K8S_ROLLOUT_TIMEOUT)

k8s-smoke: runtime-dir ## Smoke-test local Kubernetes web routes over HTTPS
	@echo "$(BLUE)Smoke-testing Kubernetes ingress through a temporary Traefik port-forward...$(NC)"
	@smoke_port="$(K8S_LOCAL_HTTPS_PORT)"; \
		port_forward_log="$(RUNTIME_DIR)/$(HELM_RELEASE)-smoke-port-forward.log"; \
		$(KUBECTL) -n $(TRAEFIK_NAMESPACE) port-forward svc/traefik "$$smoke_port:443" >"$$port_forward_log" 2>&1 & traefik_pid=$$!; \
		cleanup() { kill "$$traefik_pid" 2>/dev/null || true; wait "$$traefik_pid" 2>/dev/null || true; }; \
		trap cleanup EXIT INT TERM; \
		resolve_args="--resolve shop.localhost:$$smoke_port:127.0.0.1 --resolve admin.localhost:$$smoke_port:127.0.0.1 --resolve api.localhost:$$smoke_port:127.0.0.1"; \
		for attempt in $$(seq 1 $(K8S_SMOKE_MAX_ATTEMPTS)); do \
			if curl -4 -sSf --cacert "$(LOCAL_TLS_CERT_FILE)" --connect-timeout 1 --max-time 2 $$resolve_args "https://shop.localhost:$$smoke_port/api/health" >/dev/null; then break; fi; \
			if ! kill -0 "$$traefik_pid" 2>/dev/null; then cat "$$port_forward_log"; exit 1; fi; \
			if [ "$$attempt" -eq "$(K8S_SMOKE_MAX_ATTEMPTS)" ]; then echo "$(RED)Timed out waiting for the Traefik smoke-test port-forward.$(NC)"; cat "$$port_forward_log"; exit 1; fi; \
			sleep 1; \
		done; \
		curl -4 -sSf --cacert "$(LOCAL_TLS_CERT_FILE)" --max-time $(K8S_SMOKE_TIMEOUT) $$resolve_args "https://admin.localhost:$$smoke_port/api/health" >/dev/null && \
		curl -4 -sSf --cacert "$(LOCAL_TLS_CERT_FILE)" --max-time $(K8S_SMOKE_TIMEOUT) $$resolve_args --get "https://admin.localhost:$$smoke_port/_next/image" \
			--data-urlencode "url=$(K8S_IMAGE_STOREFRONT_ORIGIN)/logo.png" \
			--data-urlencode "w=64" \
			--data-urlencode "q=75" >/dev/null && \
		curl -4 -sSf --cacert "$(LOCAL_TLS_CERT_FILE)" --max-time $(K8S_SMOKE_TIMEOUT) $$resolve_args "https://shop.localhost:$$smoke_port/" >/dev/null && \
		status="$$(curl -4 -sS --cacert "$(LOCAL_TLS_CERT_FILE)" -o /dev/null -w '%{http_code}' --max-time $(K8S_SMOKE_TIMEOUT) $$resolve_args -X POST "https://api.localhost:$$smoke_port/api/webhooks/stripe")"; \
		test "$$status" = "400" || { echo "$(RED)Expected unsigned Stripe webhook to reach payment-service and return 400; received $$status.$(NC)"; exit 1; }
	@echo "$(GREEN)Kubernetes smoke tests passed$(NC)"

k8s-smoke-full: k8s-smoke ## Smoke-test full Kubernetes API routes
	@echo "$(BLUE)Smoke-testing Kubernetes API ingress...$(NC)"
	@curl -4 -sSf --cacert "$(LOCAL_TLS_CERT_FILE)" --max-time $(K8S_SMOKE_TIMEOUT) -H 'content-type: application/json' --data '{"json":{"limit":1}}' https://api.localhost/rpc/product/product/list >/dev/null
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
	$(KUBECTL) -n $(HELM_NAMESPACE) logs -f -l app.kubernetes.io/instance=$(HELM_RELEASE),app.kubernetes.io/component=$(K8S_SERVICE) $(K8S_CONTAINER_ARGS) --tail=$(K8S_LOG_TAIL)

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
	@$(MAKE) k8s-logs K8S_SERVICE=payment-service K8S_CONTAINER=payment-service

k8s-logs-stripe: ## Stream the Kubernetes-local Stripe CLI sidecar logs
	@$(MAKE) k8s-logs K8S_SERVICE=payment-service K8S_CONTAINER=stripe-cli

k8s-describe: ## Describe pods for one Kubernetes service (K8S_SERVICE=client|admin|product-service|order-service|payment-service)
	$(KUBECTL) -n $(HELM_NAMESPACE) describe pod -l app.kubernetes.io/instance=$(HELM_RELEASE),app.kubernetes.io/component=$(K8S_SERVICE)

k8s-restart: ## Restart all ecommerce deployments and wait for rollout
	$(KUBECTL) -n $(HELM_NAMESPACE) rollout restart deployment -l app.kubernetes.io/instance=$(HELM_RELEASE)
	$(KUBECTL) -n $(HELM_NAMESPACE) rollout status deployment -l app.kubernetes.io/instance=$(HELM_RELEASE) --timeout=$(K8S_ROLLOUT_TIMEOUT)

k8s-uninstall: ## Uninstall the ecommerce Helm release
	$(HELM) uninstall $(HELM_RELEASE) --namespace $(HELM_NAMESPACE) --wait --timeout $(K8S_ROLLOUT_TIMEOUT)

k8s-clear: ## Uninstall local releases and remove project Docker backing services
	@echo "$(RED)Clearing local Kubernetes and Docker resources...$(NC)"
	-$(HELM) uninstall $(HELM_RELEASE) --namespace $(HELM_NAMESPACE) --wait --timeout $(K8S_ROLLOUT_TIMEOUT) --ignore-not-found
	-$(HELM) uninstall traefik --namespace $(TRAEFIK_NAMESPACE) --wait --timeout $(K8S_ROLLOUT_TIMEOUT) --ignore-not-found
	-$(HELM) uninstall $(OBS_RELEASE) --namespace $(OBS_NAMESPACE) --wait --timeout $(K8S_ROLLOUT_TIMEOUT) --ignore-not-found
	$(DOCKER_COMPOSE) down -v --remove-orphans
	@echo "$(GREEN)Local releases and project Docker resources cleared; namespaces were retained.$(NC)"

k8s-delete-namespaces: ## Delete all three local namespaces (requires explicit confirmation)
	@test "$(CONFIRM)" = "k8s-delete-namespaces" || { echo "$(RED)Namespace deletion requires CONFIRM=k8s-delete-namespaces.$(NC)"; exit 2; }
	$(KUBECTL) delete namespace $(HELM_NAMESPACE) $(TRAEFIK_NAMESPACE) $(OBS_NAMESPACE) --ignore-not-found=true --wait=true

clear: k8s-clear ## Alias for k8s-clear

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
