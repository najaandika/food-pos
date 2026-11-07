<?php

namespace App\Http\Controllers\Pos;

use App\Http\Requests\Pos\StoreCategoryRequest;
use App\Http\Requests\Pos\UpdateCategoryRequest;
use App\Models\Category;
use App\Services\Pos\CategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CategoryController extends PosManagementController
{
    public function index(Request $request, CategoryService $service): JsonResponse
    {
        $this->authorizeManagement($request);
        $data = $request->validate(['per_page' => ['sometimes', 'integer', 'between:1,100']]);

        return response()->json($service->paginate((int) ($data['per_page'] ?? 20)));
    }

    public function store(StoreCategoryRequest $request, CategoryService $service): JsonResponse
    {
        $this->authorizeManagement($request);

        return response()->json($service->create($request->validated()), 201);
    }

    public function show(Request $request, Category $category): JsonResponse
    {
        $this->authorizeManagement($request);

        return response()->json($category);
    }

    public function update(UpdateCategoryRequest $request, Category $category, CategoryService $service): JsonResponse
    {
        $this->authorizeManagement($request);

        return response()->json($service->update($category, $request->validated()));
    }

    public function destroy(Request $request, Category $category, CategoryService $service): Response
    {
        $this->authorizeManagement($request);
        $service->delete($category);

        return response()->noContent();
    }
}
