# Food POS — Tahap 4 Backend Catalog & QR Token

Status: implemented and routed for active verified Owner (5 November 2026).

## Files

- Form Requests: app/Http/Requests/Pos/Store*Request.php, Update*Request.php, and RotateTableQrTokenRequest.php.
- Services: app/Services/Pos/CategoryService.php, MenuItemService.php, RestaurantTableService.php.
- Controllers: app/Http/Controllers/Pos/CategoryController.php, MenuItemController.php, RestaurantTableController.php, PosManagementController.php.
- Feature tests: tests/Feature/Pos/PosCatalogManagementTest.php and PosMasterDataRoutingTest.php.
- Production routes: routes/pos.php, required by routes/web.php.

Agent A completed RBAC and authorized the middleware combination: auth, verified, staff.role:owner. All 17 production routes in routes/pos.php are now protected by these middleware; the QR rotation endpoint additionally uses throttle:10,1. Controllers still independently enforce active Owner, and Form Requests require an authenticated user. The global web middleware EnsureActiveStaff revokes inactive sessions. Keep implicit route parameters named {category}, {menuItem}, and {restaurantTable} for request unique validation.

## Controller contract (JSON for future Inertia integration)

| Controller | Methods | Result |
| --- | --- | --- |
| CategoryController | index, store, show, update, destroy | paginated collection, 201, model, updated model, 204 |
| MenuItemController | index, store, show, update, destroy | paginated collection, 201, model with category, updated model, 204 |
| RestaurantTableController | index, store, show, update, destroy | paginated collection, 201, model, updated model, 204 |
| RestaurantTableController | qrToken, rotateQrToken | JSON table_id + qr_token |

- index defaults to per_page=20, maximum 100; MenuItemController@index accepts category_id.
- Validation errors return 422; referenced/active-order delete and status conflicts return 409; inactive/non-owner returns 403.
- Table list/detail/create/update responses **omit qr_token**. Only the explicit owner-only QR methods return that bearer secret.
- Table create generates a cryptographically random 64-character token via Str::random; the unique DB index protects collisions. Rotation invalidates the old token.
- RestaurantTableService::resolveQrToken enforces case-sensitive equality even with case-insensitive SQL collation. No public scanner endpoint is added.

## Schema lifecycle and boundaries

- Category delete blocks while menu items exist (menu_items.category_id ON DELETE RESTRICT).
- Menu deletion blocks when order items refer to it (order_items.menu_item_id ON DELETE RESTRICT); disable availability instead.
- Table deletion blocks when current_order_id is present or a related order is nonterminal. Historical orders survive deletion with orders.table_id=NULL (SET NULL).
- Table status cannot be edited while an active order exists. The later transaction service owns lifecycle changes.
- Management input cannot set qr_token, scans_today, or current_order_id. The last column is indexed but intentionally lacks a foreign key.
- Money validation follows DECIMAL(12,2); Eloquent casts remain decimal:2 string values.
- No migrations, auth, frontend, or database connection were modified in Tahap 4. After Agent A coordination, routes/web.php received one require statement for routes/pos.php; its existing auth/dashboard routes remain unchanged.

## Tests

From backend directory:

    php artisan test --filter=PosCatalogManagementTest
    php vendor/bin/pint --test app/Services/Pos app/Http/Requests/Pos app/Http/Controllers/Pos tests/Feature/Pos/PosCatalogManagementTest.php
    php vendor/bin/phpstan analyse --no-progress

phpunit.xml pins DB_CONNECTION=sqlite and DB_DATABASE=:memory:. Feature tests now exercise real production routes and actual owner RBAC, including guest, Kasir, Waiters, and unverified Owner denial. Never run migrate:fresh on an existing local database.

## Outstanding integration

- Agent A RBAC integration and route registration: complete; routes are owner-only.
- Inertia frontend can integrate the existing JSON endpoints and owner-only QR retrieval.
- Public QR scanning, scan counters/day reset, ordering lifecycle, and payment handling are outside Tahap 4.
