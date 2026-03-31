<?php

/**
 * FILE: web.php (Rotte Web)
 *
 * SCOPO:
 *   Contiene SOLO le rotte che devono usare il middleware "web" standard di Laravel
 *   (sessione classica, CSRF web, cookie). Queste rotte NON sono API.
 *
 * PERCHE' COSI' POCHE ROTTE?
 *   Prima tutte le rotte API erano qui dentro un Route::group(['prefix' => 'api']).
 *   Il problema era che il login (qui, middleware "web") creava la sessione in un modo,
 *   ma GET /api/user (in api.php, middleware "statefulApi") la leggeva in un altro modo.
 *   Risultato: dopo il login, l'utente risultava "Unauthenticated" perche' i due
 *   middleware stack gestivano la sessione in maniera diversa.
 *
 *   SOLUZIONE: tutte le rotte /api/* sono state spostate in api.php, cosi' login,
 *   /api/user, carrello, ordini ecc. usano TUTTI lo stesso middleware "statefulApi"
 *   e la sessione funziona correttamente.
 *
 * COSA CONTIENE:
 *   - GET /             → Pagina di benvenuto Laravel (non usata dal frontend Nuxt)
 *   - GET /login        → Redirect a /autenticazione (necessaria per Sanctum)
 *   - POST /stripe/webhook → Webhook Stripe (riceve notifiche pagamento, no sessione)
 *   - GET /auth/google/callback → Callback OAuth Google (redirect dal browser di Google)
 *
 * CHIAMATO DA:
 *   - Laravel (routing automatico)
 *   - Stripe (webhook POST)
 *   - Google OAuth (redirect callback)
 *   - Sanctum internamente (rotta "login" come fallback per utenti non autenticati)
 */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AppleController;
use App\Http\Controllers\FacebookController;
use App\Http\Controllers\GoogleController;
use App\Http\Controllers\StripeWebhookController;

// Pagina principale del backend Laravel (non usata dal frontend Nuxt)
// Mostra la pagina di benvenuto di default di Laravel
Route::get('/', function () {
    return view('welcome');
});

// Rotta di login "fittizia" — Sanctum la usa come fallback
// Quando un utente non autenticato tenta di accedere a una rotta protetta con auth:sanctum,
// Laravel lo redirige alla rotta con nome 'login'. Noi lo mandiamo alla pagina di login
// del frontend Nuxt (/autenticazione) cosi' puo' inserire le sue credenziali.
// NOTA: questa rotta DEVE avere ->name('login') altrimenti Sanctum da' errore
Route::get('/login', function () {
    return redirect('/autenticazione');
})->name('login');

// Webhook di Stripe — riceve le notifiche di pagamento da Stripe
// Stripe invia qui un POST ogni volta che un pagamento viene completato, rimborsato, ecc.
// E' pubblico (senza login) perche' Stripe lo chiama direttamente dai suoi server.
// La verifica dell'autenticita' viene fatta dal StripeWebhookController tramite la firma.
Route::post('/stripe/webhook', [StripeWebhookController::class, 'handle']);

// Callback di Google OAuth — riceve il redirect dopo che l'utente si autentica con Google
// Quando l'utente clicca "Accedi con Google", viene mandato su Google, e dopo
// il login Google lo rimanda qui. Questa rotta e' in web.php (e NON in api.php)
// perche' il redirect di Google arriva direttamente nel browser dell'utente,
// quindi deve usare il middleware web per gestire la sessione e i cookie.
Route::get('/auth/google/callback', [GoogleController::class, 'handleGoogleCallback']);
Route::get('/auth/facebook/callback', [FacebookController::class, 'handleFacebookCallback']);
Route::match(['GET', 'POST'], '/auth/apple/callback', [AppleController::class, 'handleAppleCallback']);
