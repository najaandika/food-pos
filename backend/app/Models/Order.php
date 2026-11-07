<?php

namespace App\Models;

use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property OrderType $type
 * @property OrderSource $source
 * @property OrderStatus $status
 * @property-read RestaurantTable|null $table
 */
class Order extends Model
{
    protected $fillable = [
        'order_number', 'table_id', 'customer_name', 'type',
        'status', 'source', 'guests', 'subtotal', 'tax',
        'service_charge', 'total', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'type' => OrderType::class,
            'status' => OrderStatus::class,
            'source' => OrderSource::class,
            'guests' => 'integer',
            'subtotal' => 'decimal:2',
            'tax' => 'decimal:2',
            'service_charge' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<RestaurantTable, $this> */
    public function table(): BelongsTo
    {
        return $this->belongsTo(RestaurantTable::class, 'table_id');
    }

    /** @return HasMany<OrderItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
