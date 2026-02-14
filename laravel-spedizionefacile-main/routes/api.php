<?php

/**
 * ROTTE API (api.php)
 *
 * Questo file definisce le rotte API che hanno il prefisso automatico "/api/".
 * Contiene le funzionalita' piu' recenti del sito:
 * - Portafoglio virtuale (ricarica, pagamenti, saldo)
 * - Sistema referral (codici sconto per Partner Pro)
 * - Prelievi commissioni (per Partner Pro)
 * - Richieste per diventare Partner Pro
 * - Pannello di amministrazione completo
 *
 * Tutte le rotte sono protette da auth:sanctum (richiedono login).
 * Le rotte admin richiedono anche il middleware CheckAdmin.
 */

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\ReferralController;
use App\Http\Controllers\WithdrawalController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\ArticleController;
use App\Http\Controllers\PriceBandController;
use App\Http\Controllers\ProRequestController;
use App\Http\Controllers\PublicArticleController;
use App\Http\Controllers\PublicPriceBandController;
use App\Http\Middleware\CheckAdmin;

// Restituisce i dati dell'utente loggato (usato dal frontend per sapere chi e' collegato)
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Esegue il logout dell'utente (cancella la sessione e il token)
Route::post('/logout', function (Request $request) {
    Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return response()->json(['message' => 'Logged out']);
})->middleware('auth:sanctum');

/* ===== PORTAFOGLIO VIRTUALE ===== */
// Permette all'utente di ricaricare il portafoglio, vedere il saldo,
// la lista dei movimenti e pagare gli ordini con il saldo del portafoglio
Route::middleware('auth:sanctum')->prefix('wallet')->group(function () {
    Route::get('/balance', [WalletController::class, 'balance']);       // Mostra il saldo disponibile
    Route::get('/movements', [WalletController::class, 'movements']);   // Lista tutti i movimenti
    Route::post('/top-up', [WalletController::class, 'topUp']);         // Ricarica il portafoglio
    Route::post('/pay', [WalletController::class, 'payWithWallet']);    // Paga un ordine col portafoglio
});

/* ===== SISTEMA REFERRAL (codici sconto) ===== */
// Gestisce i codici referral dei Partner Pro: validazione, applicazione,
// calcolo sconto e visualizzazione guadagni
Route::middleware('auth:sanctum')->prefix('referral')->group(function () {
    Route::get('/my-code', [ReferralController::class, 'myCode']);           // Mostra il tuo codice referral
    Route::post('/validate', [ReferralController::class, 'validate']);       // Verifica se un codice e' valido
    Route::post('/apply', [ReferralController::class, 'apply']);             // Applica un codice a un ordine
    Route::post('/store', [ReferralController::class, 'storeReferral']);     // Salva l'utilizzo del referral
    Route::get('/my-discount', [ReferralController::class, 'myDiscount']);   // Mostra lo sconto disponibile
    Route::get('/earnings', [ReferralController::class, 'earnings']);        // Mostra i guadagni da referral
});

/* ===== PRELIEVI COMMISSIONI (per utenti Pro) ===== */
// I Partner Pro possono richiedere il prelievo delle commissioni guadagnate
Route::middleware('auth:sanctum')->prefix('withdrawals')->group(function () {
    Route::get('/', [WithdrawalController::class, 'index']);    // Lista le richieste di prelievo
    Route::post('/', [WithdrawalController::class, 'store']);   // Crea una nuova richiesta di prelievo
});

/* ===== RICHIESTA PARTNER PRO ===== */
// Un utente normale puo' richiedere di diventare Partner Pro
Route::middleware('auth:sanctum')->prefix('pro-request')->group(function () {
    Route::post('/', [ProRequestController::class, 'store']);       // Invia la richiesta
    Route::get('/status', [ProRequestController::class, 'status']); // Controlla lo stato della richiesta
});

