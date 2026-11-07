# Customer QR Ordering — Next.js to Laravel/Inertia migration

This restores the prior customer-facing design from the **read-only** backup
`D:\projects\pos-nextjs-backup-20261104\app\table\[code]` in the current
Laravel + React Inertia workspace.

## Guest entrypoint

- Public page: `GET /table/{token}`, where `token` is a 64-character case-sensitive table QR secret.
- Fetch catalog: `GET /api/qr/{token}/menu`.
- Submit order: `POST /api/qr/{token}/orders` (Laravel web CSRF required).
- The guest page passes catalog and CSRF through Inertia; the customer does **not** need a staff login.
- `/table/A01` (guessable display code) intentionally returns HTTP 404.
- Invalid, rotated, or inactive tokens fail closed. HTML sets private/no-store and no-referrer headers.

## How an Owner obtains the link

Open **Dashboard → Manajemen Meja**, select a saved table, and use **Copy QR Link** or
**Print Standee**. These controls call Owner-only `GET /pos/tables/{id}/qr-token`
and generate the `/table/{token}` URL. The printable QR is generated *locally*
using the npm `qrcode` package; the secret is not transmitted to an online QR
generator. Do not publish or log the QR bearer secret outside the physical table.

Do not use the old `/table/{code}` links. For a real phone, use an accessible
LAN/staging host rather than `127.0.0.1`, which always points to the phone itself.

## Reused customer interface

The original Hero, MenuCard, cart, category tabs, search and locale styles
are located under `frontend/resources/js/customer/`. Entry component:
`frontend/resources/js/pages/customer/order.tsx`.

- Menu is loaded from the backend catalog; no fake/demo menu items are used.
- Checkout submits product IDs, quantities, notes, name and guest count
  (capacity <= table seats); server owns prices/tax and validates availability.
- Shows server-issued QR order number and pending acknowledgement.
- Restores that receipt after refresh in this browser tab via sessionStorage.
- 422 validation errors, 409 occupied tables, and network errors are displayed.
- The code preserves the legacy page design with a scoped CSS module; dashboard
  theme, login and backend transaction calculation are unchanged.

## Deliberate limitations

- **Public real-time order polling is not available**. The confirmation page
  deliberately does not claim live updates, and does not call private order APIs.
- **Call Waiter** is hidden because there is no matching Laravel guest endpoint.
- Tax/service are displayed as zero, matching the present backend contract.
- Re-ordering at an occupied table is intentionally blocked by the backend.
- If checkout succeeds but the response is lost, retrying can return 409.
  Confirm with staff before trying again to prevent confusion.
- This is not a payment processor; staff acceptance, payment, cancellation and
  table release depend on the separate POS lifecycle work.

## Verification

`php artisan test --filter=PublicQrCustomerPageTest` — 3 tests / 13 assertions.

`php artisan test --filter=PublicQrOrderingTest` — 7 tests / 70 assertions.

`npm run types:check` and `npm run build` — successful.

Playwright tests were run with **mocked Inertia and checkout responses**
to avoid writing to the real operating database. They covered desktop/mobile
rendering, cart submission JSON and CSRF header, receipt reload, 422 and 409.

Production/staging still requires manual QR scan and real network/integration
testing with a safe test table before operational use.
