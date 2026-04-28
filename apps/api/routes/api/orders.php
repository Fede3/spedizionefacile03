<?php

/**
 * ROTTE ORDINI E SPEDIZIONI
 *
 * Include: CRUD ordini, annullamento, fattura, rimborso, esecuzione spedizione
 * (pickup, bordero, documenti), spedizioni configurate, coupon, BRT gestione.
 */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OrderListController;
use App\Http\Controllers\OrderDetailController;
use App\Http\Controllers\OrderExportController;
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

    Route::get('orders', [OrderListController::class, 'index']);
    // Export CSV ordini utente (o tutti per admin). Rate limit stretto: 5/min.
    Route::middleware(['throttle:5,1'])->get('orders/export', [OrderExportController::class, 'exportCsv']);
    Route::get('orders/{order}', [OrderDetailController::class, 'show'])->whereNumber('order');
    Route::middleware(['throttle:3,1'])->post('orders/{order}/cancel', [OrderDetailController::class, 'cancel']);
    Route::get('orders/{order}/invoice', [OrderDetailController::class, 'invoice']);
    Route::middleware(['throttle:5,1'])->get('orders/{order}/refund-eligibility', [RefundController::class, 'checkRefundEligibility']);
    Route::middleware(['throttle:10,1'])->post('orders/{order}/add-package', [OrderDetailController::class, 'addPackage']);
    Route::middleware(['throttle:30,1'])->post('create-direct-order', [OrderDetailController::class, 'createDirectOrder']);

    /* ===== COUPON ===== */

    // Rate limit stretto (5/min) per prevenire brute-force di codici sconto.
    Route::middleware(['throttle:5,1'])->post('calculate-coupon', [CouponController::class, 'calculateCoupon']);

    /* ===== SPEDIZIONI CONFIGURATE ===== */

    Route::get('saved-shipments', [SavedShipmentController::class, 'index']);
    Route::middleware(['throttle:5,1'])->post('saved-shipments', [SavedShipmentController::class, 'store']);
    Route::put('saved-shipments/{id}', [SavedShipmentController::class, 'update']);
    Route::delete('saved-shipments/{id}', [SavedShipmentController::class, 'destroy']);
    Route::post('saved-shipments/add-to-cart', [SavedShipmentController::class, 'addToCart']);

    /* ===== BRT GESTIONE SPEDIZIONI ===== */

    Route::middleware([CheckAdmin::class])->group(function () {
        Route::post('admin/brt/test-create', [BrtController::class, 'testCreate']);
    });

    // Rate limit (5/min) su create/confirm: limita abusi verso l'API BRT (costi e ban).
    Route::middleware(['throttle:5,1'])->post('brt/create-shipment', [BrtController::class, 'createShipment']);
    Route::middleware(['throttle:5,1'])->post('brt/confirm-shipment', [BrtController::class, 'confirmShipment']);
    Route::post('brt/delete-shipment', [BrtController::class, 'deleteShipment'])->middleware(CheckAdmin::class);
    Route::get('brt/label/{order}', [BrtController::class, 'downloadLabel']);
    Route::get('brt/tracking/{order}', [BrtController::class, 'tracking']);

    /* ===== ESECUZIONE SPEDIZIONE ===== */

    Route::get('orders/{order}/execution', [ShipmentExecutionController::class, 'show']);
    // Rate limit (5/min) su azioni di esecuzione spedizione: tutte toccano API BRT o mail.
    Route::middleware(['throttle:5,1'])->post('orders/{order}/pickup', [ShipmentExecutionController::class, 'requestPickup']);
    // F04 — cambio data ritiro (audit BRT 2026-04-18)
    Route::middleware(['throttle:5,1'])->patch('orders/{order}/pickup', [ShipmentExecutionController::class, 'reschedulePickup']);
    Route::middleware(['throttle:5,1'])->post('orders/{order}/bordero', [ShipmentExecutionController::class, 'createBordero']);
    Route::get('orders/{order}/bordero/download', [ShipmentExecutionController::class, 'downloadBordero']);
    Route::middleware(['throttle:5,1'])->post('orders/{order}/send-documents', [ShipmentExecutionController::class, 'sendDocuments']);
});
