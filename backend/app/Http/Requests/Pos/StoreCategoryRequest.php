<?php

namespace App\Http\Requests\Pos;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route-level owner RBAC will be registered by Agent A before exposure.
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return $this->categoryRules(true);
    }

    /** @return array<string, mixed> */
    protected function categoryRules(bool $creating): array
    {
        $category = $this->route('category');
        $id = $category instanceof Category ? $category->getKey() : $category;

        return [
            'name' => [$creating ? 'required' : 'sometimes', 'string', 'max:80', Rule::unique('categories', 'name')->ignore($id)],
            'sort_order' => ['sometimes', 'integer', 'between:0,2147483647'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
