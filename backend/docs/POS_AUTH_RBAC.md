# Food POS Tahap 2 — Authentication & RBAC

## Backend yang diimplementasikan

- Registrasi publik Fortify dinonaktifkan. GET dan POST `/register` harus 404.
- Passkey login Fortify dinonaktifkan sementara supaya hanya password dan 2FA
  yang digunakan untuk login staf. Reset password dan 2FA tetap aktif.
- `Fortify::authenticateUsing` menolak password login untuk `is_active=false`.
- Global middleware `EnsureActiveStaff` dipasang di middleware `web`.
  Middleware membaca ulang akun setiap request, lalu logout + invalidasi sesi
  jika akun dinonaktifkan/dihapus. Perubahan role berlaku sejak request berikutnya.
- Alias `staff.role` memvalidasi role staf: `owner`, `kasir`, `waiters`.
  `/dashboard` saat ini bisa diakses ketiganya (dengan `auth` + `verified`).
- `UserPolicy` membatasi manajemen akun staf kepada Owner yang aktif.
  Owner tidak boleh menghapus akunnya sendiri atau akun Owner lain melalui
  operasi `delete` staf.
- `User` tetap menjaga `role` agar tidak bisa dimass-assign lewat input
  umum, serta menggunakan cast `Role` dan boolean `is_active`.

## Membuat Owner pertama

Hanya jalankan di terminal interaktif yang aman, dan **pastikan aplikasi
terhubung ke DB baru `food_pos_laravel_dev`**, bukan database lama.

```powershell
cd D:\projects\pos\backend
php artisan pos:bootstrap-owner
```

Command menanyakan nama, email, password rahasia, dan konfirmasi password
tanpa menaruh password pada command-line, source code, atau log. Password
minimal 12 karakter, huruf besar/kecil, angka, dan simbol; disimpan sebagai
hash lewat Eloquent. Email Owner pertama langsung diverifikasi.
Command menolak eksekusi `--no-interaction`, dan menolak pembuatan Owner
tambahan jika sudah ada akun dengan `role=owner` (termasuk yang nonaktif).
Gunakan alur manajemen staf tersendiri untuk akun setelah bootstrap.

**Belum ada akun Owner nyata yang dibuat dalam tahap ini.** Tes bootstrap
menggunakan SQLite `:memory:` sementara, tidak membuat akun pada MySQL dev.

## Kontrak integrasi route Agent C / Agent Integrator

Tambahkan route sesuai kebutuhan modul berikut (di backend).
Jangan mengganti bootstrap.php atau route milik agent lain tanpa koordinasi.

```php
Route::middleware(['auth', 'verified', 'staff.role:owner'])->group(function () {
    // Owner: staff management, menus, categories, table settings, reports
});

Route::middleware(['auth', 'verified', 'staff.role:kasir,owner'])->group(function () {
    // Cashier: checkout, payments, cashier order updates
});

Route::middleware(['auth', 'verified', 'staff.role:waiters,kasir,owner'])->group(function () {
    // Operational order / waiters routes (adjust according to business rules)
});
```

Untuk operasi staf, controller harus memanggil policy:
`Gate::authorize('create', User::class)`,
`Gate::authorize('update', $staff)`, dan seterusnya.
Jangan hanya menyembunyikan tombol pada frontend; role harus dicek di backend.
Terapkan policy/controller terpisah untuk transaksi dan master data,
serta cek kepemilikan QR order publik di tahap berikutnya.

## Kontrak integrasi frontend Agent B

**File React tidak diubah dalam Tahap 2.** Karena `/register` sudah tidak
ada, Agent B **harus** menghapus import `register` serta link Sign Up di
`frontend/resources/js/pages/auth/login.tsx`.
Sembunyikan komponen passkey login dan pengelolaan passkey pada security
page sampai fitur itu secara eksplisit diaktifkan kembali. Integrasi
route/codegen Wayfinder harus disinkronkan setelah file UI diperbarui.

`HandleInertiaRequests` sudah membagikan `auth.user` dari Laravel.
Frontend dapat membaca `user.role` sebagai string `owner|kasir|waiters`;
jangan menjadikan pengecekan di React sebagai satu-satunya kontrol akses.

## Pengujian backend

```powershell
cd D:\projects\pos\backend
php artisan test --filter='(StaffAccessTest|BootstrapOwnerTest|RegistrationTest|AuthenticationTest)'
php artisan test
php vendor/bin/pint --test
php vendor/bin/phpstan analyse --no-progress
```

Tes menggunakan konfigurasi `phpunit.xml` dengan SQLite `:memory:`.
Jangan jalankan `migrate:fresh` atau perintah destruktif pada database lain.
Tidak ada commit, push, atau perubahan ke database lain dalam tahap ini.
