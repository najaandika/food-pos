<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\StoreMenuImageRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;

class MenuImageUploadController extends Controller
{
    public function __invoke(StoreMenuImageRequest $request): JsonResponse
    {
        $file = $request->file('image');

        if (! $file instanceof UploadedFile) {
            return response()->json(['message' => 'Berkas gambar tidak valid.'], 422);
        }

        // Laravel generates an unguessable filename; never trust a client path.
        $path = $file->store('menu', 'public');

        if (! is_string($path) || $path === '') {
            return response()->json([
                'message' => 'Gagal menyimpan gambar menu.',
            ], 500);
        }

        // Matches StoreMenuItemRequest's image_url contract.
        return response()->json([
            'image_url' => '/storage/'.$path,
        ], 201);
    }
}
