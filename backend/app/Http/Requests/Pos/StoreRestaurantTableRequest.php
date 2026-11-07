<?php

namespace App\Http\Requests\Pos;

use App\Enums\TableStatus;
use App\Models\RestaurantTable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRestaurantTableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return $this->tableRules(true);
    }

    /** @return array<string, mixed> */
    protected function tableRules(bool $creating): array
    {
        $table = $this->route('restaurantTable') ?? $this->route('table');
        $id = $table instanceof RestaurantTable ? $table->getKey() : $table;

        return [
            'code' => [$creating ? 'required' : 'sometimes', 'string', 'max:30', Rule::unique('tables', 'code')->ignore($id)],
            'name' => [$creating ? 'required' : 'sometimes', 'string', 'max:80'],
            'area' => ['sometimes', 'string', 'max:80'],
            'seats' => ['sometimes', 'integer', 'between:1,100'],
            'status' => ['sometimes', Rule::enum(TableStatus::class)],
            'qr_token' => ['prohibited'],
            'scans_today' => ['prohibited'],
            'current_order_id' => ['prohibited'],
        ];
    }
}
