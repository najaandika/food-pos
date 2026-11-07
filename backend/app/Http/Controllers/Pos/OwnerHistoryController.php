<?php

namespace App\Http\Controllers\Pos;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class OwnerHistoryController extends Controller
{
    /**
     * Verified database history only. Never derive paid revenue from the
     * dashboard's in-browser snapshot or an order's paid status alone.
     *
     * This endpoint is protected by auth, verified and staff.role:owner.
     */
    public function __invoke(): JsonResponse
    {
        $timezone = 'Asia/Jakarta';
        $today = CarbonImmutable::now($timezone)->startOfDay();
        $from = $today->subDays(29);
        $until = $today->addDay();
        $startUtc = $from->setTimezone('UTC')->format('Y-m-d H:i:s');
        $endUtc = $until->setTimezone('UTC')->format('Y-m-d H:i:s');

        $daily = [];
        for ($offset = 0; $offset < 30; $offset++) {
            $date = $from->addDays($offset)->toDateString();
            $daily[$date] = ['date' => $date, 'cents' => 0, 'payments' => 0];
        }

        // Successful payments are the only recognized source of revenue.
        // Use each payment amount, not the order total: partial payments are
        // possible, and payment rows must not be double-counted by joins.
        $totalPayments = 0;
        $totalRevenueCents = 0;
        foreach (
            DB::table('payments')
                ->where('status', PaymentStatus::Paid->value)
                ->whereNotNull('paid_at')
                ->where('paid_at', '>=', $startUtc)
                ->where('paid_at', '<', $endUtc)
                ->select(['amount', 'paid_at'])
                ->cursor() as $payment
        ) {
            $amountCents = (int) round((float) $payment->amount * 100);
            if ($amountCents <= 0) {
                continue;
            }

            $date = CarbonImmutable::parse($payment->paid_at, 'UTC')
                ->setTimezone($timezone)
                ->toDateString();

            if (! isset($daily[$date])) {
                continue;
            }

            $daily[$date]['cents'] += $amountCents;
            $daily[$date]['payments']++;
            $totalPayments++;
            $totalRevenueCents += $amountCents;
        }

        // 7 weekdays x 12 two-hour slots over the same 30-day period.
        // The heatmap is order creation activity, NOT payment timestamps.
        $heatmap = [];
        for ($weekday = 1; $weekday <= 7; $weekday++) {
            for ($hour = 0; $hour < 24; $hour += 2) {
                $heatmap["{$weekday}:{$hour}"] = [
                    'weekday' => $weekday,
                    'hour' => $hour,
                    'count' => 0,
                ];
            }
        }

        $totalOrders = 0;
        $maxActivity = 0;
        foreach (
            DB::table('orders')
                ->where('created_at', '>=', $startUtc)
                ->where('created_at', '<', $endUtc)
                ->select('created_at')
                ->cursor() as $order
        ) {
            $created = CarbonImmutable::parse($order->created_at, 'UTC')
                ->setTimezone($timezone);
            $weekday = $created->isoWeekday();
            $hour = intdiv($created->hour, 2) * 2;
            $key = "{$weekday}:{$hour}";
            $heatmap[$key]['count']++;
            $maxActivity = max($maxActivity, $heatmap[$key]['count']);
            $totalOrders++;
        }

        return response()->json([
            'source' => 'database',
            'timezone' => $timezone,
            'from' => $from->toDateString(),
            'to' => $today->toDateString(),
            'days' => 30,
            'totals' => [
                'revenue' => $totalRevenueCents / 100,
                'payments' => $totalPayments,
                'orders' => $totalOrders,
            ],
            'dailyRevenue' => array_values(array_map(
                fn (array $day): array => [
                    'date' => $day['date'],
                    'amount' => $day['cents'] / 100,
                    'payments' => $day['payments'],
                ],
                $daily,
            )),
            'orderActivity' => array_values($heatmap),
            'maxActivity' => $maxActivity,
        ]);
    }
}
