# Application development, quality, build, and monitoring targets.

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

