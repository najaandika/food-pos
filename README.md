# Food POS — Laravel + React Inertia

Proyek menggunakan **monorepo dengan dua folder fisik**. Laravel menangani server, autentikasi, database, routes, dan halaman Inertia; React menangani UI, komponen, halaman Inertia, dan bundling Vite.

> Status: ini masih fondasi dari starter kit Laravel. Modul POS lama (Owner, Kasir, Waiters, QR Ordering, pembayaran, laporan) belum dipindahkan dari backup aplikasi Next.js.

Tahap 1 database POS sudah diimplementasikan berupa migrations, 8 Eloquent models
(termasuk User), dan 7 enums. Pemetaan Prisma, relasi, keamanan, serta panduan
MariaDB yang tidak menyentuh database lama ada di
[`backend/docs/POS_SCHEMA.md`](backend/docs/POS_SCHEMA.md).
Server lokal yang tersedia ternyata MySQL 8.4.3. Database pengembangan baru
`food_pos_laravel_dev` telah dibuat dan berhasil menjalankan migrations
Laravel, tanpa mengubah database legacy `pos`. Uji MariaDB asli belum
dilakukan; tes otomatis tetap menggunakan SQLite `in-memory`.

## Struktur

```text
pos/
├── backend/                 # Laravel 13 + Inertia server
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── public/
│   │   └── build/           # Output build frontend (diabaikan Git)
│   ├── resources/views/     # Template Blade root Inertia
│   ├── routes/
│   ├── storage/
│   ├── composer.json
│   └── artisan
├── frontend/                # React 19 + Inertia 3 + TypeScript
│   ├── resources/
│   │   ├── css/
│   │   └── js/
│   │       ├── components/
│   │       ├── layouts/
│   │       └── pages/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── .github/workflows/tests.yml
```

## Menjalankan lokal (Windows / Laragon)

Prasyarat: PHP 8.3+, Composer, Node.js 22+.

Buka terminal pertama:

```powershell
cd D:\projects\pos\backend
php artisan serve
```

Buka terminal kedua:

```powershell
cd D:\projects\pos\frontend
npm run dev
```

Buka **http://127.0.0.1:8000**. Aplikasi tetap disajikan oleh Laravel; server Vite hanya menyediakan HMR saat development.

Jika dependencies belum terpasang, jalankan `composer install` di `backend` dan `npm install` di `frontend`. Salin `backend/.env.example` menjadi `backend/.env` dan jalankan `php artisan key:generate` jika diperlukan. File `frontend/.env.example` dapat disalin menjadi `frontend/.env` untuk menyamakan `APP_URL` Laravel saat HMR; jangan menyimpan kredensial database atau secrets di frontend.

## Build, test, dan deployment

```powershell
cd D:\projects\pos\frontend
npm run types:check
npm run check
npm run build
```

Build akan menghasilkan `backend/public/build/manifest.json` dan aset JS/CSS yang dibaca oleh Blade `backend/resources/views/app.blade.php`.

```powershell
cd D:\projects\pos\backend
php artisan test
```

Untuk deployment, atur document root Nginx/Apache ke **`backend/public`**, bukan ke akar repo atau `frontend`. Gunakan PHP-FPM untuk Laravel. Node/Vite development server tidak perlu dijalankan di production (tanpa SSR).

## Integrasi antar-folder

- `frontend/vite.config.ts` mengarah ke `backend/public` untuk output build serta file `hot`.
- Wayfinder menjalankan `php ../backend/artisan wayfinder:generate` dan menghasilkan route TypeScript dalam `frontend/resources/js`.
- Backend menggunakan `@vite` untuk entrypoint `resources/css/app.css` dan `resources/js/app.tsx`.
- **Inertia bukan REST API terpisah**: Laravel mengontrol route HTTP dan mengirim props/page ke React lewat Inertia. Endpoint API khusus tetap dapat dibuat jika nanti perlu mobile app atau integrasi eksternal.

## Pengamanan pekerjaan sebelumnya

Salinan Next.js terakhir sebelum beralih stack berada di `D:\projects\pos-nextjs-backup-20261104`. Cadangan Laravel sebelum pemisahan folder berada di `D:\projects\pos-laravel-before-split-20261104`. Keduanya berada **di luar repo**. Tidak ada database MariaDB lama yang dihapus atau dimigrasikan saat reorganisasi folder.
