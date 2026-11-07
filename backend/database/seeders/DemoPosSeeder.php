<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Enums\TableStatus;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\RestaurantTable;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class DemoPosSeeder extends Seeder
{
    private const TIMEZONE = 'Asia/Jakarta';

    /** 35 days of history plus an operational queue for the current day. */
    private const HISTORY_DAYS = 35;

    /** @var array<string, list<array{string, int, string, bool, string|null, bool}>> */
    private const CATALOG = [
        'Makanan Utama' => [
            ['Nasi Goreng Kampung', 32000, 'Nasi goreng dengan telur, ayam, dan kerupuk.', true, 'Favorit', true],
            ['Nasi Ayam Geprek', 30000, 'Ayam geprek sambal bawang dengan nasi hangat.', true, null, true],
            ['Mie Goreng Jawa', 29000, 'Mie goreng dengan sayuran dan telur.', false, null, true],
            ['Soto Ayam', 33000, 'Soto ayam bening dengan nasi dan jeruk nipis.', false, null, true],
            ['Ayam Bakar Madu', 42000, 'Ayam bakar dengan nasi, lalapan, dan sambal.', false, 'Populer', true],
            ['Beef Teriyaki Rice', 48000, 'Nasi dengan irisan daging sapi saus teriyaki.', false, null, true],
        ],
        'Kopi & Minuman' => [
            ['Es Kopi Susu Gula Aren', 25000, 'Espresso, susu segar, dan gula aren.', true, 'Best Seller', true],
            ['Americano', 22000, 'Kopi hitam berbasis espresso.', false, null, true],
            ['Cappuccino', 28000, 'Espresso dan susu dengan lapisan busa lembut.', false, null, true],
            ['Matcha Latte', 30000, 'Matcha dan susu segar.', false, 'Baru', true],
            ['Es Teh Lemon', 18000, 'Teh dingin dengan perasan lemon.', false, null, true],
            ['Jus Alpukat', 27000, 'Alpukat segar dengan susu.', false, null, true],
        ],
        'Camilan' => [
            ['Kentang Goreng', 23000, 'Kentang goreng renyah dengan saus.', true, null, true],
            ['Pisang Goreng Keju', 25000, 'Pisang goreng dengan keju dan susu.', false, null, true],
            ['Tahu Crispy', 19000, 'Tahu goreng renyah dan sambal kecap.', false, null, true],
            ['Chicken Wings', 35000, 'Sayap ayam berbumbu dengan saus spesial.', false, 'Populer', true],
        ],
        'Dessert' => [
            ['Brownies Cokelat', 28000, 'Brownies lembut dengan cokelat premium.', true, null, true],
            ['Pancake Madu', 32000, 'Pancake hangat dengan madu.', false, null, true],
            ['Ice Cream Vanilla', 20000, 'Es krim vanilla dengan topping pilihan.', false, null, true],
            ['Cheesecake Strawberry', 36000, 'Cheesecake dengan saus stroberi.', false, 'Habis', false],
        ],
    ];

    /** @var list<array{string, string, string, bool}> */
    private const STAFF = [
        ['Owner Demo', 'owner.demo@example.test', 'owner', true],
        ['Kasir Demo', 'kasir.demo@example.test', 'kasir', true],
        ['Waiters Demo', 'waiters.demo@example.test', 'waiters', true],
        ['Kasir Sore', 'kasir.sore.demo@example.test', 'kasir', true],
        ['Waiters Sore', 'waiters.sore.demo@example.test', 'waiters', true],
        ['Staff Nonaktif Demo', 'nonaktif.demo@example.test', 'waiters', false],
    ];

    /** @var list<string> */
    private const TODAY_STATUSES = [
        'pending', 'pending', 'accepted', 'accepted', 'preparing', 'preparing',
        'ready', 'ready', 'served', 'served', 'waiting_payment', 'waiting_payment',
        'paid', 'paid', 'paid', 'paid', 'paid', 'cancelled',
    ];

    /**
     * Additive and repeatable: only creates records marked by demo accounts,
     * DEMO-T table codes, or DEMO- order numbers. Never truncates existing data.
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('DemoPosSeeder only runs in local or testing environments.');
        }

        DB::transaction(function (): void {
            $now = CarbonImmutable::now(self::TIMEZONE);

            $this->seedStaff($now);
            $menu = $this->seedCatalog();
            $tables = $this->seedTables();

            // Historical paid orders power the last-30-day dashboard, report,
            // category sales and customer activity heatmap.
            for ($daysAgo = self::HISTORY_DAYS; $daysAgo >= 1; $daysAgo--) {
                $count = 4 + ($daysAgo % 3);
                for ($index = 0; $index < $count; $index++) {
                    $created = $now->startOfDay()->subDays($daysAgo)
                        ->setTime(9 + ($index * 2), 5 + (($daysAgo + $index) % 5) * 9);
                    $status = $index === $count - 1 && $daysAgo % 4 === 0
                        ? 'cancelled'
                        : 'paid';

                    $this->seedOrder(
                        $created,
                        $index,
                        $daysAgo,
                        $status,
                        $menu,
                        $tables,
                        null,
                    );
                }
            }

            // A practical live queue spanning every operational status.
            // Table-bound active orders use distinct tables.
            $tableCursor = 0;
            $activeTables = [];
            foreach (self::TODAY_STATUSES as $index => $status) {
                $created = $now->subMinutes(($index + 1) * 7);
                $type = $index % 4 === 0 ? 'takeaway' : 'dine_in';
                $active = ! in_array($status, ['paid', 'cancelled'], true);
                $table = null;

                if ($type === 'dine_in') {
                    $table = $active
                        ? $tables[$tableCursor++]
                        : $tables[($index + 3) % 12];
                }

                $order = $this->seedOrder(
                    $created,
                    $index,
                    0,
                    $status,
                    $menu,
                    $tables,
                    $table,
                );

                if ($active && $table !== null) {
                    $activeTables[$table->id] = [$order, $status];
                }
            }

            foreach ($activeTables as $tableId => [$orderId, $status]) {
                $table = RestaurantTable::query()->findOrFail($tableId);

                // If staff have attached a different order to this demo table,
                // do not overwrite live work by running this seeder again.
                if ($table->current_order_id !== null && (int) $table->current_order_id !== $orderId) {
                    continue;
                }

                $table->update([
                    'current_order_id' => $orderId,
                    'status' => match ($status) {
                        'preparing' => TableStatus::Preparing,
                        'ready' => TableStatus::Ready,
                        'waiting_payment' => TableStatus::WaitingPayment,
                        default => TableStatus::Occupied,
                    },
                ]);
            }
        });

        $this->command?->info('POS demo data ready: staff, categories, menu, tables/QR, 35-day history, live orders and payments.');
    }

    private function seedStaff(CarbonImmutable $now): void
    {
        $password = (string) config('pos.demo_password');

        foreach (self::STAFF as [$name, $email, $role, $active]) {
            if (User::query()->where('email', $email)->exists()) {
                continue; // Preserve passwords and changes on a repeated seed.
            }

            $user = User::query()->create([
                'name' => $name,
                'email' => $email,
                'password' => $password, // User casts this field as hashed.
            ]);

            $user->forceFill([
                'role' => Role::from($role),
                'is_active' => $active,
                'email_verified_at' => $now->setTimezone('UTC'),
            ])->save();
        }
    }

    /** @return list<array{id: int, price: int}> */
    private function seedCatalog(): array
    {
        $menu = [];
        $sortOrder = 0;

        foreach (self::CATALOG as $categoryName => $items) {
            $category = Category::query()->firstOrCreate(
                ['name' => $categoryName],
                ['sort_order' => $sortOrder++, 'is_active' => true],
            );

            foreach ($items as [$name, $price, $description, $bestSeller, $badge, $available]) {
                $imagePath = 'menu/'.Str::slug($name).'.webp';
                $source = database_path('seeders/assets/'.$imagePath);

                if (! is_file($source)) {
                    throw new RuntimeException('Demo menu image is missing: '.$source);
                }

                $disk = Storage::disk('public');
                if (! $disk->exists($imagePath)) {
                    $contents = file_get_contents($source);
                    if ($contents === false || ! $disk->put($imagePath, $contents)) {
                        throw new RuntimeException('Failed to publish demo menu image: '.$imagePath);
                    }
                }

                $imageUrl = '/storage/'.$imagePath;

                $item = MenuItem::query()->firstOrCreate(
                    ['category_id' => $category->id, 'name' => $name],
                    [
                        'description' => $description,
                        'price' => $price,
                        'image_url' => $imageUrl,
                        'is_best_seller' => $bestSeller,
                        'is_available' => $available,
                        'badge' => $badge,
                    ],
                );

                // Existing demo rows have no images yet. Populate only blanks
                // so manual uploads and later image edits are never overwritten.
                if (blank($item->image_url)) {
                    $item->forceFill(['image_url' => $imageUrl])->save();
                }

                // Historical orders use the menu's actual stored price;
                // repeating the seeder does not silently modify menu prices.
                if ($item->is_available) {
                    $menu[] = ['id' => $item->id, 'price' => (int) $item->price];
                }
            }
        }

        return $menu;
    }

    /** @return list<RestaurantTable> */
    private function seedTables(): array
    {
        $tables = [];

        for ($i = 0; $i < 14; $i++) {
            $area = $i < 8 ? 'Indoor' : ($i < 12 ? 'Outdoor' : 'Teras');
            $status = match ($i) {
                12 => TableStatus::NeedWaiter,
                13 => TableStatus::Inactive,
                default => TableStatus::Available,
            };

            $tables[] = RestaurantTable::query()->firstOrCreate(
                ['code' => 'DEMO-T'.str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT)],
                [
                    'name' => 'Meja '.str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT),
                    'area' => $area,
                    'seats' => $i % 5 === 0 ? 6 : ($i % 3 === 0 ? 4 : 2),
                    'status' => $status,
                    'qr_token' => Str::random(64),
                    'scans_today' => $i < 12 ? ($i * 3) % 9 : 0,
                ],
            );
        }

        return $tables;
    }

    /**
     * @param  list<array{id: int, price: int}>  $menu
     * @param  list<RestaurantTable>  $tables
     */
    private function seedOrder(
        CarbonImmutable $createdLocal,
        int $index,
        int $daysAgo,
        string $status,
        array $menu,
        array $tables,
        ?RestaurantTable $selectedTable,
    ): int {
        $number = 'DEMO-'.$createdLocal->format('ymd').'-'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);
        $existing = DB::table('orders')->where('order_number', $number)->value('id');
        if ($existing !== null) {
            return (int) $existing;
        }

        $type = $index % 4 === 0 ? 'takeaway' : 'dine_in';
        $table = $type === 'takeaway'
            ? null
            : ($selectedTable ?? $tables[($daysAgo * 5 + $index) % 12]);
        $source = $type === 'dine_in' && ($index + $daysAgo) % 3 !== 0 ? 'qr' : 'manual';
        $customers = [
            'Andi Pratama', 'Dina Putri', 'Budi Santoso', 'Siti Rahma',
            'Rizky Maulana', 'Nadia Safitri', 'Fajar Nugroho', 'Ayu Lestari',
            'Dimas Saputra', 'Citra Maharani', 'Raka Wijaya', 'Nabila Zahra',
        ];

        $createdUtc = $createdLocal->setTimezone('UTC')->format('Y-m-d H:i:s');
        $lines = [];
        $subtotal = 0;
        $itemCount = 2 + (($index + $daysAgo) % 3);
        $offset = ($daysAgo * 7 + $index * 3) % count($menu);
        for ($i = 0; $i < $itemCount; $i++) {
            $item = $menu[($offset + $i * 5) % count($menu)];
            $quantity = 1 + (($index + $daysAgo + $i) % 2);
            $subtotal += $item['price'] * $quantity;
            $lines[] = [
                'menu_item_id' => $item['id'],
                'quantity' => $quantity,
                'unit_price' => $item['price'],
                'notes' => $i === 0 && $index % 7 === 0 ? 'Sedikit pedas.' : null,
            ];
        }

        $orderId = DB::table('orders')->insertGetId([
            'order_number' => $number,
            'table_id' => $table?->id,
            'customer_name' => $customers[($index + $daysAgo) % count($customers)],
            'type' => $type,
            'status' => $status,
            'source' => $source,
            'guests' => $table === null ? 1 : min(1 + (($index + $daysAgo) % 3), $table->seats),
            'subtotal' => $subtotal,
            'tax' => 0, // Actual QR checkout currently has no tax/service policy.
            'service_charge' => 0,
            'total' => $subtotal,
            'notes' => $index % 5 === 0 ? 'Tolong pisahkan sambal dan saus.' : null,
            'created_at' => $createdUtc,
            'updated_at' => $createdUtc,
        ]);

        foreach ($lines as $line) {
            DB::table('order_items')->insert([
                'order_id' => $orderId,
                ...$line,
                'created_at' => $createdUtc,
            ]);
        }

        if (in_array($status, ['paid', 'waiting_payment', 'cancelled'], true)) {
            $paymentStatus = match ($status) {
                'paid' => 'paid',
                'waiting_payment' => 'pending',
                default => 'failed',
            };
            $method = ['cash', 'qris', 'transfer'][($index + $daysAgo) % 3];

            DB::table('payments')->insert([
                'order_id' => $orderId,
                'method' => $method,
                'amount' => $subtotal,
                'status' => $paymentStatus,
                'paid_at' => $status === 'paid'
                    ? $createdLocal->addMinutes($daysAgo === 0 ? 3 : 35)
                        ->setTimezone('UTC')->format('Y-m-d H:i:s')
                    : null,
                'created_at' => $createdUtc,
            ]);
        }

        return $orderId;
    }
}
