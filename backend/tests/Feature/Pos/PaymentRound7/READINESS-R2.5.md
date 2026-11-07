# FOOD POS — R2.5 Payment Integration & Full-Stack Readiness

**Date:** 2026-11-07 (Asia/Jakarta)  
**Workspace:** `D:\projects\pos`  
**Branch:** `laravel-inertia-rewrite`  
**Scope:** Test-only Round 7, **NOT a production release approval**.

## 1. Test evidence and scope

Added only:

- `backend/tests/Feature/Pos/PaymentRound7/PaymentMultiOperatorReadinessTest.php` (two new sequential cross-operator Laravel feature tests).
- This report in the same exclusive Round 7 test directory.

No production source, payment mutation logic, HTTP contracts, schema, middleware, config, frontend code, or pre-existing test files were changed.

| Executed check | Result |
| --- | --- |
| Round 7 new isolated feature tests | **PASS** — 2 tests / 37 assertions |
| Round 6 + Round 7 payment correctness tests | **PASS** — 10 tests / 151 assertions |
| Full Laravel PHPUnit suite | **PASS** — 143 tests / 1,259 assertions |
| PHPStan/Larastan level 7 | **PASS** — zero errors |
| Pint on new PHP test file | **PASS** |
| Database for executed feature tests | **SQLite `:memory:` only**; MySQL not accessed |

The existing Round 6 tests cover same-key idempotent retry, different-key and cross-order conflicts, invalid cash amount/underpayment, receipt GET 500 then recovery, read-only receipts, and HTTP role/validation behavior. Round 7 deliberately does **not** duplicate these cases. It adds **sequential cross-operator reconciliation** after a stale view of an order and after an operator identity switch.

## 2. Verified HTTP contract (read from application code; exercised in tests)

All routes are under `web` plus `auth`, `verified`, and `staff.role:owner,kasir`.

| Request | Expected current behavior |
| --- | --- |
| `POST /pos/orders/{order}/cash-payment` with cash/valid amount/new UUID | 200, `idempotent:false`, `payment`, `receiptUrl`; order marked paid |
| Same POST with identical UUID and tender | 200, `idempotent:true`, same payment ID |
| New UUID after order already paid | 409; must not create another payment |
| Same UUID on a different order | 409; other order remains unpaid |
| Underpayment/invalid request | 422, no payment record |
| Stale `expected_total` | 409, no settlement |
| `GET /pos/cashier/orders/{order}` | Authoritative order state (e.g., `paid`) |
| `GET /pos/cashier/orders/{order}/receipt` | 200 with verified receipt only when paid; otherwise 404 |
| `GET /pos/cashier/orders` | Paid order excluded from open cashier queue |

The settlement path uses `DB::transaction(..., 3)` and `lockForUpdate()` on the order. The migration defines unique `payments.idempotency_key`. These are code/schema observations; **their real MySQL contention behavior has not been verified**. A unique key alone cannot serialize two different keys for the same order.

## 3. Explicit QA matrix

| Scenario | Status | Evidence or remaining requirement |
| --- | --- | --- |
| Single cash settlement, real Laravel JSON | **PASS** | Existing Round 6 + Round 7 SQLite tests; HTTP 200 and persisted paid |
| Replay same UUID/same tender | **PASS** | HTTP 200 `idempotent:true`, identical payment ID |
| Replay different UUID / reused UUID on another order | **PASS** | HTTP 409; only one saved payment |
| Invalid amount, underpayment, stale total | **PASS** | HTTP 422 / 409 and no duplicate settlement |
| Stale second cashier after first cashier commits | **PASS (sequential)** | Round 7: 409 on stale attempted POST, GET shows paid, receipt uses original payment |
| Owner retrieves receipt after Kasir settlement | **PASS (identity switch)** | Round 7: fresh HTTP GETs; same payment, no additional POST |
| Receipt GET fails once with 500 then recovers | **PASS (in-process mock)** | Round 6 test-only middleware injects GET 500; persisted status stays paid |
| POST response discarded after commit | **PASS (model only)** | Round 6 deliberately ignores HTTP response; this is **not** a socket timeout |
| Role-based access: guest/Owner/Kasir/Waiters/inactive/unverified | **PASS (Laravel feature scope)** | Existing Round 6 tests; auth/RBAC middleware checked in Laravel |
| Real browser reload + independent cookie/session | **NOT RUN** | Need staging browser login with distinct cookie jars, verify GET source of truth |
| Production-like CSRF token/cookie rejection and refresh | **BLOCKED** | PHPUnit bypasses Laravel CSRF; requires dedicated authorized staging browser |
| Two truly simultaneous MySQL transactions, same/different keys | **BLOCKED** (`MYSQL_CONCURRENCY=BLOCKED`) | No approved disposable DB or write authorization |
| Network loss at commit boundary / unknown POST result | **BLOCKED** | Need a real transport fault injector and server-side commit trace |
| App release readiness under realistic multi-operator workload | **BLOCKED** | Cannot infer from SQLite or mocked browser alone |

