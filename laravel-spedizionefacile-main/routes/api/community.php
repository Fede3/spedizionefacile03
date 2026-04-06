<?php

/**
 * ROTTE COMMUNITY E SUPPORTO
 *
 * Include: referral, notifiche, prelievi commissioni, richiesta Partner Pro,
 * contattaci, assistenza utente.
 */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReferralCodeController;
use App\Http\Controllers\ReferralRewardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\WithdrawalController;
use App\Http\Controllers\ProRequestController;
use App\Http\Controllers\ContactController;

/* ===== CONTATTACI (pubblico) ===== */

Route::middleware(['throttle:5,1'])->post('/contact', [ContactController::class, 'store']);

/* ===== ASSISTENZA UTENTE ===== */

Route::middleware(['auth:sanctum', 'throttle:10,1'])
    ->post('/support-tickets', [ContactController::class, 'storeSupportTicket']);

/* ===== REFERRAL ===== */

Route::middleware('auth:sanctum')->prefix('referral')->group(function () {
    Route::get('/my-code', [ReferralCodeController::class, 'myCode']);
    Route::post('/validate', [ReferralCodeController::class, 'validate']);
    Route::middleware(['throttle:5,1'])->post('/apply', [ReferralRewardController::class, 'apply']);
    Route::middleware(['throttle:5,1'])->post('/store', [ReferralCodeController::class, 'storeReferral']);
    Route::get('/my-discount', [ReferralCodeController::class, 'myDiscount']);
    Route::get('/earnings', [ReferralRewardController::class, 'earnings']);
});

/* ===== NOTIFICHE ===== */

Route::middleware('auth:sanctum')->prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);
    Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/{notification}/read', [NotificationController::class, 'markRead']);
    Route::patch('/read-all', [NotificationController::class, 'markAllRead']);
    Route::get('/preferences', [NotificationController::class, 'preferences']);
    Route::put('/preferences', [NotificationController::class, 'updatePreferences']);
});

/* ===== PRELIEVI COMMISSIONI ===== */

Route::middleware('auth:sanctum')->prefix('withdrawals')->group(function () {
    Route::get('/', [WithdrawalController::class, 'index']);
    Route::middleware(['throttle:3,1'])->post('/', [WithdrawalController::class, 'store']);
});

/* ===== RICHIESTA PARTNER PRO ===== */

Route::middleware('auth:sanctum')->prefix('pro-request')->group(function () {
    Route::post('/', [ProRequestController::class, 'store']);
    Route::get('/status', [ProRequestController::class, 'status']);
});
