<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreProduct;
use Illuminate\Http\JsonResponse;

class StoreController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $products = StoreProduct::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('price_cents')
            ->get();

        return response()->json(['data' => $products]);
    }
}
