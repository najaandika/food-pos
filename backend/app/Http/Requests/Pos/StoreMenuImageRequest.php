<?php

namespace App\Http\Requests\Pos;

use App\Enums\Role;
use Illuminate\Foundation\Http\FormRequest;

class StoreMenuImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->role === Role::Owner
            && $user->is_active;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'image' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ];
    }
}
