<?php

namespace App\Http\Controllers\Pos;

use App\Http\Requests\Pos\StoreMenuItemRequest;
use App\Http\Requests\Pos\UpdateMenuItemRequest;
use App\Models\MenuItem;
use App\Services\Pos\MenuItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class MenuItemController extends PosManagementController
{
    public function index(Request $request, MenuItemService $service): JsonResponse
    {
        $this->authorizeManagement($request);
        $data = $request->validate([
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'category_id' => ['sometimes', 'integer', Rule::exists('categories', 'id')],
        ]);

        return response()->json($service->paginate(
            (int) ($data['per_page'] ?? 20),
            isset($data['category_id']) ? (int) $data['category_id'] : null,
        ));
    }

    public function store(StoreMenuItemRequest $request, MenuItemService $service): JsonResponse
    {
        $this->authorizeManagement($request);

        return response()->json($service->create($request->validated()), 201);
    }

    public function show(Request $request, MenuItem $menuItem): JsonResponse
    {
        $this->authorizeManagement($request);

        return response()->json($menuItem->load('category'));
    }

    public function update(UpdateMenuItemRequest $request, MenuItem $menuItem, MenuItemService $service): JsonResponse
    {
        $this->authorizeManagement($request);

        return response()->json($service->update($menuItem, $request->validated()));
    }

    public function destroy(Request $request, MenuItem $menuItem, MenuItemService $service): Response
    {
        $this->authorizeManagement($request);
        $service->delete($menuItem);

        return response()->noContent();
    }
}
