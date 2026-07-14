# Stripe and Kubernetes Reliability Redesign

Date: 2026-07-14

## Objective

Make authenticated checkout, Stripe payment confirmation, webhook delivery, and order creation work reliably through Traefik in local Kubernetes and provide a production-safe path for a public cluster. A checkout is not considered successful merely because the browser shows a success page: Stripe must report the Checkout Session as paid and the order sink must persist exactly one logical order.

## Evidence from the current system

- The live `orbstack` cluster has valid Services and a Traefik Ingress for `shop.localhost`, `admin.localhost`, and `api.localhost`.
- `payment-service` and `order-service` are both in `CrashLoopBackOff`; Stripe checkout and post-payment order creation therefore cannot complete.
- The local Kubernetes profile uses Docker-hosted Postgres, MongoDB, and Kafka. Payment and order currently exit when Kafka or MongoDB bootstrap fails, so a temporary or host-boundary outage becomes a permanent pod restart loop.
- Checkout creation correctly uses a same-origin Next.js endpoint, but checkout-status verification calls `api.localhost` directly from the browser. That reintroduces self-signed TLS, CORS, and Clerk authorized-party failure modes.
- Kubernetes never starts a Stripe CLI listener. `api.localhost` is not publicly reachable by Stripe, and a signing secret from a different CLI process or Workbench endpoint cannot verify these webhook signatures.
- `NEXT_PUBLIC_*` values are compiled into the Next.js browser bundle. Updating only a Kubernetes runtime Secret does not update the publishable Clerk or Stripe keys in an existing web image.
- The webhook handler verifies the raw request correctly, but performs Stripe API enrichment and Kafka publication before responding. The in-memory event claim map is pod-local and cannot be a correctness boundary with replicas or restarts.

## External constraints confirmed in primary documentation

- Stripe Checkout Sessions is the recommended managed checkout lifecycle for most payment integrations and returns a client secret for Elements. The installed Stripe Node SDK is pinned to `2026-03-25.dahlia`, where the renamed UI mode is `elements`.
- Stripe requires the unmodified raw request body for webhook signature verification, can deliver duplicates and out of order, retries failed deliveries, recommends asynchronous processing, and recommends returning `2xx` quickly.
- Stripe idempotency keys make Checkout Session creation safe to retry, but keys can be pruned after at least 24 hours; application event processing still needs idempotent consumers.
- Clerk same-origin requests carry the session automatically. Cross-origin requests require an explicit bearer token. Backend verification should restrict the token `azp` claim with `authorizedParties`; an optional JWT public key enables networkless verification.
- Kubernetes startup, liveness, and readiness probes have different purposes. A downstream outage should make a service unready, not kill a healthy HTTP process and cause `CrashLoopBackOff`.
- Kubernetes Secret values injected through environment variables do not change in a running container; the pod must restart.
- Traefik Kubernetes Ingress routes exact host/path rules to Services and forwards the original Host header by default. The webhook path must remain public to Clerk while all checkout RPCs remain authenticated.

## Target architecture

### Authenticated checkout path

1. The browser sends a same-origin request to `shop.../api/checkout` using the Clerk session cookie.
2. Next.js validates the session with `auth()`, obtains a short-lived session token, validates the payload, and calls `payment-service` over cluster DNS.
3. `payment-service` verifies the bearer token, including its authorized party, loads canonical product data from `product-service`, computes the total server-side, and creates a Stripe Checkout Session with an idempotency key derived from user, checkout attempt, and canonical cart.
4. Only the Checkout Session client secret crosses back to the browser. Card data remains inside Stripe Elements.
5. Checkout-status reads use a same-origin Next.js endpoint too. The browser never needs direct authenticated access to `api.localhost`.

### Payment confirmation path

1. Stripe sends a signed webhook to the public HTTPS endpoint in shared environments. In local Kubernetes, a Stripe CLI sidecar receives Stripe events and forwards them directly to the payment container over the pod/service network.
2. The webhook route is public to Clerk, size-limited, and verifies the raw body with the signing secret associated with that exact destination/listener.
3. A verified paid Checkout Session event is published as a minimal `stripe.checkout.completed` Kafka message and the endpoint returns `2xx` after the durable broker acknowledgement. Stripe API enrichment is not performed on the ingress request.
4. A payment worker consumes the completion message, retrieves the authoritative Checkout Session, line items, and PaymentIntent from Stripe, verifies `complete` plus `paid`, and publishes `payment.successful` keyed by Checkout Session ID.
5. `order-service` consumes at least once and upserts on its unique `orderId`. Duplicate Stripe delivery, Kafka retry, consumer rebalance, and pod restart therefore still create one logical order.

### Local and production webhook modes

- Local Kubernetes: optional Stripe CLI sidecar, one payment replica, shared `emptyDir` signing-secret file, direct HTTP forward to the payment container. The generated CLI secret takes precedence over any stale environment secret.
- Shared/production cluster: no Stripe CLI sidecar. Register `https://<api-host>/api/webhooks/stripe` in Stripe Workbench, select only required event types, store that endpoint's `whsec_...` in the cluster secret manager, and use two endpoints during secret/API-version rotation.

