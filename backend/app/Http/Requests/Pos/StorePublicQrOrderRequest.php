<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class StorePublicQrOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The QR token is the guest's authorization, verified in the service.
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'min:2', 'max:120'],
            'guests' => ['required', 'integer', 'between:1,99'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.menu_item_id' => ['required', 'integer', 'distinct:strict'],
            'items.*.quantity' => ['required', 'integer', 'between:1,20'],
            'items.*.notes' => ['nullable', 'string', 'max:500'],
            // Never allow guests to supply prices, state, or table ownership.
            'table_id' => ['prohibited'],
            'order_number' => ['prohibited'],
            'type' => ['prohibited'],
            'status' => ['prohibited'],
            'source' => ['prohibited'],
            'subtotal' => ['prohibited'],
            'tax' => ['prohibited'],
            'service_charge' => ['prohibited'],
            'total' => ['prohibited'],
            'items.*.unit_price' => ['prohibited'],
            'items.*.order_id' => ['prohibited'],
        ];
    }
}
