<?php

/**
 * ROTTE PUBBLICHE — Contenuti e GDPR
 *
 * Include: guide, servizi, fasce prezzo, immagine homepage,
 * GDPR (cancellazione account, export dati, consenso cookie).
 */

use Illuminate\Support\Facades\Route;
// -- ARCHIVIATO 2026-04-20 -- use App\Http\Controllers\ApiDocsController;
use App\Http\Controllers\PublicArticleController;
use App\Http\Controllers\PublicPriceBandController;
use App\Http\Controllers\Admin\HomepageImageController;
use App\Http\Controllers\GdprController;
use App\Http\Controllers\HealthController;

/* ===== HEALTH CHECK (Sprint 7.2) ===== */
// Endpoint usati da Render, UptimeRobot, load balancer per verificare stato app.
// Throttle 30 req/min per evitare abuso (probe esterni poll ogni 30-60s).
Route::middleware('throttle:30,1')->group(function () {
    Route::get('/health', [HealthController::class, 'index']);        // readiness
    Route::get('/health/live', [HealthController::class, 'live']);    // liveness
});

/* ===== CONTENUTI PUBBLICI ===== */

Route::prefix('public')->group(function () {
    Route::get('/guides', [PublicArticleController::class, 'guides']);
    Route::get('/guides/{slug}', [PublicArticleController::class, 'guide']);
    Route::get('/services', [PublicArticleController::class, 'services']);
    Route::get('/services/{slug}', [PublicArticleController::class, 'service']);
    Route::get('/price-bands', [PublicPriceBandController::class, 'index']);
    Route::get('/homepage-image', [HomepageImageController::class, 'getHomepageImage']);
});

/* ===== GDPR ===== */

Route::middleware('auth:sanctum')->prefix('user')->group(function () {
    Route::delete('/account', [GdprController::class, 'deleteAccount']);
    Route::get('/data-export', [GdprController::class, 'dataExport']);
});

Route::middleware(['throttle:10,1'])->post('/cookie-consent', [GdprController::class, 'cookieConsent']);

/* ===== DOCUMENTAZIONE API PRO (OpenAPI/Swagger) ===== */
// -- ARCHIVIATO 2026-04-20 --
// Throttle morbido (60/min) perche' /api/docs puo' essere aperta in sessioni
// di test e lo spec YAML e' richiesto ad ogni load di Swagger UI.
// Route::middleware('throttle:60,1')->group(function () {
//     Route::get('/docs', [ApiDocsController::class, 'index'])->name('api.docs');
//     Route::get('/docs.yaml', [ApiDocsController::class, 'spec'])->name('api.docs.spec');
// });
