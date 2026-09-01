# Shared variables, setup, and top-level help.

.PHONY: help infra-versions runtime-dir ensure-env install dev stop clean clean-all setup setup-base generate-client kafka-ui db-setup db-migrate db-generate db-studio db-seed local-env-file local-db-migrate local-db-seed local-urls local-dev local-fresh-dev lint type-check format audit test boundaries turbo-summary turbo-graph turbo-report turbo-inspect verify build build-client build-admin logs-product logs-order logs-payment status docker-auth docker-certs docker-validate docker-images docker-lock-images docker-build docker-up docker-up-build docker-smoke docker-test docker-down docker-down-volumes docker-logs docker-logs-traefik docker-logs-product docker-logs-order docker-logs-payment docker-logs-client docker-logs-admin docker-logs-stripe docker-ps docker-restart docker-restart-service docker-rebuild-service docker-shell-traefik docker-shell-product docker-shell-order docker-shell-payment docker-infra-only docker-infra-local docker-stripe-up docker-stripe-down docker-clean docker-clean-images docker-prune docker-kill-all docker-setup docker-fresh-start helm-lint helm-lint-supported helm-validate-supported helm-template helm-dry-run helm-package k8s-doctor k8s-toolchain-check k8s-gateway-api k8s-traefik k8s-traefik-status k8s-observability k8s-observability-status k8s-grafana k8s-prometheus k8s-preflight k8s-local-deps k8s-namespace k8s-fresh-namespace k8s-reset-local k8s-tls-secret k8s-runtime-secret k8s-build-images k8s-build-full-images k8s-tag-images k8s-load-images k8s-validate k8s-validate-full k8s-diff k8s-deploy k8s-deploy-observed k8s-deploy-full k8s-up k8s-up-observed k8s-up-full k8s-forward k8s-full k8s-wait k8s-smoke k8s-smoke-full k8s-test k8s-status k8s-events k8s-logs k8s-logs-traefik k8s-logs-client k8s-logs-admin k8s-logs-product k8s-logs-order k8s-logs-payment k8s-describe k8s-restart k8s-uninstall k8s-clear k8s-delete-namespaces k8s ks8 kubernetes clear quick-start quick-stop restart docker-quick-start
.PHONY: k8s-payment-doctor k8s-logs-stripe helm-lint-experimental helm-validate-experimental


ifeq ($(strip $(NO_COLOR)),)
BLUE := $(shell printf '\033[0;34m')
GREEN := $(shell printf '\033[0;32m')
YELLOW := $(shell printf '\033[1;33m')
RED := $(shell printf '\033[0;31m')
NC := $(shell printf '\033[0m')
else
BLUE :=
GREEN :=
YELLOW :=
RED :=
NC :=
endif

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
HELM_VERSION ?= 4.2.4
K8S_TARGET_VERSION ?= 1.36.4
K8S_SUPPORTED_VERSIONS ?= 1.35.8 1.36.4
K8S_EXPERIMENTAL_VERSIONS ?= 1.37.0
K8S_VERSION_TIER ?= supported
K8S_POD_SECURITY_LEVEL ?= restricted
K8S_POD_SECURITY_VERSION ?= v1.35
KUBECONFORM_IMAGE ?= ghcr.io/yannh/kubeconform:v0.8.0@sha256:faffaf43f95aa6425306e1ab8d6fcad72acb9049158f38e574c085ea1ec0f64e
GATEWAY_API_VERSION ?= 1.6.1
GATEWAY_API_MANIFEST_SHA256 ?= 24d931f22abd8e40c973264319ead7cfa09d0fb7716b7ab1ee2ff174cb063a73
TRAEFIK_CHART_VERSION ?= 41.4.0
TRAEFIK_IMAGE_VERSION ?= v3.7.12
TRAEFIK_IMAGE_DIGEST ?= sha256:9c2a54d87f76f5c2f5f2682c68394af92fb12c0a2686798d6462a3f84bd78eaf
OBS_CHART_VERSION ?= 88.5.4
HELM_CHART ?= charts/ecommerce
HELM_RELEASE ?= ecommerce
HELM_NAMESPACE ?= ecommerce
TRAEFIK_NAMESPACE ?= traefik
TRAEFIK_GATEWAY_TLS_SECRET ?= local-selfsigned-tls
HELM_VALUES ?= deploy/environments/local/ecommerce.values.yaml
HELM_FULL_VALUES ?= deploy/environments/local/ecommerce-full.values.yaml
HELM_RUNTIME_SECRET ?= $(HELM_RELEASE)-runtime
HELM_TLS_SECRET ?= ecommerce-local-tls
HELM_SET_ARGS ?= --set secrets.name=$(HELM_RUNTIME_SECRET) --set ingress.tls.secretName=$(HELM_TLS_SECRET) $(K8S_IMAGE_SET_ARGS)
OBS_NAMESPACE ?= monitoring
OBS_RELEASE ?= kube-prometheus-stack
TRAEFIK_VALUES ?= deploy/environments/local/traefik.values.yaml
OBS_VALUES ?= deploy/environments/local/monitoring.values.yaml
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
DHI_CHECK_IMAGES ?= dhi.io/postgres:18.4-debian13@sha256:a807e832c1fc9ded731956abcb53dc98ed003fd82e27275eaef8dcf52fb90236 dhi.io/kafka:4.3.1-debian13-native@sha256:89691f2d47ded5c88186e0e61a68b2fe77e2a19dea29ad2669e5626aff7965ff
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

infra-versions: ## Show the active Docker, Compose, Helm, kubectl, and cluster versions
	@docker version --format 'Docker: client={{.Client.Version}} server={{.Server.Version}}'
	@$(DOCKER_COMPOSE) version
	@$(HELM) version --short
	@$(KUBECTL) version

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
