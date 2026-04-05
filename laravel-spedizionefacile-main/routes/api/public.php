<?php

/**
 * ROTTE PUBBLICHE — Contenuti e GDPR
 *
 * Include: blog, guide, servizi, fasce prezzo, immagine homepage,
 * GDPR (cancellazione account, export dati, consenso cookie).
 */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PublicArticleController;
use App\Http\Controllers\PublicPriceBandController;
use App\Http\Controllers\Admin\HomepageImageController;
use App\Http\Controllers\GdprController;

/* ===== CONTENUTI PUBBLICI ===== */

Route::prefix('public')->group(function () {
    Route::get('/blog', [PublicArticleController::class, 'blog']);
    Route::get('/blog/{slug}', [PublicArticleController::class, 'blogArticle']);
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
