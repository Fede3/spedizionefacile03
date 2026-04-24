<?php

/**
 * ROTTE PARTNER PRO
 *
 * Include:
 *   - Bulk upload CSV (validate + create-orders)
 *   - Gestione chiavi API (CRUD)
 *   - Dashboard analytics
 *   - API v1 esposte tramite chiave (X-Pro-Api-Key)
 *
 * AUTH:
 *   - /api/pro/*       → auth:sanctum + check isPro() lato controller
 *   - /api/v1/*        → middleware 'pro.api' (chiave API + scope)
 */

use App\Http\Controllers\Pro\BulkUploadController;
use App\Http\Controllers\Pro\ProAnalyticsController;
use App\Http\Controllers\Pro\ProApiKeyController;
use App\Http\Controllers\Pro\ProShipmentApiController;
use Illuminate\Support\Facades\Route;

/* ===== AREA PRO (auth Sanctum SPA) ===== */

Route::middleware('auth:sanctum')->prefix('pro')->group(function () {

    // Bulk upload CSV
    Route::middleware(['throttle:10,1'])->group(function () {
        Route::post('bulk-upload/validate', [BulkUploadController::class, 'validateRows']);
        Route::post('bulk-upload/create-orders', [BulkUploadController::class, 'createOrders']);
    });

    // Gestione chiavi API
    Route::get('api-keys', [ProApiKeyController::class, 'index']);
    Route::middleware(['throttle:10,1'])->post('api-keys', [ProApiKeyController::class, 'store']);
    Route::delete('api-keys/{id}', [ProApiKeyController::class, 'destroy']);

    // Analytics dashboard
    Route::get('analytics/dashboard', [ProAnalyticsController::class, 'dashboard']);
});

/* ===== API V1 (chiave Pro X-Pro-Api-Key) ===== */

Route::prefix('v1')->group(function () {
    Route::middleware('pro.api:shipments:read')
        ->get('shipments', [ProShipmentApiController::class, 'index']);

    Route::middleware('pro.api:shipments:write')
        ->post('shipments', [ProShipmentApiController::class, 'store']);

    Route::middleware('pro.api:tracking:read')
        ->get('shipments/{id}/tracking', [ProShipmentApiController::class, 'tracking']);
});
