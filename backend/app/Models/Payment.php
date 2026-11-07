<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property PaymentMethod $method
 * @property PaymentStatus $status
 * @property Carbon|null $paid_at
 */
class Payment extends Model
{
    // Prisma only has created_at on this table, not updated_at.
    public $timestamps = false;

    protected $fillable = [
        'order_id', 'method', 'amount', 'status', 'paid_at',
        'cash_received', 'cash_change', 'idempotency_key',
    ];

    protected function casts(): array
    {
        return [
            'method' => PaymentMethod::class,
            'status' => PaymentStatus::class,
            'amount' => 'decimal:2',
            'cash_received' => 'decimal:2',
            'cash_change' => 'decimal:2',
            'paid_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