## 4. Known security and transaction boundaries

- `bootstrap/app.php` registers `RequireStaffRole` alias and `EnsureActiveStaff` in the web middleware group; `routes/pos.php` applies `auth`, `verified`, and `staff.role:owner,kasir` to payment and receipt. Inactive staff are logged out by `EnsureActiveStaff`.
- Laravel feature tests bypass CSRF verification by default. The presence of the web middleware **does not establish browser CSRF protection works in a deployed environment**.
- `actingAs()` changing from one operator to another is not an actual separate browser login, cookie exchange, process restart, or network connection.
- SQLite in-memory has no meaningful equivalence to MySQL row locks, inter-process concurrency, isolation levels or deadlock retries. Sequential HTTP outcomes cannot certify MySQL concurrent settlement.
- Both Laravel and mocked frontend regression evidence are useful but do not replace live full-stack cashier/receipt recovery under actual authenticated browser sessions.

## 5. Reproducible SAFE local regression commands (PowerShell)

Run only in `D:\projects\pos\backend`. All feature tests should use an explicitly isolated database:

```powershell
Set-Location 'D:\projects\pos\backend'
$env:APP_ENV = 'testing'
$env:DB_CONNECTION = 'sqlite'
$env:DB_DATABASE = ':memory:'
$env:DB_URL = ''
$env:CACHE_STORE = 'array'
$env:QUEUE_CONNECTION = 'sync'
$env:SESSION_DRIVER = 'array'

php artisan test --compact tests/Feature/Pos/PaymentRound7/PaymentMultiOperatorReadinessTest.php
php artisan test --compact tests/Feature/Pos/PaymentCorrectnessRound6Test.php tests/Feature/Pos/PaymentRound7/PaymentMultiOperatorReadinessTest.php
php artisan test --compact
php vendor/bin/phpstan analyse --no-progress
php vendor/bin/pint --test tests/Feature/Pos/PaymentRound7/PaymentMultiOperatorReadinessTest.php
```

Never point these regression commands at MySQL development or production. Do not run `migrate` or `seed` in the existing development database.

## 6. Approval-gated disposable MySQL concurrency protocol — NOT EXECUTED

**All three prerequisites are mandatory:** (1) an independently created and disposable MySQL test database/container, with no production/dev credentials or mounted volumes; (2) verified test-only connection configuration and target identity; (3) **explicit user authorization for all test writes**. Without any one of these, do not run the following stages.

1. **Environment isolation review:** provide the Leader/user the disposable DB hostname, port, database name, container or server ID, separate test credentials, connection mapping, and proof that it cannot resolve to the dev/prod DB. Inspect only test-safe metadata (e.g., `SELECT DATABASE(), @@hostname, @@port, @@version, @@transaction_isolation`). Do not copy or expose secrets.
2. **Authorized schema setup:** only after explicit write approval, create schema and synthetic orders inside that disposable instance using an independent test configuration. Never point an app instance to the development DB; never use `migrate:fresh` on existing data.
3. **True two-connection barrier:** start **two independent PHP workers/HTTP clients** with separate MySQL connections and separately authenticated Kasir/Owner sessions, synchronized to dispatch settlement for one synthetic payable order at the same instant. Log request UUID, idempotency key, operator ID, timestamps, response status/body, and worker/database connection identifier in the disposable environment.
4. **Same-key race:** both clients submit the **same** UUID and tender. Check for one confirmed payment record and one paid order. Verify replay semantics or document any unexpected SQL deadlock, timeout, 409, 500, or duplicate; do not silently treat an error as success.
5. **Different-key race:** repeat with a fresh synthetic order and **different** UUIDs. Expect only one durable settlement, with the losing attempt rejected/reconciled. Confirm receipt points to that payment and check DB indexes and foreign-key integrity.
6. **Unknown response after commit:** using an explicitly authorized transport fault injector or controlled network proxy, sever a client's response **after commit** while retaining server-side trace. Client must reconcile via GET order and GET receipt; reattempt original key only as a controlled diagnostic. Count actual POSTs via server logs, not client-side assumptions.
7. **Browser/session/CSRF:** two independent browser profiles (not shared cookies) with valid login and CSRF tokens. Check missing/invalid CSRF requests are rejected without mutations; valid requests succeed; deactivated/Waiters/guest requests are rejected. Test reload, stale queue, receipt GET 500 then recovery and verify no involuntary second POST.
8. **Reporting/cleanup:** capture only synthetic transaction IDs, response headers/status, DB counts, timing and errors; never customer secrets. Delete disposable resources **only within the separately approved disposable environment**. Restore no development or production state because neither was touched.

**Current decision:** `MYSQL_CONCURRENCY=BLOCKED`, `NETWORK_COMMIT_TIMEOUT=BLOCKED`, `BROWSER_CSRF=BLOCKED`. This report is a testing handoff, **not** a production payment certification.