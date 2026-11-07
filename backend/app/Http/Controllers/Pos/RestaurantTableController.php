<?php

namespace App\Http\Controllers\Pos;

use App\Http\Requests\Pos\RotateTableQrTokenRequest;
use App\Http\Requests\Pos\StoreRestaurantTableRequest;
use App\Http\Requests\Pos\UpdateRestaurantTableRequest;
use App\Models\RestaurantTable;
use App\Services\Pos\RestaurantTableService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class RestaurantTableController extends PosManagementController
{
    public function index(Request $request, RestaurantTableService $service): JsonResponse
    {
        $this->authorizeManagement($request);
        $data = $request->validate(['per_page' => ['sometimes', 'integer', 'between:1,100']]);

        $tables = $service->paginate((int) ($data['per_page'] ?? 20))
            ->through(fn (RestaurantTable $table) => $table->makeHidden('qr_token'));

        return response()->json($tables);
    }

    public function store(StoreRestaurantTableRequest $request, RestaurantTableService $service): JsonResponse
    {
        $this->authorizeManagement($request);

        return response()->json($service->create($request->validated())->makeHidden('qr_token'), 201);
    }

    public function show(Request $request, RestaurantTable $restaurantTable): JsonResponse
    {
        $this->authorizeManagement($request);

        return response()->json($restaurantTable->makeHidden('qr_token'));
    }

    public function update(
        UpdateRestaurantTableRequest $request,
        RestaurantTable $restaurantTable,
        RestaurantTableService $service,
    ): JsonResponse {
        $this->authorizeManagement($request);

        return response()->json($service->update($restaurantTable, $request->validated())->makeHidden('qr_token'));
    }

    public function destroy(Request $request, RestaurantTable $restaurantTable, RestaurantTableService $service): Response
    {
        $this->authorizeManagement($request);
        $service->delete($restaurantTable);

        return response()->noContent();
    }

    public function qrToken(Request $request, RestaurantTable $restaurantTable): JsonResponse
    {
        $this->authorizeManagement($request);

        return response()->json(['table_id' => $restaurantTable->getKey(), 'qr_token' => $restaurantTable->qr_token]);
    }

    public function rotateQrToken(
        RotateTableQrTokenRequest $request,
        RestaurantTable $restaurantTable,
        RestaurantTableService $service,
    ): JsonResponse {
        $this->authorizeManagement($request);

        return response()->json([
            'table_id' => $restaurantTable->getKey(),
            'qr_token' => $service->rotateQrToken($restaurantTable),
        ]);
    }
}
