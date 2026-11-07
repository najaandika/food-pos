<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\StorePublicQrOrderRequest;
use App\Services\Pos\PublicQrOrderingService;
use Illuminate\Http\JsonResponse;

class PublicQrOrderingController extends Controller
{
    public function menu(string $token, PublicQrOrderingService $service): JsonResponse
    {
        return response()->json($service->menu($token))
            ->header('Cache-Control', 'private, no-store');
    }

    public function store(string $token, StorePublicQrOrderRequest $request, PublicQrOrderingService $service): JsonResponse
    {
        return response()->json($service->placeOrder($token, $request->validated()), 201)
            ->header('Cache-Control', 'private, no-store');
    }
}
