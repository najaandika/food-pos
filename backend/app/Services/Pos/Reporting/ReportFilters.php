<?php

namespace App\Services\Pos\Reporting;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * @phpstan-type ReportCriteria array{from:string,to:string,startUtc:string,endUtc:string,method:string,status:string,search:string,page:int,sort:string}
 */
final class ReportFilters
{
    public const TIMEZONE = 'Asia/Jakarta';

    private const MAX_DAYS = 366;

    /** @return ReportCriteria */
    public static function fromRequest(Request $request): array
    {
        $today = CarbonImmutable::now(self::TIMEZONE);
        $data = Validator::make($request->all(), [
            'from' => ['sometimes', 'required', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'required', 'date_format:Y-m-d'],
            'method' => ['sometimes', Rule::in(array_merge(['all'], array_column(PaymentMethod::cases(), 'value')))],
            'status' => ['sometimes', Rule::in(array_merge(['all'], array_column(PaymentStatus::cases(), 'value')))],
            // Laravel converts an empty query string (search=) into null.
            // An empty search means no filter, not an invalid report period.
            'search' => ['sometimes', 'nullable', 'string', 'max:120'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'sort' => ['sometimes', Rule::in(['recent', 'amount_desc', 'amount_asc'])],
        ])->validate();

        $from = CarbonImmutable::parse($data['from'] ?? $today->subDays(29)->toDateString(), self::TIMEZONE)->startOfDay();
        $to = CarbonImmutable::parse($data['to'] ?? $today->toDateString(), self::TIMEZONE)->startOfDay();
        $days = $from->diffInDays($to, false) + 1;

        if ($days < 1 || $days > self::MAX_DAYS) {
            throw ValidationException::withMessages([
                'from' => ['Rentang tanggal harus antara 1 dan 366 hari, dari tanggal awal ke akhir.'],
            ]);
        }

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'startUtc' => $from->setTimezone('UTC')->format('Y-m-d H:i:s'),
            'endUtc' => $to->addDay()->setTimezone('UTC')->format('Y-m-d H:i:s'),
            'method' => $data['method'] ?? 'all',
            'status' => $data['status'] ?? 'all',
            'search' => trim($data['search'] ?? ''),
            'page' => (int) ($data['page'] ?? 1),
            'sort' => $data['sort'] ?? 'recent',
        ];
    }
}
