# Environment commissioning

`local/` is the development environment. `staging/` and `production/` are
configuration templates, not deployed environments. Domains, hosting, production
credentials and traffic/recovery requirements have not been supplied.

Before rendering either hosted template:
1. Replace every `.invalid` host, registry and TEST-NET CIDR. Configure DNS and
   a valid TLS secret; install ingress, a NetworkPolicy-capable CNI and monitoring
   CRDs. Verify allowed traffic, including migration jobs, from real pods.
2. Build frontends with their environment-specific public URLs and Clerk/Stripe
   publishable keys. Promote the same verified image digests for server services;
   frontend public settings are build-time values. Supply a digest for each of
   product/order/payment/client/admin. Unconfigured profiles deliberately fail.
3. Provision both external Secrets in the release namespace before running
   Helm. The hosted values specify the names and allow a separate Secret per
   Job through `jobs.<name>.secretName`.

   | Secret in the hosted profile        | Database keys and credentials                                                           |
   | ----------------------------------- | --------------------------------------------------------------------------------------- |
   | `commerce-<environment>-runtime`    | `DATABASE_URL`, `PAYMENT_DATABASE_URL`, `MONGO_URL` using application roles             |
   | `commerce-<environment>-migrations` | The same keys using product/payment migration roles and the order index deployment role |

   Product and payment also need the same random `INTERNAL_SERVICE_TOKEN`
   (32+ characters) in the runtime Secret. Supply SCRAM/TLS Kafka credentials,
   Clerk keys, Stripe keys, and the real webhook signing secret there. Configure
   TLS-verified database connections and put secret values in the secret manager.
4. Grant DDL and index creation to the hook roles. Give runtime roles access
   to their own application data and the migration or index metadata needed for
   readiness checks. Revoke public schema creation and grant the product
   migration role the access needed to define inventory's Product foreign key.
   Grant Kafka principals only their required topics and groups, including
   per-group dead-letter topics. Pre-create topics if runtime creation is denied.
5. Configure PITR for PostgreSQL and managed MongoDB backups, encrypted offsite
   retention, secret rotation and alert routing. Record recovery ownership and run
   the documented restore drill. Quarantine topics require monitored retention.
6. Deploy staging, run signed webhook duplicate/reorder tests and a Clerk/Stripe
   test-mode browser purchase, expire a session, interrupt workers, and verify
   stock/order/payment convergence. Run Helm tests and inspect business metrics.
7. Promote only after the deployment gates in docs/OPERATIONS.md pass. Deployment
   has not been authorized to an external target by these templates.

The provided network policy permits namespace service traffic, DNS, specified
backend CIDRs and public TCP 443 for Stripe/Clerk. Tighten HTTPS with an egress
proxy where required; L3/L4 policies cannot provide hostname-based allowlists.
Verify proxy forwarding trust and add ingress/WAF rate limits before launch.

After rotating a runtime Secret, roll the affected deployments and verify
readiness before revoking the old credentials. Running containers read
Secret-backed environment variables at startup.

Proposed targets for agreement and staging measurement: 99.9% monthly API
availability, catalog p95 below 300 ms at 50 requests/second, payment-to-order
p95 below 60 seconds, backup RPO at most 15 minutes and RTO at most one hour.
These are proposed operating targets, not measured guarantees or requirements
already accepted by the business. Pool capacity must include every replica:
product defaults to 20 catalog + 5 inventory connections, payment to 10.
