# Food POS — Tahap 5: Backend QR Ordering (5 November 2026)

Status: implemented (backend only), verified with SQLite in-memory feature tests. **No guest-facing React page is included yet.**

## Scope and ownership

Files in this stage:

- `routes/qr.php` (new) and one `require` line in `routes/web.php`.
- `app/Http/Controllers/Pos/PublicQrOrderingController.php` (new).
- `app/Http/Requests/Pos/StorePublicQrOrderRequest.php` (new).
- `app/Services/Pos/PublicQrOrderingService.php` (new).
- `tests/Feature/Pos/PublicQrOrderingTest.php` (new).

No existing model, migration, Owner/Kasir/Waiters dashboard, BoardUI component, login, or frontend file was changed.

## HTTP contract (JSON)

Two endpoints registered through the Laravel **web** middleware (session and CSRF):

### GET `/api/qr/{token}/menu` — guest catalog

The `{token}` must be exactly 64 alphanumeric characters generated for the table through Owner-only table management. It is a secret bearer capability. The response contains **no secret token**.

Response HTTP 200 example:

```json
{
  "table": {"code": "A01", "name": "Meja A01", "area": "Indoor", "seats": 4, "status": "available"},
  "can_order": true,
  "categories": [
    {"id": 1, "name": "Makanan", "items": [
      {"id": 5, "name": "Nasi Goreng", "description": null, "price": "12500.75",
       "image_url": null, "is_best_seller": false, "badge": null}
    ]}
  ]
}
```

Only active categories and available menu items appear. Empty categories are omitted. Invalid/rotated and inactive-table tokens return 404. An occupied table may display the catalog, but `can_order` is `false`. The response sets `Cache-Control: no-store, private`.

### POST `/api/qr/{token}/orders` — create a pending guest order

Requires the normal Laravel web CSRF token/cookie. The QR token itself does not exempt the POST from CSRF. For a same-origin browser fetch, send `Content-Type: application/json`, `Accept: application/json`, and the Laravel XSRF token.

Payload example:

```json
{
  "customer_name": "Pengunjung",
  "guests": 2,
  "notes": "Meja dekat jendela",
  "items": [
    {"menu_item_id": 5, "quantity": 2, "notes": "Tidak pedas"},
    {"menu_item_id": 9, "quantity": 1}
  ]
}
```

HTTP 201 returns `order_number` (prefixed `QR-`, ULID), `status: pending`, sanitized table fields, `subtotal`, `tax`, `service_charge`, `total`, and line items including **server-side** `unit_price` and `line_total`.

Amounts are decimal strings (e.g. `"32501.60"`). Prices are read from current database catalog and calculated in integer cents, not from user-supplied prices or floating-point arithmetic.

Business restrictions:

- Only `available` tables can create a new order; no active order or `current_order_id` may exist. The table is locked in a database transaction before checking and creating the order.
- Successful creation sets `tables.status = occupied` and `tables.current_order_id` to the order ID.
- Guest count must not exceed table seats; items must be unique, available, and belong to an active category.
- Items 1–30 lines, quantity 1–20/line, notes limited; cannot supply `total`, `tax`, `table_id`, `order_number`, `status`, `source`, `unit_price`, etc.
- 422 = validation error; 404 = invalid/revoked/inactive QR; 409 = unavailable/occupied table; 429 = rate limit.
- Rate limit: 60 menu GETs/minute, 10 order POSTs/minute, via Laravel throttle.
- Endpoints do not expose QR secrets in JSON.

### Example for frontend integration

```ts
// The token comes from the printed QR URL, never from a public list of tables.
const menu = await fetch(`/api/qr/${encodeURIComponent(token)}/menu`, {
  headers: { Accept: 'application/json' },
  credentials: 'same-origin',
}).then((r) => r.json());

// For POST, use the Laravel web CSRF token in the normal same-origin
// Inertia/Laravel integration. Do not disable ValidateCsrfToken.
```

## Deliberate limitations before production

1. Tax and service charge are temporarily **0.00** because verified restaurant pricing settings are not implemented. Configure and test a tax/service policy before real transactions.
2. No public guest page/QR scanner UI yet. These endpoints are the backend contract; QR graphic printing, guest UI, order status and staff acceptance are next work.
3. This stage only **creates** pending orders and reserves a table. The staff-side order status transitions, payment collection, cancellation and releasing the table must be implemented together before running a real restaurant.
4. Guest requests are limited by IP, not by customer identity. Production launch needs additional operational abuse protection, QR placement/access policy and careful log redaction of QR bearer URLs.
5. No scan counter/day-reset logic, tax engine, refund, payment idempotency or additional-order merging yet. If a POST succeeded but the response is lost, retry returns 409 rather than creating a duplicate; build an order confirmation/recovery flow before production.
6. QR secrets appear in request URLs; treat them like credentials and avoid exposing them through client analytics, third-party referrers, public logs and cache.
7. SQLite in-memory tests cover behavior and validation; MySQL concurrency locking and end-to-end client flow require separate controlled staging verification.

## Safe verification

From `backend`:

```powershell
php artisan route:list --path=api/qr -v
php artisan test --filter=PublicQrOrderingTest
php artisan test
php vendor/bin/pint --test app/Services/Pos/PublicQrOrderingService.php app/Http/Requests/Pos/StorePublicQrOrderRequest.php app/Http/Controllers/Pos/PublicQrOrderingController.php routes/qr.php tests/Feature/Pos/PublicQrOrderingTest.php
php vendor/bin/phpstan analyse --no-progress
```

Tests use `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:` configured in `phpunit.xml`. Do **not** run `migrate:fresh` on `food_pos_laravel_dev` or the legacy `pos` database.
