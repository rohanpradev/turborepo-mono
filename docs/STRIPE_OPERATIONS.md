# Stripe Operations Runbook

This runbook covers the supported Stripe, Clerk, Kafka, and Kubernetes operating modes. The design plan and rationale live in [STRIPE_KUBERNETES_REDESIGN_PLAN.md](./STRIPE_KUBERNETES_REDESIGN_PLAN.md).

## Supported Modes

### Local Kubernetes

`values.web-local.yaml` enables a Stripe CLI sidecar in the payment pod. The sidecar:

1. Authenticates with the configured Stripe secret key.
2. Opens a Stripe event stream.
3. Writes the ephemeral `whsec_...` signing secret into a memory-backed shared volume.
4. Forwards checkout completion events directly to `http://127.0.0.1:8002/api/webhooks/stripe`.
5. Lets the payment process reload the signing secret without a pod restart.

The file-mounted secret takes precedence over `STRIPE_WEBHOOK_SECRET`. Keep one payment replica in this mode because a Stripe CLI listener and its signing secret are scoped to that pod.

### Shared and Production Clusters

Do not enable the Stripe CLI sidecar. Instead:

1. Expose the payment webhook through a public, trusted HTTPS hostname.
2. Register the exact URL in Stripe Workbench.
3. Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
4. Store that endpoint's exact signing secret in the Kubernetes Secret.
5. Keep `stripeCli.enabled=false` and scale the payment deployment normally.
6. Keep the Stripe API version aligned with the version pinned by the installed Stripe SDK.

Never reuse a Stripe CLI signing secret for a Workbench endpoint, or a secret from a different endpoint or Stripe account.

## Required Configuration

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server-side Stripe API credential; `sk_...` or restricted `rk_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Browser Stripe.js credential; must match the secret key's test/live mode |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the configured endpoint; local sidecar replaces it at runtime |
| `CLERK_SECRET_KEY` | Server-side Clerk credential |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Browser Clerk credential |
| `CLERK_AUTHORIZED_PARTIES` | Exact allowed storefront/admin origins for Clerk `azp` validation |
| `CLERK_JWT_KEY` | Optional PEM public key for networkless Clerk JWT verification |

`NEXT_PUBLIC_*` values are compiled into Next.js bundles, so changing them requires rebuilding the frontend image. Kubernetes Secret values injected as environment variables require a pod restart; the local Stripe signing-secret file is the deliberate exception.

The deployment preflight rejects placeholders, missing commerce credentials, malformed Stripe key prefixes, and Stripe test/live mode mismatches:

```bash
make k8s-runtime-secret
```

## Deployment and Diagnosis

```bash
make k8s
make k8s-payment-doctor
make k8s-logs-payment
make k8s-logs-stripe
make k8s-smoke
```

`k8s-payment-doctor` reports pod state, readiness, sanitized secret lengths, events, and current/previous payment and order logs. It never prints credential values.

## End-to-End Test

1. Sign in at `https://shop.localhost` and add a synced product to the cart.
2. Open checkout. A same-origin `/api/checkout` route resolves the Clerk session and calls the payment service with a bearer token.
3. Complete a Stripe test payment.
4. Confirm the return page polls same-origin `/api/checkout/{sessionId}` and reaches `paid`.
5. Confirm logs show `stripe.checkout.completed`, followed by `payment.successful`.
6. Confirm one order appears for the signed-in user.
7. Replay the Stripe event and confirm the same order is updated rather than duplicated.

## Failure Guide

### Storefront receives `401 Unauthorized`

- Keep browser requests same-origin; do not call `api.localhost` from the browser for user-specific status.
- Inspect the structured Clerk reason in the service log.
- Ensure `CLERK_AUTHORIZED_PARTIES` contains the exact scheme and host used by the browser.
- Ensure the Clerk publishable and secret keys belong to the same Clerk instance.
- Sign out and in again after switching Clerk instances.

### Webhook receives `400 Invalid signature`

- Confirm the handler receives the raw request body before JSON parsing.
- Confirm the signing secret belongs to the exact active listener or Workbench endpoint.
- Use `make k8s-payment-doctor` to confirm a non-zero secret length without exposing it.
- Check node clock synchronization; Stripe signatures have a replay tolerance.

### Payment or order readiness returns `503`

- Inspect the named dependency in `/ready` and the payment/order logs.
- Confirm Kafka bootstrap addresses are reachable from the cluster.
- In the local OrbStack profile, the Docker Kafka brokers advertise host ports `19094`, `19095`, and `19096` intentionally.
- Confirm Postgres and MongoDB are running before expecting full readiness.

### A pod enters `CrashLoopBackOff`

Run `make k8s-payment-doctor`. Payment and order processes now remain live during ordinary dependency outages, so a continued crash indicates a process/configuration defect rather than a transient database or Kafka outage.

### Stripe shows paid but no order appears

- Check Workbench delivery status or the Stripe CLI sidecar log and resend the event if necessary.
- Verify the `stripe.checkout.completed` and `payment.successful` topics exist.
- Check payment worker and order consumer readiness.
- Opening the authenticated return status route also repairs a missed handoff by re-enqueuing a paid checkout.

## Secret Rotation

For a production webhook-secret rotation, create a second endpoint destination temporarily, deploy support for both secrets if overlap is needed, verify deliveries, then retire the old destination. Duplicate events during the overlap are safe because downstream processing is idempotent.
