<?php

namespace App\Http\Controllers\Pos;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Services\Pos\OrderManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderManagementController extends Controller
{
    public function index(Request $request, OrderManagementService $service): JsonResponse
    {
        $input = $request->validate(['per_page' => ['sometimes', 'integer', 'between:1,100']]);

        $orders = $service->paginate((int) ($input['per_page'] ?? 100))
            ->through(fn (Order $order): array => $service->present($order));

        return response()->json($orders)->header('Cache-Control', 'private, no-store');
    }

    public function show(Order $order, OrderManagementService $service): JsonResponse
    {
        return response()->json($service->present($order))
            ->header('Cache-Control', 'private, no-store');
    }

    public function updateStatus(Request $request, Order $order, OrderManagementService $service): JsonResponse
    {
        $input = $request->validate([
            'status' => ['required', Rule::enum(OrderStatus::class)],
        ]);

        /** @var User $staff */
        $staff = $request->user();
        $updated = $service->updateStatus($order, OrderStatus::from($input['status']), $staff);

        return response()->json($service->present($updated))
            ->header('Cache-Control', 'private, no-store');
    }

    public function recordCashPayment(Request $request, Order $order, OrderManagementService $service): JsonResponse
    {
        // Noncash gateway confirmation is intentionally not implemented.
        // Never turn a customer's QRIS/transfer selection into a "paid" flag.
        $input = $request->validate([
            'method' => ['required', 'in:cash'],
            'received_amount' => ['required', 'string', 'regex:/^\d{1,10}(?:\.\d{1,2})?$/D'],
            'expected_total' => ['sometimes', 'required', 'string', 'regex:/^\d{1,10}(?:\.\d{1,2})?$/D'],
            'idempotency_key' => ['sometimes', 'required', 'uuid'],
        ]);

        /** @var User $staff */
        $staff = $request->user();
        $settlement = $service->recordCashPayment(
            $order,
            $staff,
            $input['received_amount'],
            $input['expected_total'] ?? null,
            $input['idempotency_key'] ?? null,
        );

        return response()->json([
            ...$service->present($settlement['order']),
            'payment' => $service->confirmedReceipt($settlement['order'])['payment'],
            'receiptUrl' => route('pos.cashier.receipt', ['order' => $order->id], false),
            'idempotent' => $settlement['idempotent'],
        ])
            ->header('Cache-Control', 'private, no-store');
    }

    public function cashierIndex(Request $request, OrderManagementService $service): JsonResponse
    {
        $input = $request->validate([
            'per_page' => ['sometimes', 'integer', 'between:1,50'],
            'filter' => ['sometimes', 'in:all,ready,qr,takeaway'],
            // Laravel converts search= into null; an empty search is valid.
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
        ]);

        $orders = $service->cashierQueue(
            (int) ($input['per_page'] ?? 25),
            $input['filter'] ?? 'all',
            trim($input['search'] ?? ''),
        )->through(fn (Order $order): array => $service->present($order));

        return response()->json([
            ...$orders->toArray(),
            'stats' => $service->cashierStats(),
        ])->header('Cache-Control', 'private, no-store');
    }

    public function cashierShow(Order $order, OrderManagementService $service): JsonResponse
    {
        abort_if($service::isDemoOrder($order) && ! $service::demoModeEnabled(), 404);

        return response()->json([
            ...$service->present($order),
            'discount' => '0.00',
        ])->header('Cache-Control', 'private, no-store');
    }

    public function cashierReceipt(Order $order, OrderManagementService $service): JsonResponse
    {
        abort_if($service::isDemoOrder($order) && ! $service::demoModeEnabled(), 404);

        $receipt = $service->confirmedReceipt($order);
        abort_if($receipt === null, 404, 'Struk lunas hanya tersedia setelah pembayaran terverifikasi.');

        return response()->json($receipt)->header('Cache-Control', 'private, no-store');
    }
}
