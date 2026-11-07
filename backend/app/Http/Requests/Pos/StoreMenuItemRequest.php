<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMenuItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return $this->menuRules(true);
    }

    /** @return array<string, mixed> */
    protected function menuRules(bool $creating): array
    {
        $presence = $creating ? 'required' : 'sometimes';
        $money = 'regex:/^\d{1,10}(?:\.\d{1,2})?$/';

        return [
            'category_id' => [$presence, 'integer', Rule::exists('categories', 'id')],
            'name' => [$presence, 'string', 'max:140'],
            'description' => ['sometimes', 'nullable', 'string'],
            'price' => [$presence, $money],
            'old_price' => ['sometimes', 'nullable', $money],
            'image_url' => [
                'sometimes', 'nullable', 'string', 'max:500',
                // Public Storage images are same-origin relative URLs; also permit HTTPS/HTTP photo URLs.
                'regex:~^(?:/storage/[A-Za-z0-9/_\\.-]+|https?://[^\\s]+)$~i',
            ],
            'is_available' => ['sometimes', 'boolean'],
            'is_best_seller' => ['sometimes', 'boolean'],
            'badge' => ['sometimes', 'nullable', 'string', 'max:40'],
        ];
    }
}
