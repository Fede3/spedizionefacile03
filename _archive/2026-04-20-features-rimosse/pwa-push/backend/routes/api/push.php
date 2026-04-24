<?php

/**
 * ROUTES: Push notifications (F09)
 *
 * Pubblico:
 *   GET  /api/push/public-key    -> chiave pubblica VAPID per registrare la subscription
 *
 * Auth (sanctum):
 *   POST   /api/push/subscribe   -> registra/aggiorna subscription dell'utente
 *   DELETE /api/push/unsubscribe -> rimuove subscription per endpoint
 *
 * Admin:
 *   POST /api/admin/push/test    -> invia push di test
 */

use App\Http\Controllers\Api\PushSubscriptionController;
use Illuminate\Support\Facades\Route;

Route::prefix('push')->group(function () {
    // Pubblico: la public key VAPID e' progettata per essere distribuita.
    Route::get('/public-key', [PushSubscriptionController::class, 'publicKey']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::middleware('throttle:30,1')->post('/subscribe', [PushSubscriptionController::class, 'subscribe']);
        Route::delete('/unsubscribe', [PushSubscriptionController::class, 'unsubscribe']);
    });
});

// Endpoint admin per test invio push.
Route::middleware(['auth:sanctum', 'throttle:10,1'])
    ->post('/admin/push/test', [PushSubscriptionController::class, 'adminTest']);
