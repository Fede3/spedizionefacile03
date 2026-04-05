<?php

/**
 * ROTTE PAGAMENTI
 *
 * Include: Stripe (pagamento ordini, carte salvate, impostazioni),
 * portafoglio virtuale (ricarica, pagamento, saldo, movimenti).
 */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StripeController;
use App\Http\Controllers\StripeConnectController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\WalletController;
use App\Http\Middleware\CheckCart;
use App\Http\Middleware\CheckAdmin;

Route::group(['middleware' => ['auth:sanctum']], function () {

    /* ===== STRIPE CONNECT (Partner Pro) ===== */

    Route::get('/stripe/connect', [StripeConnectController::class, 'connect']);
    Route::get('/stripe/callback', [StripeConnectController::class, 'callback']);
    Route::get('/stripe/create-account', [StripeConnectController::class, 'createAccount']);

    /* ===== PAGAMENTO ORDINI ESISTENTI ===== */

    Route::middleware(['throttle:10,1'])->post('stripe/mark-order-completed', [StripeController::class, 'markOrderCompleted']);

    Route::middleware(['throttle:10,1'])->group(function () {
        Route::post('stripe/existing-order-payment', [StripeController::class, 'createPayment']);
        Route::post('stripe/existing-order-payment-intent', [StripeController::class, 'createPaymentIntent']);
        Route::post('stripe/existing-order-paid', [StripeController::class, 'orderPaid']);
    });

    /* ===== PAGAMENTO DA CARRELLO ===== */

    Route::group(['middleware' => [CheckCart::class, 'throttle:10,1']], function () {
        Route::post('stripe/create-payment', [StripeController::class, 'createPayment']);
        Route::post('stripe/create-order', [StripeController::class, 'createOrder']);
        Route::post('stripe/create-payment-intent', [StripeController::class, 'createPaymentIntent']);
        Route::post('stripe/order-paid', [StripeController::class, 'orderPaid']);
    });

    /* ===== IMPOSTAZIONI STRIPE ===== */

    Route::get('settings/stripe', [SettingsController::class, 'getStripeConfig']);
    Route::middleware([CheckAdmin::class])->group(function () {
        Route::post('settings/stripe', [SettingsController::class, 'saveStripeConfig']);
    });

    /* ===== CARTE DI CREDITO SALVATE ===== */

    Route::middleware(['throttle:10,1'])->post('stripe/create-setup-intent', [StripeController::class, 'createSetupIntent']);
    Route::get('stripe/payment-methods', [StripeController::class, 'listPaymentMethods']);
    Route::middleware(['throttle:10,1'])->post('stripe/set-default-payment-method', [StripeController::class, 'setDefaultPaymentMethod']);
    Route::middleware(['throttle:10,1'])->post('stripe/change-default-payment-method', [StripeController::class, 'changeDefaultPaymentMethod']);
    Route::get('stripe/default-payment-method', [StripeController::class, 'getDefaultPaymentMethod']);
    Route::middleware(['throttle:10,1'])->delete('stripe/delete-card', [StripeController::class, 'deleteCard']);
});

/* ===== PORTAFOGLIO VIRTUALE ===== */

Route::middleware('auth:sanctum')->prefix('wallet')->group(function () {
    Route::get('/balance', [WalletController::class, 'balance']);
    Route::get('/movements', [WalletController::class, 'movements']);
    Route::middleware(['throttle:5,1'])->post('/top-up', [WalletController::class, 'topUp']);
    Route::middleware(['throttle:10,1'])->post('/pay', [WalletController::class, 'payWithWallet']);
});
