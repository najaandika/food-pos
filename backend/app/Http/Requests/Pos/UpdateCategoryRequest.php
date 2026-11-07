<?php

namespace App\Http\Requests\Pos;

class UpdateCategoryRequest extends StoreCategoryRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return $this->categoryRules(false);
    }
}
