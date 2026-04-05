<?php

/**
 * ROTTE ORDINI E SPEDIZIONI
 *
 * Include: CRUD ordini, annullamento, fattura, rimborso, esecuzione spedizione
 * (pickup, bordero, documenti), spedizioni configurate, coupon, BRT gestione.
 */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\BrtController;
use App\Http\Controllers\RefundController;
use App\Http\Controllers\SavedShipmentController;
use App\Http\Controllers\ShipmentExecutionController;
use App\Http\Middleware\CheckAdmin;

Route::group(['middleware' => ['auth:sanctum']], function () {

    /* ===== INDIRIZZI DI SPEDIZIONE ===== */

    Route::apiResource('addresses', \App\Http\Controllers\AddressController::class);
    Route::apiResource('user-addresses', \App\Http\Controllers\UserAddressController::class);

    /* ===== ORDINI ===== */

    Route::apiResource('orders', OrderController::class);
    Route::middleware(['throttle:3,1'])->post('orders/{order}/cancel', [OrderController::class, 'cancel']);
    Route::get('orders/{order}/invoice', [OrderController::class, 'invoice']);
    Route::middleware(['throttle:5,1'])->get('orders/{order}/refund-eligibility', [RefundController::class, 'checkRefundEligibility']);
    Route::middleware(['throttle:10,1'])->post('orders/{order}/add-package', [OrderController::class, 'addPackage']);
    Route::middleware(['throttle:5,1'])->post('create-direct-order', [OrderController::class, 'createDirectOrder']);

    /* ===== COUPON ===== */

    Route::post('calculate-coupon', [CouponController::class, 'calculateCoupon']);

    /* ===== SPEDIZIONI CONFIGURATE ===== */

    Route::get('saved-shipments', [SavedShipmentController::class, 'index']);
    Route::post('saved-shipments', [SavedShipmentController::class, 'store']);
    Route::put('saved-shipments/{id}', [SavedShipmentController::class, 'update']);
    Route::delete('saved-shipments/{id}', [SavedShipmentController::class, 'destroy']);
    Route::post('saved-shipments/add-to-cart', [SavedShipmentController::class, 'addToCart']);

    /* ===== BRT GESTIONE SPEDIZIONI ===== */

    Route::middleware([CheckAdmin::class])->group(function () {
        Route::post('admin/brt/test-create', [BrtController::class, 'testCreate']);
    });

    Route::post('brt/create-shipment', [BrtController::class, 'createShipment']);
    Route::post('brt/confirm-shipment', [BrtController::class, 'confirmShipment']);
    Route::post('brt/delete-shipment', [BrtController::class, 'deleteShipment'])->middleware(CheckAdmin::class);
    Route::get('brt/label/{order}', [BrtController::class, 'downloadLabel']);
    Route::get('brt/tracking/{order}', [BrtController::class, 'tracking']);

    /* ===== ESECUZIONE SPEDIZIONE ===== */

    Route::get('orders/{order}/execution', [ShipmentExecutionController::class, 'show']);
    Route::post('orders/{order}/pickup', [ShipmentExecutionController::class, 'requestPickup']);
    Route::post('orders/{order}/bordero', [ShipmentExecutionController::class, 'createBordero']);
    Route::get('orders/{order}/bordero/download', [ShipmentExecutionController::class, 'downloadBordero']);
    Route::post('orders/{order}/send-documents', [ShipmentExecutionController::class, 'sendDocuments']);
});
