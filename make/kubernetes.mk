# Helm, Kubernetes, platform controller, and observability targets.

##@ Kubernetes / Helm

helm-lint: ## Lint the ecommerce Helm chart
	@echo "$(BLUE)Linting Helm chart...$(NC)"
	$(HELM) lint $(HELM_CHART) --kube-version $(K8S_TARGET_VERSION)
	@echo "$(GREEN)Helm chart lint passed$(NC)"

helm-lint-supported: ## Lint every deployable chart profile against supported Kubernetes minors
	@for kubernetes_version in $(K8S_SUPPORTED_VERSIONS); do \
		for profile in ingress gateway local local-full; do \
			echo "$(BLUE)Linting $$profile for $(K8S_VERSION_TIER) Kubernetes $$kubernetes_version...$(NC)"; \
			case "$$profile" in \
				ingress) profile_args="--values $(HELM_CHART)/ci/ingress-values.yaml" ;; \
				gateway) profile_args="--values $(HELM_CHART)/ci/gateway-values.yaml" ;; \
				local) profile_args="--values $(HELM_VALUES)" ;; \
				local-full) profile_args="--values $(HELM_FULL_VALUES)" ;; \
			esac; \
			$(HELM) lint $(HELM_CHART) --kube-version "$$kubernetes_version" $$profile_args || exit 1; \
		done; \
	done
	@echo "$(GREEN)Helm profiles passed the $(K8S_VERSION_TIER) lint matrix: $(K8S_SUPPORTED_VERSIONS)$(NC)"

helm-lint-experimental: ## Render-lint every chart profile against experimental Kubernetes minors
	@$(MAKE) --no-print-directory helm-lint-supported K8S_SUPPORTED_VERSIONS="$(K8S_EXPERIMENTAL_VERSIONS)" K8S_VERSION_TIER=experimental

helm-validate-supported: helm-lint-supported ## Schema-validate every real profile against supported Kubernetes minors
	@for kubernetes_version in $(K8S_SUPPORTED_VERSIONS); do \
		for profile in ingress gateway local local-full; do \
			echo "$(BLUE)Validating $$profile for $(K8S_VERSION_TIER) Kubernetes $$kubernetes_version...$(NC)"; \
			case "$$profile" in \
				ingress) profile_args="--values $(HELM_CHART)/ci/ingress-values.yaml" ;; \
				gateway) profile_args="--values $(HELM_CHART)/ci/gateway-values.yaml" ;; \
				local) profile_args="--values $(HELM_VALUES)" ;; \
				local-full) profile_args="--values $(HELM_FULL_VALUES)" ;; \
			esac; \
			$(HELM) template $(HELM_RELEASE) $(HELM_CHART) --namespace $(HELM_NAMESPACE) --kube-version "$$kubernetes_version" $$profile_args \
				| docker run --rm -i $(KUBECONFORM_IMAGE) -strict -summary -ignore-missing-schemas -kubernetes-version "$$kubernetes_version" - || exit 1; \
		done; \
	done
	@echo "$(GREEN)All $(K8S_VERSION_TIER) Helm profiles passed kubeconform validation$(NC)"

helm-validate-experimental: ## Schema-validate every profile against experimental Kubernetes minors
	@$(MAKE) --no-print-directory helm-validate-supported K8S_SUPPORTED_VERSIONS="$(K8S_EXPERIMENTAL_VERSIONS)" K8S_VERSION_TIER=experimental

helm-assert-profiles: ## Enforce rendered resource and image policies across the Kubernetes matrix
	bun run helm:assert-profiles -- $(K8S_SUPPORTED_VERSIONS) $(K8S_EXPERIMENTAL_VERSIONS)

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
	@echo "  supported Kubernetes: $(K8S_SUPPORTED_VERSIONS)"
	@echo "  experimental render target: $(K8S_EXPERIMENTAL_VERSIONS)"
	@printf "  context: "; $(KUBECTL) config current-context 2>/dev/null || echo "$(RED)unavailable$(NC)"
	@printf "  cluster: "; $(KUBECTL) cluster-info >/dev/null 2>&1 && echo "$(GREEN)reachable$(NC)" || echo "$(RED)unreachable$(NC)"
	@echo ""
	@$(KUBECTL) get ingressclass "$(K8S_INGRESS_CLASS_NAME)" 2>/dev/null || echo "$(YELLOW)IngressClass '$(K8S_INGRESS_CLASS_NAME)' not found. Run 'make k8s-traefik'.$(NC)"
	@$(KUBECTL) -n $(TRAEFIK_NAMESPACE) get pods,svc 2>/dev/null || true
	@$(KUBECTL) -n $(HELM_NAMESPACE) get pods,svc,ingress,httproute 2>/dev/null || true

k8s-toolchain-check: ## Enforce the pinned Helm release and supported kubectl/server version skew
	@actual_helm="$$( $(HELM) version --template '{{ .Version }}' | sed 's/^v//' )"; \
		test "$$actual_helm" = "$(HELM_VERSION)" || { \
			echo "$(RED)Helm $$actual_helm is active; expected $(HELM_VERSION).$(NC)"; \
			exit 1; \
		}
	@client_minor="$$( $(KUBECTL) version --client=true -o yaml | awk '/^[[:space:]]+minor:/ { value=$$2; gsub(/"/, "", value); gsub(/[^0-9].*/, "", value); print value; exit }' )"; \
		server_minor="$$( $(KUBECTL) version -o yaml | awk '/^serverVersion:/ { server=1; next } server && /^[[:space:]]+minor:/ { value=$$2; gsub(/"/, "", value); gsub(/[^0-9].*/, "", value); print value; exit }' )"; \
		test -n "$$client_minor" -a -n "$$server_minor" || { echo "$(RED)Unable to determine kubectl/server versions.$(NC)"; exit 1; }; \
		skew=$$((client_minor - server_minor)); \
		if [ $$skew -lt 0 ]; then skew=$$((-skew)); fi; \
		test $$skew -le 1 || { \
			echo "$(RED)kubectl and the API server differ by $$skew minor releases; Kubernetes supports at most one.$(NC)"; \
			exit 1; \
		}; \
		echo "$(GREEN)Helm $(HELM_VERSION) and kubectl/server version skew checks passed$(NC)"

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

k8s-preflight: k8s-toolchain-check ## Verify local Kubernetes, Helm, kubectl, and Traefik ingress prerequisites
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

k8s: k8s-up-observed ## One-command local Kubernetes setup with Prometheus, Grafana, and Docker-backed Postgres, MongoDB, and Kafka
	@$(MAKE) k8s-forward

k8s-forward: runtime-dir ## Keep local Storefront, Admin, Grafana, and Prometheus forwards open
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
	$(KUBECTL) get pods,svc,ingress,jobs --namespace $(HELM_NAMESPACE)
	@$(KUBECTL) get httproute --namespace $(HELM_NAMESPACE) 2>/dev/null || true
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
