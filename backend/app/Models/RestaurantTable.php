<?php

namespace App\Models;

use App\Enums\TableStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property TableStatus $status
 * @property-read Order|null $currentOrder
 */
class RestaurantTable extends Model
{
    protected $table = 'tables';

    protected $fillable = [
        'code', 'name', 'area', 'seats', 'status', 'qr_token',
        'scans_today', 'current_order_id',
    ];

    protected function casts(): array
    {
        return [
            'seats' => 'integer',
            'status' => TableStatus::class,
            'scans_today' => 'integer',
        ];
    }

    /** @return HasMany<Order, $this> */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'table_id');
    }

    // Intentionally no FK in the legacy schema: read-only association
    // for the indexed tables.current_order_id pointer.
    /** @return BelongsTo<Order, $this> */
    public function currentOrder(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'current_order_id');
    }
}