## Implementation phases

### 1. Configuration and startup safety

- Reject placeholder and malformed Stripe/Clerk values before deploying.
- Require matching Stripe key modes (`pk_test` with `sk_test`, or live with live) for the checkout-enabled Kubernetes workflow.
- Support `CLERK_JWT_KEY` without making it mandatory.
- Validate the Stripe API credential during payment startup and report the result in readiness/diagnostics without terminating the HTTP server.
- Replace fatal payment/order dependency bootstrap exits with bounded exponential retries. Liveness remains healthy; readiness describes unavailable dependencies.
- Add a doctor command that shows previous pod logs, endpoint readiness, secret key presence/length only, and backing-service reachability without printing credentials.

### 2. Clerk and browser boundary

- Add a protected same-origin checkout-status route.
- Change the return page to use it and remove its direct browser bearer call to the API host.
- Keep Clerk `authorizedParties` explicit for every real storefront/admin origin, including port differences in local modes.
- Preserve `401` for missing/invalid sessions, `403` for valid non-admin sessions, and `503` for missing server configuration.

### 3. Stripe webhook and event pipeline

- Add the typed `stripe.checkout.completed` Kafka contract.
- Make the webhook handler verify and enqueue only.
- Move Stripe retrieval and `payment.successful` construction into the Kafka consumer.
- Treat the pipeline as at-least-once; use stable message keys and the existing unique order upsert as the durable idempotency boundary.
- Include `checkout.session.completed` and `checkout.session.async_payment_succeeded`; record but do not create orders for unpaid sessions.

### 4. Helm and local Stripe listener

- Add an opt-in Stripe CLI sidecar and script ConfigMap to the payment pod.
- Share only the generated webhook secret file; never expose it in logs or ConfigMaps.
- Enable the sidecar only in `values.web-local.yaml` and keep it disabled in production defaults.
- Ensure local payment readiness waits for a valid Stripe API key, webhook secret, and Kafka handoff.
- Keep the webhook Ingress path free of Clerk/forward-auth middleware.

### 5. Verification and operations

- Unit test strict key detection, secret-file precedence, webhook verification/enqueue behavior, duplicate-safe order persistence, and BFF error mapping.
- Run formatting, lint, type checks, the Bun test suite, build, Helm lint/template, and client-side Kubernetes manifest validation.
- Add smoke checks for all service readiness endpoints, webhook route reachability, and expected `400` response to an unsigned webhook (proves routing without accepting it).
- On a live local cluster, require all pods Ready, create a Stripe test Checkout Session, complete it with a Stripe test payment method, observe the verified webhook and Kafka handoff, and verify exactly one order.
- Document Stripe CLI logs, Workbench delivery inspection/resend, Clerk `azp` diagnostics, secret rotation, and recovery after Kafka/database outages.

## Acceptance gates

- No payment or order pod is in `CrashLoopBackOff` when a dependency is temporarily unavailable.
- A signed-in browser can create and verify checkout through `shop.localhost` without cross-origin API calls.
- Missing/placeholder/mismatched keys fail preflight with a specific message.
- An unsigned or wrong-secret webhook returns `400`; a correctly signed required event is acknowledged and enqueued.
- Replaying the same Stripe event and replaying the Kafka message still results in one logical order.
- Webhook processing remains correct across a payment-pod restart.
- Helm defaults are production-safe: no local Stripe CLI, no embedded real secrets, TLS routing enabled, and runtime secrets external.

## Rollback

- The same-origin status endpoint is additive; the old API RPC remains available for a rollback window.
- The new Kafka topic is additive. Consumers can be rolled back after draining it; the order sink already accepts the existing `payment.successful` contract.
- The Stripe CLI sidecar is guarded by one Helm value and can be disabled without changing production routing.
- During a shared-environment webhook migration, keep the old Stripe endpoint enabled until the new endpoint shows successful deliveries, then disable the old endpoint.

## Primary references

- Stripe Checkout Sessions: https://docs.stripe.com/payments/checkout-sessions
- Stripe webhook behavior and best practices: https://docs.stripe.com/webhooks
- Stripe idempotent requests: https://docs.stripe.com/api/idempotent_requests
- Stripe Node SDK `2026-03-25.dahlia` changes: https://github.com/stripe/stripe-node/blob/master/CHANGELOG.md
- Clerk authenticated requests: https://clerk.com/docs/guides/development/making-requests
- Clerk backend request verification: https://clerk.com/docs/reference/backend/authenticate-request
- Clerk manual JWT verification and authorized parties: https://clerk.com/docs/guides/sessions/manual-jwt-verification
- Kubernetes probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Secret injection: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure
- Traefik Kubernetes Ingress routing: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress/
