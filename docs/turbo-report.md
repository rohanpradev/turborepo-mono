# Turbo Run Report

Generated: 2026-08-09T06:15:30.027Z
Summary: .turbo/runs/3HfPNIp8k08qIDW2Tf2pIGcNHwO.json

## Run

- Command: `turbo run check-types build`
- Turbo: 2.10.9
- Env mode: strict
- Started: 2026-08-09T06:15:07.294Z
- Duration: 1.60s
- Packages: 13

## Cache

- Tasks: 15
- Cached: 10
- Executed: 5
- Failed: 0
- Cache hit rate: 67%

## Tasks

| Task | Cache | Source | Duration | Time saved |
| --- | --- | --- | --- | --- |
| order-service#check-types | MISS | EXECUTED | 1.21s | 0ms |
| payment-service#check-types | MISS | EXECUTED | 845ms | 0ms |
| product-service#check-types | MISS | EXECUTED | 778ms | 0ms |
| @repo/hono-utils#check-types | MISS | EXECUTED | 369ms | 0ms |
| client#build | HIT | LOCAL | 339ms | 8.98s |
| admin#build | HIT | LOCAL | 298ms | 8.71s |
| @repo/kafka#check-types | MISS | EXECUTED | 202ms | 0ms |
| admin#check-types | HIT | LOCAL | 3ms | 2.23s |
| client#check-types | HIT | LOCAL | 3ms | 2.17s |
| @repo/product-db#db:generate | HIT | LOCAL | 2ms | 2.34s |
| @repo/order-db#check-types | HIT | LOCAL | 1ms | 2.52s |
| @repo/types#check-types | HIT | LOCAL | 1ms | 1.95s |
| @repo/api-client#check-types | HIT | LOCAL | 0ms | 195ms |
| @repo/contracts#check-types | HIT | LOCAL | 0ms | 189ms |
| @repo/product-db#check-types | HIT | LOCAL | 0ms | 162ms |