/* ===================================================================== */
/* ROTTE ADMIN - Accessibili solo dagli amministratori                   */
/* ===================================================================== */
Route::middleware(['auth:sanctum', CheckAdmin::class])->prefix('admin')->group(function () {
    // --- Dashboard ---
    // Mostra le statistiche generali del sito (ordini, utenti, ricavi...)
    Route::get('/dashboard', [AdminController::class, 'dashboard']);

    // --- Gestione Ordini ---
    Route::get('/orders', [AdminController::class, 'orders']);                       // Lista tutti gli ordini
    Route::patch('/orders/{order}/status', [AdminController::class, 'updateOrderStatus']); // Cambia stato ordine

    // --- Gestione Spedizioni BRT ---
    Route::get('/shipments', [AdminController::class, 'shipments']);  // Lista tutte le spedizioni
    Route::post('/orders/{order}/regenerate-label', [AdminController::class, 'regenerateLabel']); // Rigenera etichetta BRT

    // --- Portafoglio (panoramica admin) ---
    Route::get('/wallet/overview', [AdminController::class, 'walletOverview']);              // Panoramica portafogli
    Route::get('/wallet/users/{user}/movements', [AdminController::class, 'userMovements']); // Movimenti di un utente

    // --- Prelievi ---
    Route::get('/withdrawals', [AdminController::class, 'withdrawals']);                           // Lista richieste prelievo
    Route::post('/withdrawals/{withdrawal}/approve', [AdminController::class, 'approveWithdrawal']); // Approva prelievo
    Route::post('/withdrawals/{withdrawal}/reject', [AdminController::class, 'rejectWithdrawal']);   // Rifiuta prelievo

    // --- Referral ---
    Route::get('/referrals', [AdminController::class, 'referralStats']);  // Statistiche codici referral

    // --- Richieste Partner Pro ---
    Route::get('/pro-requests', [ProRequestController::class, 'index']);                          // Lista richieste
    Route::patch('/pro-requests/{proRequest}/approve', [ProRequestController::class, 'approve']); // Approva richiesta
    Route::patch('/pro-requests/{proRequest}/reject', [ProRequestController::class, 'reject']);   // Rifiuta richiesta

    // --- Gestione Utenti ---
    Route::get('/users', [AdminController::class, 'users']);                        // Lista tutti gli utenti
    Route::patch('/users/{user}/approve', [AdminController::class, 'approveUser']); // Approva un utente
    Route::patch('/users/{user}/role', [AdminController::class, 'updateUserRole']); // Cambia ruolo utente
    Route::patch('/users/{user}/user-type', [AdminController::class, 'updateUserType']); // Cambia tipo (privato/commerciante)
    Route::delete('/users/{user}', [AdminController::class, 'deleteUser']);         // Elimina un utente

    // --- Messaggi di Contatto ---
    Route::get('/contact-messages', [AdminController::class, 'contactMessages']);                     // Lista messaggi
    Route::patch('/contact-messages/{id}/read', [AdminController::class, 'markContactMessageRead']); // Segna come letto

    // --- Impostazioni del sito ---
    Route::get('/settings', [AdminController::class, 'settings']);        // Legge le impostazioni
    Route::post('/settings', [AdminController::class, 'updateSettings']); // Aggiorna le impostazioni

    // --- Articoli (guide e servizi) ---
    Route::get('/articles', [ArticleController::class, 'index']);
    Route::post('/articles', [ArticleController::class, 'store']);
    Route::get('/articles/{article}', [ArticleController::class, 'show']);
    Route::put('/articles/{article}', [ArticleController::class, 'update']);
    Route::delete('/articles/{article}', [ArticleController::class, 'destroy']);
    Route::post('/articles/{article}/upload-image', [ArticleController::class, 'uploadImage']);

    // --- Fasce di prezzo ---
    Route::get('/price-bands', [PriceBandController::class, 'index']);
    Route::put('/price-bands', [PriceBandController::class, 'bulkUpdate']);
    Route::post('/price-bands/seed', [PriceBandController::class, 'seed']);

    // --- Impostazioni promozione ---
    Route::get('/promo-settings', [PriceBandController::class, 'getPromoSettings']);
    Route::post('/promo-settings', [PriceBandController::class, 'savePromoSettings']);
    Route::post('/promo-settings/upload-image', [PriceBandController::class, 'uploadPromoImage']);

    // --- Immagine Homepage ---
    Route::post('/homepage-image', [AdminController::class, 'uploadHomepageImage']);
    Route::get('/homepage-image', [AdminController::class, 'getHomepageImage']);

    // --- Coupon ---
    Route::get('/coupons', [AdminController::class, 'coupons']);
    Route::post('/coupons', [AdminController::class, 'storeCoupon']);
    Route::put('/coupons/{coupon}', [AdminController::class, 'updateCoupon']);
    Route::delete('/coupons/{coupon}', [AdminController::class, 'deleteCoupon']);
});

/* ===== ROTTE PUBBLICHE (contenuti dinamici) ===== */
Route::prefix('public')->group(function () {
    Route::get('/guides', [PublicArticleController::class, 'guides']);
    Route::get('/guides/{slug}', [PublicArticleController::class, 'guide']);
    Route::get('/services', [PublicArticleController::class, 'services']);
    Route::get('/services/{slug}', [PublicArticleController::class, 'service']);
    Route::get('/price-bands', [PublicPriceBandController::class, 'index']);
    Route::get('/homepage-image', [AdminController::class, 'getHomepageImage']);
});
