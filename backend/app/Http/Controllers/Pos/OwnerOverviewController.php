<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Services\Pos\Reporting\OwnerOverviewQuery;
use Illuminate\Http\JsonResponse;

class OwnerOverviewController extends Controller
{
    public function __construct(private readonly OwnerOverviewQuery $overview) {}

    public function __invoke(): JsonResponse
    {
        return response()->json($this->overview->snapshot())
            ->header('Cache-Control', 'private, no-store, max-age=0');
    }
}
