<?php

/**
 * ROTTE CARRELLO
 *
 * Include: carrello ospite (sessione), carrello utente (database), pacchi.
 */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CartController;
use App\Http\Controllers\GuestCartController;
use App\Http\Controllers\PackageController;

/* ===== CARRELLO OSPITE (senza login) ===== */

Route::apiResource('guest-cart', GuestCartController::class);
Route::delete('empty-guest-cart', [GuestCartController::class, 'emptyCart']);

/* ===== CARRELLO UTENTE (login richiesto) ===== */

Route::group(['middleware' => ['auth:sanctum']], function () {
    Route::delete('empty-cart', [CartController::class, 'emptyCart']);
    Route::post('cart/merge', [CartController::class, 'mergeIdentical']);
    Route::apiResource('cart', CartController::class);
    Route::patch('cart/{id}/quantity', [CartController::class, 'updateQuantity']);
    Route::apiResource('packages', PackageController::class);
});
