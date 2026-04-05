<?php

/**
 * ROTTE FLUSSO SPEDIZIONE
 *
 * Include: sessione preventivo, autocompletamento localita',
 * tracking pubblico, BRT PUDO (punti di ritiro/consegna).
 */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\BrtController;

/* ===== SESSIONE PREVENTIVO ===== */

Route::get('/session', [SessionController::class, 'show']);
Route::post('/session/first-step', [SessionController::class, 'firstStep']);
Route::post('/session/second-step', [SessionController::class, 'secondStep']);

/* ===== COMUNI, CAP, PROVINCE (autocompletamento indirizzi) ===== */

Route::get('/locations/search', [LocationController::class, 'search']);
Route::get('/locations/by-cap', [LocationController::class, 'byCap']);
Route::get('/locations/by-city', [LocationController::class, 'byCity']);

/* ===== TRACKING PUBBLICO ===== */

Route::middleware(['throttle:15,1'])->get('/tracking/search', [BrtController::class, 'publicTracking']);

/* ===== BRT PUDO PUBBLICO (Punti di ritiro/consegna) ===== */

Route::middleware(['throttle:30,1'])->get('brt/pudo/search', [BrtController::class, 'pudoSearch']);
Route::middleware(['throttle:30,1'])->get('brt/pudo/nearby', [BrtController::class, 'pudoNearby']);
Route::middleware(['throttle:30,1'])->get('brt/pudo/{pudoId}', [BrtController::class, 'pudoDetails']);
