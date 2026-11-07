# Food POS — Tahap 1: Skema database & Eloquent

Dokumen ini berasal dari audit kode Next.js lama pada
`D:\projects\pos-nextjs-backup-20261104\prisma\schema.prisma` dan ketiga file
`prisma/migrations/*/migration.sql`.

## Entitas

| Prisma | Laravel model | Database table | Relasi penting |
| --- | --- | --- | --- |
| User | `App\Models\User` | `users` | akun staf; role owner/kasir/waiters |
| Category | `App\Models\Category` | `categories` | hasMany MenuItem |
| Table | `App\Models\RestaurantTable` | `tables` | hasMany Order; belongsTo currentOrder (logical) |
| MenuItem | `App\Models\MenuItem` | `menu_items` | belongsTo Category; hasMany OrderItem |
| Order | `App\Models\Order` | `orders` | belongsTo RestaurantTable; hasMany OrderItem/Payment |
| OrderItem | `App\Models\OrderItem` | `order_items` | belongsTo Order & MenuItem |
| Payment | `App\Models\Payment` | `payments` | belongsTo Order |
| AppSetting | `App\Models\AppSetting` | `app_settings` | kolom value JSON |

Tujuh backed enums PHP di `app/Enums/` mencerminkan nilai enum Prisma:
`Role`, `TableStatus`, `OrderType`, `OrderStatus`, `OrderSource`,
`PaymentMethod`, `PaymentStatus`.

Nilai uang tetap `DECIMAL(12,2)`. Cast `decimal:2` pada Eloquent
mengembalikan string terformat, bukan float; lakukan perhitungan transaksi
dengan presisi desimal, jangan mengandalkan float dari browser.

## Constraints & lifecycle

- `orders.table_id` -> `tables.id`: `ON DELETE SET NULL`
- `menu_items.category_id` -> `categories.id`: `ON DELETE RESTRICT`
- `order_items.order_id` -> `orders.id`: `ON DELETE CASCADE`
- `order_items.menu_item_id` -> `menu_items.id`: `ON DELETE RESTRICT`
- `payments.order_id` -> `orders.id`: `ON DELETE RESTRICT`
- Seluruh FK tersebut memakai `ON UPDATE CASCADE`, sesuai SQL Prisma lama.
- `tables.current_order_id` memiliki index **tanpa FK** di skema lama. Relasi
  Eloquent `currentOrder()` hanya menyajikan lookup logis. Validasi siklus
  hidup pesanan aktif harus dilakukan di service transaksi.
- `categories` tidak memiliki timestamps. `order_items` dan `payments`
  hanya memiliki `created_at`.
- Index Prisma dari migrasi pertama muncul lagi di migrasi tambahan. Laravel
  menggabungkan index yang sama menjadi satu definisi, supaya tidak duplikat.

## Perbedaan user & keamanan

Skema Prisma menyimpan `users.password_hash`; Laravel Fortify sudah
memakai `users.password` untuk autentikasi, reset password, passkey, dan
2FA. Demi tidak merusak fitur auth bawaan, kolom baru **tetap** `password`.
Jika kelak mengimpor user lama, perlu pemetaan `password_hash -> password`
secara eksplisit dan audit algoritme hash.

Laravel tetap menyimpan `email_verified_at`, `remember_token`, dan
kolom autentikasi tambahan. Ini normal dan **tidak identik** dengan Prisma.

Migrasi role menambahkan enum `owner|kasir|waiters` dan `is_active` pada
tabel user. Default role `waiters` diberikan agar alur registrasi starter
kit Laravel tetap berfungsi, namun **belum ada middleware RBAC** yang
membatasi akses POS, sehingga jangan deploy sebelum registrasi publik,
aktivasi staf, dan akses per role diamankan pada Tahap 2.

## MariaDB: pengaturan lokal aman

**Pembaruan 4 November 2026:** server lokal yang berhasil terhubung adalah
**MySQL 8.4.3**, bukan MariaDB. Database baru `food_pos_laravel_dev` dibuat
setelah memastikan nama tersebut belum digunakan, dan 7 migrations berhasil
dijalankan di sana. Skema berisi 17 tabel dan 6 foreign keys. Database
lama `pos` tidak digunakan untuk migrations.

`backend/.env` sekarang mengarah ke `DB_CONNECTION=mysql` dan
`DB_DATABASE=food_pos_laravel_dev`. Konfigurasi SQLite sebelumnya disimpan
sebagai `.env.before_mysql_stage1` (diabaikan oleh Git), dan file SQLite lama
tetap ada. Migrasi pada server MariaDB yang sesungguhnya **belum diuji**.

Contoh nilai DB ada di `backend/.env.mariadb.example`. Setelah nanti
menyalakan MariaDB lokal, **buat database kosong BARU dengan nama unik**
(`food_pos_laravel_dev`) dan pastikan nama ini tidak pernah dipakai aplikasi
Next.js lama. Lalu pindahkan hanya variabel DB_* dari contoh ke
`backend/.env` dan jalankan migrasi **hanya** pada database baru tersebut.
Jangan gunakan perintah `migrate:fresh` terhadap database lama.

## Tes terisolasi

```powershell
cd D:\projects\pos\backend
php artisan test --filter=PosSchemaTest
php artisan test
php vendor/bin/pint --test
php vendor/bin/phpstan analyse --no-progress
```

Konfigurasi `phpunit.xml` memakai `DB_CONNECTION=sqlite` dan
`DB_DATABASE=:memory:`. Tes memeriksa tabel, indeks, enum, harga,
relasi Eloquent, JSON, serta perilaku penghapusan FK tanpa memengaruhi
database proyek yang sudah ada.

## Belum termasuk Tahap 1

Belum ada porting data/konten, seeder menu & meja, logika harga/pajak,
QR validation, transaksi payment idempotent, controllers dan tampilan
POS Owner/Kasir/Waiters. Itu akan dikerjakan pada tahap berikutnya setelah
DB pengembangan terisolasi tersedia dan aman.
