<?php

namespace App\Services\Pos\Reporting;

use Carbon\CarbonImmutable;

/** @phpstan-import-type ReportCriteria from ReportFilters */
final class ReportSummary
{
    public function __construct(private readonly ReportQueries $queries) {}

    /**
     * Revenue uses paid_at; order counts use created_at. Search, status, sort
     * and pagination affect transaction rows, not these historical totals.
     *
     * @param  ReportCriteria  $filters
     * @return array{
     *   summary: array{revenue:float,successfulPayments:int,paidOrders:int,ordersCreated:int,itemsSold:int,averagePaidOrder:float|int},
     *   series: list<array{date:string,revenue:float,orders:int,payments:int}>,
     *   methods: list<array{method:string,amount:float,count:int}>,
     *   categories: list<array{name:string,quantity:int}>,
     *   channels: array{qr:int,manual:int},
     *   serviceTypes: array{dine_in:int,takeaway:int}
     * }
     */
    public function build(array $filters): array
    {
        $from = CarbonImmutable::parse($filters['from'], ReportFilters::TIMEZONE);
        $to = CarbonImmutable::parse($filters['to'], ReportFilters::TIMEZONE);

        $series = [];
        for ($date = $from; $date->lte($to); $date = $date->addDay()) {
            $key = $date->toDateString();
            $series[$key] = ['date' => $key, 'revenueCents' => 0, 'orders' => 0, 'payments' => 0];
        }

        $revenueCents = 0;
        $successfulCount = 0;
        $methods = [];
        foreach ($this->queries->successfulPayments($filters)->select(['amount', 'paid_at', 'method'])->cursor() as $payment) {
            $cents = (int) round((float) $payment->amount * 100);
            if ($cents <= 0) {
                continue;
            }
            $date = CarbonImmutable::parse($payment->paid_at, 'UTC')->setTimezone(ReportFilters::TIMEZONE)->toDateString();
            if (! isset($series[$date])) {
                continue;
            }
            $series[$date]['revenueCents'] += $cents;
            $series[$date]['payments']++;
            $revenueCents += $cents;
            $successfulCount++;
            $method = (string) $payment->method;
            $methods[$method] ??= ['method' => $method, 'cents' => 0, 'count' => 0];
            $methods[$method]['cents'] += $cents;
            $methods[$method]['count']++;
        }

        $orderCount = 0;
        $channels = ['qr' => 0, 'manual' => 0];
        $serviceTypes = ['dine_in' => 0, 'takeaway' => 0];
        foreach ($this->queries->createdOrders($filters)->cursor() as $order) {
            $date = CarbonImmutable::parse($order->created_at, 'UTC')->setTimezone(ReportFilters::TIMEZONE)->toDateString();
            if (! isset($series[$date])) {
                continue;
            }
            $series[$date]['orders']++;
            $orderCount++;
            if (isset($channels[$order->source])) {
                $channels[$order->source]++;
            }
            if (isset($serviceTypes[$order->type])) {
                $serviceTypes[$order->type]++;
            }
        }

        $categoryRows = $this->queries->soldCategories($filters)->get();
        $itemsSold = (int) $categoryRows->sum('quantity');
        $paidOrders = (int) $this->queries->successfulPayments($filters)->distinct()->count('order_id');

        return [
            'summary' => [
                'revenue' => $revenueCents / 100,
                'successfulPayments' => $successfulCount,
                'paidOrders' => $paidOrders,
                'ordersCreated' => $orderCount,
                'itemsSold' => $itemsSold,
                'averagePaidOrder' => $paidOrders ? $revenueCents / 100 / $paidOrders : 0,
            ],
            'series' => array_values(array_map(
                fn (array $item): array => [
                    'date' => $item['date'],
                    'revenue' => $item['revenueCents'] / 100,
                    'orders' => $item['orders'],
                    'payments' => $item['payments'],
                ],
                $series,
            )),
            'methods' => array_values(array_map(
                fn (array $item): array => [
                    'method' => $item['method'],
                    'amount' => $item['cents'] / 100,
                    'count' => $item['count'],
                ],
                $methods,
            )),
            'categories' => array_values($categoryRows->map(fn (object $item): array => [
                'name' => (string) $item->name,
                'quantity' => (int) $item->quantity,
            ])->all()),
            'channels' => $channels,
            'serviceTypes' => $serviceTypes,
        ];
    }
}
