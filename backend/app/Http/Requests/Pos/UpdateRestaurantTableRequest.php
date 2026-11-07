<?php

namespace App\Http\Requests\Pos;

class UpdateRestaurantTableRequest extends StoreRestaurantTableRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return $this->tableRules(false);
    }
}
