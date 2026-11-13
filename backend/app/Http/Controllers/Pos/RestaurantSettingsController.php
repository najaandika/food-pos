<?php

namespace App\Http\Controllers\Pos;

use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class RestaurantSettingsController extends PosManagementController
{
    private const KEY = 'pos.restaurant_settings';

    public function show(Request $request): JsonResponse
    {
        $this->authorizeManagement($request);
        $setting = AppSetting::query()->where('key', self::KEY)->first();

        if ($setting === null) {
            return $this->privateJson(self::defaults());
        }

        return $this->privateJson($setting->value);
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorizeManagement($request);

        $data = $request->validate([
            'profile' => ['required', 'array:cafeName,phone,address'],
            'profile.cafeName' => ['required', 'string', 'min:2', 'max:120'],
            'profile.phone' => ['nullable', 'string', 'max:40'],
            'profile.address' => ['nullable', 'string', 'max:500'],
            'tax' => ['required', 'array:taxRate,serviceRate,currency'],
            'tax.taxRate' => ['required', 'numeric', 'between:0,100'],
            'tax.serviceRate' => ['required', 'numeric', 'between:0,100'],
            'tax.currency' => ['required', 'in:IDR,USD'],
            'payments' => ['required', 'array:cash,qris,transfer'],
            'payments.cash' => ['required', 'boolean'],
            'payments.qris' => ['required', 'boolean'],
            'payments.transfer' => ['required', 'boolean'],
            'qrOptions' => ['required', 'array:guestOrdering,customerName,callWaiter,autoAcceptQr'],
            'qrOptions.guestOrdering' => ['required', 'boolean'],
            'qrOptions.customerName' => ['required', 'boolean'],
            'qrOptions.callWaiter' => ['required', 'boolean'],
            'qrOptions.autoAcceptQr' => ['required', 'boolean'],
            'hours' => ['required', 'array', 'min:1', 'max:7'],
            'hours.*' => ['required', 'array:label,open,close,isOpen'],
            'hours.*.label' => ['required', 'string', 'max:70'],
            'hours.*.open' => ['required', 'date_format:H:i'],
            'hours.*.close' => ['required', 'date_format:H:i'],
            'hours.*.isOpen' => ['required', 'boolean'],
        ]);

        if (! in_array(true, array_values($data['payments']), true)
            && ! in_array(1, array_values($data['payments']), true)) {
            throw ValidationException::withMessages([
                'payments' => 'Minimal satu metode pembayaran harus aktif.',
            ]);
        }

        // ConvertEmptyStringsToNull middleware preserves blank optional contact fields as null.
        // The frontend contract consistently uses empty strings.
        $data['profile']['phone'] = $data['profile']['phone'] ?? '';
        $data['profile']['address'] = $data['profile']['address'] ?? '';

        $setting = AppSetting::query()->updateOrCreate(
            ['key' => self::KEY],
            ['value' => $data]
        );

        return $this->privateJson($setting->value);
    }

    /** @return array<string, mixed> */
    private static function defaults(): array
    {
        return [
            'profile' => ['cafeName' => 'Food POS', 'phone' => '', 'address' => ''],
            'tax' => ['taxRate' => 0, 'serviceRate' => 0, 'currency' => 'IDR'],
            'payments' => ['cash' => true, 'qris' => false, 'transfer' => false],
            'qrOptions' => [
                'guestOrdering' => false,
                'customerName' => true,
                'callWaiter' => false,
                'autoAcceptQr' => false,
            ],
            'hours' => [
                ['label' => 'Monday - Thursday', 'open' => '09:00', 'close' => '17:00', 'isOpen' => false],
                ['label' => 'Friday', 'open' => '09:00', 'close' => '17:00', 'isOpen' => false],
                ['label' => 'Saturday - Sunday', 'open' => '09:00', 'close' => '17:00', 'isOpen' => false],
            ],
        ];
    }

    /** @param array<string, mixed> $data */
    private function privateJson(array $data): JsonResponse
    {
        return response()->json($data)
            ->header('Cache-Control', 'private, no-store, max-age=0');
    }
}
