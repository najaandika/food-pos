<?php

namespace App\Http\Requests\Pos;

class UpdateMenuItemRequest extends StoreMenuItemRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return $this->menuRules(false);
    }
}
