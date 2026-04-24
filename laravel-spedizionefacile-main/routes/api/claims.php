<?php

/**
 * ROTTE RECLAMI (F03 — audit BRT 2026-04-18)
 *
 * Utente autenticato:
 *   - GET    /api/claims                                   lista reclami utente
 *   - POST   /api/claims                                   apri reclamo (rate limit 3/min)
 *   - GET    /api/claims/{claim}                           dettaglio
 *   - GET    /api/claims/{claim}/attachments/{attachment}  download allegato privato
 *
 * Admin (già sotto prefisso /admin e middleware CheckAdmin in admin.php):
 *   - GET    /api/admin/claims
 *   - GET    /api/admin/claims/{claim}
 *   - PATCH  /api/admin/claims/{claim}
 */

use App\Http\Controllers\ClaimController;
use App\Http\Controllers\Admin\AdminClaimController;
use App\Http\Middleware\CheckAdmin;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('claims', [ClaimController::class, 'index']);
    Route::middleware('throttle:3,1')
        ->post('claims', [ClaimController::class, 'store']);
    Route::get('claims/{claim}', [ClaimController::class, 'show'])
        ->whereNumber('claim');
    Route::get('claims/{claim}/attachments/{attachment}', [ClaimController::class, 'downloadAttachment'])
        ->whereNumber(['claim', 'attachment'])
        ->name('claims.attachment.download');
});

Route::middleware(['auth:sanctum', CheckAdmin::class])->prefix('admin')->group(function () {
    Route::get('claims', [AdminClaimController::class, 'index']);
    Route::get('claims/{claim}', [AdminClaimController::class, 'show'])
        ->whereNumber('claim');
    Route::patch('claims/{claim}', [AdminClaimController::class, 'update'])
        ->whereNumber('claim');
    // Reply del team al cliente: rate limit stretto (5/min) per evitare spam.
    Route::middleware('throttle:5,1')
        ->post('claims/{claim}/reply', [AdminClaimController::class, 'reply'])
        ->whereNumber('claim');
});
