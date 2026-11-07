<?php

namespace App\Services\Pos\Orders;

use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use Carbon\CarbonImmutable;

/** Serialize the existing order DTO without altering its field names or values. */
final class OrderPresenter
{
    /** @return array<string, mixed> */
    public function present(Order $order): array
    {
        $order->loadMissing(['table', 'items.menuItem', 'payments']);

        return [
            'id' => $order->id,
            'orderNumber' => $order->order_number,
            'tableCode' => $order->table?->code,
            'customerName' => $order->customer_name,
            'type' => $order->type->value,
            'source' => $order->source->value,
            'status' => $order->status->value,
            'guests' => $order->guests,
            'subtotal' => (float) $order->subtotal,
            'tax' => (float) $order->tax,
            'serviceCharge' => (float) $order->service_charge,
            'total' => (float) $order->total,
            'notes' => $order->notes,
            'paymentMethod' => $order->payments
                ->first(fn (Payment $payment) => $payment->status === PaymentStatus::Paid)?->method->value,
            'createdAt' => CarbonImmutable::parse($order->created_at, 'UTC')->toIso8601String(),
            'updatedAt' => CarbonImmutable::parse($order->updated_at, 'UTC')->toIso8601String(),
            'items' => $order->items->map(fn ($item): array => [
                'id' => $item->id,
                'menuItemId' => $item->menu_item_id,
                'name' => $item->menuItem->name ?? 'Menu #'.$item->menu_item_id,
                'quantity' => (int) $item->quantity,
                'unitPrice' => (float) $item->unit_price,
                'lineTotal' => round((float) $item->unit_price * (int) $item->quantity, 2),
                'notes' => $item->notes,
            ])->all(),
        ];
    }
}
