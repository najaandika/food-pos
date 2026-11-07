<?php

namespace App\Http\Controllers\Pos;

use App\Enums\OrderStatus;
use App\Enums\TableStatus;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Order;
use App\Models\RestaurantTable;
use App\Services\Pos\ManualOrderService;
use App\Services\Pos\OrderManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class ServiceWorkspaceController extends Controller
{
    public function catalog(): JsonResponse
    {
        $categories = Category::query()
            ->where('is_active', true)
            ->with(['menuItems' => fn ($query) => $query->where('is_available', true)->orderBy('id')])
            ->orderBy('sort_order')->orderBy('id')->get();

        $dishes = $categories->flatMap(fn (Category $category) => $category->menuItems->map(fn ($item): array => [
            'id' => $item->id,
            'categoryId' => $category->id,
            'category' => $category->name,
            'name' => $item->name,
            'description' => $item->description ?? '',
            'price' => (float) $item->price,
            'imageUrl' => $item->image_url,
            'badge' => $item->badge,
            'isBestSeller' => (bool) $item->is_best_seller,
        ])
        )->values()->all();

        return response()->json(['data' => $dishes])
            ->header('Cache-Control', 'private, no-store');
    }

    public function tables(): JsonResponse
    {
        // Deliberately never expose qr_token to operational staff.
        $tables = RestaurantTable::query()->orderBy('code')->get([
            'id', 'code', 'name', 'area', 'seats',
            'status', 'current_order_id',
        ]);

        return response()->json(['data' => $tables])
            ->header('Cache-Control', 'private, no-store');
    }

    public function placeManual(Request $request, ManualOrderService $service, OrderManagementService $presenter): JsonResponse
    {
        $input = $request->validate([
            'type' => ['required', Rule::in(['dine_in', 'takeaway'])],
            'table_code' => ['required_if:type,dine_in', 'nullable', 'string', 'max:40', 'prohibited_if:type,takeaway'],
            'customer_name' => ['required', 'string', 'min:2', 'max:120'],
            'guests' => ['required', 'integer', 'between:1,99'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.menu_item_id' => ['required', 'integer', 'distinct:strict'],
            'items.*.quantity' => ['required', 'integer', 'between:1,20'],
            'items.*.notes' => ['nullable', 'string', 'max:500'],
            'status' => ['prohibited'],
            'source' => ['prohibited'],
            'total' => ['prohibited'],
            'subtotal' => ['prohibited'],
            'tax' => ['prohibited'],
            'service_charge' => ['prohibited'],
            'items.*.unit_price' => ['prohibited'],
        ]);

        $order = $service->place($input);

        return response()->json($presenter->present($order), 201)
            ->header('Cache-Control', 'private, no-store');
    }

    public function acknowledge(RestaurantTable $restaurantTable): JsonResponse
    {
        $table = DB::transaction(function () use ($restaurantTable): RestaurantTable {
            $table = RestaurantTable::query()->whereKey($restaurantTable->id)->lockForUpdate()->firstOrFail();
            if ($table->getRawOriginal('status') !== TableStatus::NeedWaiter->value) {
                throw new ConflictHttpException('Panggilan sudah ditangani atau status meja berubah.');
            }

            $current = $table->current_order_id
                ? Order::query()->find($table->current_order_id)
                : null;

            $newStatus = match ($current?->status) {
                OrderStatus::Preparing, OrderStatus::Accepted => TableStatus::Preparing,
                OrderStatus::Ready => TableStatus::Ready,
                OrderStatus::Served, OrderStatus::WaitingPayment => TableStatus::WaitingPayment,
                OrderStatus::Paid, OrderStatus::Cancelled => TableStatus::Available,
                default => $current ? TableStatus::Occupied : TableStatus::Available,
            };

            $table->update([
                'status' => $newStatus,
                'current_order_id' => $newStatus === TableStatus::Available
                    ? null
                    : $table->current_order_id,
            ]);

            return $table->refresh();
        }, 3);

        return response()->json([
            'id' => $table->id,
            'status' => $table->status->value,
        ])->header('Cache-Control', 'private, no-store');
    }
}
