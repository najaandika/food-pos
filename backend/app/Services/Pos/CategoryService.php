<?php

namespace App\Services\Pos;

use App\Models\Category;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class CategoryService
{
    /** @return LengthAwarePaginator<int, Category> */
    public function paginate(int $perPage = 20): LengthAwarePaginator
    {
        return Category::query()
            ->orderByDesc('is_active')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->paginate($perPage);
    }

    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): Category
    {
        return Category::create($attributes)->refresh();
    }

    /** @param array<string, mixed> $attributes */
    public function update(Category $category, array $attributes): Category
    {
        $category->update($attributes);

        return $category->refresh();
    }

    public function delete(Category $category): void
    {
        DB::transaction(function () use ($category): void {
            $category = Category::query()->whereKey($category->getKey())->lockForUpdate()->firstOrFail();

            // menu_items.category_id is ON DELETE RESTRICT, never cascade.
            if ($category->menuItems()->exists()) {
                throw new ConflictHttpException('Kategori masih memiliki menu. Pindahkan atau hapus menu terlebih dahulu.');
            }

            $category->delete();
        });
    }
}
