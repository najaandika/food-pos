<?php

namespace App\Services\Pos\Reporting;

use Carbon\CarbonImmutable;

/**
 * @phpstan-type TransactionRow array{id:int,orderNumber:string,customerName:string,tableCode:string|null,source:string,method:string,status:string,amount:float,at:string,dateBasis:string}
 */
final class ReportTransactionRow
{
    public const CSV_HEADERS = [
        'Order', 'Customer', 'Table', 'Method', 'Status',
        'Amount (IDR)', 'Timestamp (WIB)', 'Date basis',
    ];

    /**
     * Query Builder rows do not use Eloquent casts, so method/status are strings.
     *
     * @return TransactionRow
     */
    public function fromQuery(object $payment): array
    {
        /** @var object{id: int|string, order_number: string, customer_name: string, table_code: string|null, source: string, method: string, status: string, amount: int|float|string, paid_at: string|null, created_at: string} $payment */
        $at = $payment->paid_at ?: $payment->created_at;

        return [
            'id' => (int) $payment->id,
            'orderNumber' => $payment->order_number,
            'customerName' => $payment->customer_name,
            'tableCode' => $payment->table_code,
            'source' => $payment->source,
            'method' => $payment->method,
            'status' => $payment->status,
            'amount' => (float) $payment->amount,
            'at' => CarbonImmutable::parse($at, 'UTC')->toIso8601String(),
            'dateBasis' => $payment->paid_at ? 'paid_at' : 'created_at',
        ];
    }

    /**
     * @param  TransactionRow  $payment
     * @return list<string>
     */
    public function csv(array $payment): array
    {
        return [
            self::safeCell($payment['orderNumber']),
            self::safeCell($payment['customerName']),
            self::safeCell($payment['tableCode'] ?? ''),
            $payment['method'],
            $payment['status'],
            number_format($payment['amount'], 2, '.', ''),
            CarbonImmutable::parse($payment['at'])->setTimezone(ReportFilters::TIMEZONE)->format('Y-m-d H:i:s'),
            $payment['dateBasis'],
        ];
    }

    private static function safeCell(string $value): string
    {
        // Prefix spreadsheet formula characters; prevent CSV formula injection.
        return preg_match('/^[=+@\\-]/', $value) ? "'".$value : $value;
    }
}
