<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class RotateTableQrTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        // The server generates QR secrets; callers may never choose one.
        return ['qr_token' => ['prohibited']];
    }
}
