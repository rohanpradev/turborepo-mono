# Turbo Run Report

Generated: 2026-07-25T11:01:41.831Z
Summary: .turbo/runs/3GzbMUKn3AFDg1rBLULwftQH32t.json

## Run

- Command: `turbo run check-types build`
- Turbo: 2.10.6
- Env mode: strict
- Started: 2026-07-25T11:01:35.721Z
- Duration: 1.17s
- Packages: 13

## Cache

- Tasks: 15
- Cached: 13
- Executed: 2
- Failed: 0
- Cache hit rate: 87%

## Tasks

| Task | Cache | Source | Duration | Time saved |
| --- | --- | --- | --- | --- |
| client#check-types | MISS | EXECUTED | 1.16s | 0ms |
| admin#check-types | MISS | EXECUTED | 1.13s | 0ms |
| admin#build | HIT | LOCAL | 7ms | 9.32s |
| client#build | HIT | LOCAL | 7ms | 9.47s |
| @repo/product-db#db:generate | HIT | LOCAL | 2ms | 1.69s |
| @repo/api-client#check-types | HIT | LOCAL | 1ms | 208ms |
| @repo/kafka#check-types | HIT | LOCAL | 1ms | 155ms |
| @repo/order-db#check-types | HIT | LOCAL | 1ms | 875ms |
| @repo/types#check-types | HIT | LOCAL | 1ms | 152ms |
| order-service#check-types | HIT | LOCAL | 1ms | 2.03s |
| product-service#check-types | HIT | LOCAL | 1ms | 850ms |
| @repo/contracts#check-types | HIT | LOCAL | 0ms | 216ms |
| @repo/hono-utils#check-types | HIT | LOCAL | 0ms | 450ms |
| @repo/product-db#check-types | HIT | LOCAL | 0ms | 123ms |
| payment-service#check-types | HIT | LOCAL | 0ms | 1.15s |
