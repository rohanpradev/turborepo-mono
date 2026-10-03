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
3. Provision external secrets. Product gets DATABASE_URL and INTERNAL_SERVICE_TOKEN;
   payment gets PAYMENT_DATABASE_URL and the same random token (32+ characters).
   Use separate database roles and databases in hosted environments, TLS-verified
   database connections, SCRAM/TLS Kafka credentials, Clerk keys and authorized
   parties, Stripe keys and the real webhook endpoint secret. Never put secrets
   in values files or public environment variables. The local secret helper now
   requires the payment URL and internal token too.
4. Give migration roles DDL rights and runtime roles only their owned schema/table
   rights; revoke public schema creation. Inventory requires access to Product's
   foreign key. Pre-install jobs need the secret before Helm runs. Grant Kafka
   principals only their topics/groups, including per-group dead-letter topics;
   pre-create topics with infrastructure automation if runtime creation is denied.
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

Proposed targets for agreement and staging measurement: 99.9% monthly API
availability, catalog p95 below 300 ms at 50 requests/second, payment-to-order
p95 below 60 seconds, backup RPO at most 15 minutes and RTO at most one hour.
These are proposed operating targets, not measured guarantees or requirements
already accepted by the business. Pool capacity must include every replica:
product defaults to 20 catalog + 5 inventory connections, payment to 10.
