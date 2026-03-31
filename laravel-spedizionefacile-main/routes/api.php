<?php

/**
 * FILE: api.php (Rotte API)
 *
 * SCOPO:
 *   Definisce TUTTE le rotte API del sito. Ogni rotta qui riceve automaticamente
 *   il prefisso "/api/" (es. Route::get('/user') diventa GET /api/user).
 *
 * PERCHE' TUTTE LE ROTTE API SONO QUI?
 *   In precedenza, login/registrazione/carrello erano in web.php dentro
 *   Route::group(['prefix' => 'api']). Il problema: le rotte in web.php usano
 *   il middleware "web" (sessione classica), mentre le rotte in api.php usano
 *   il middleware "statefulApi" (sessione gestita da Sanctum).
 *   Questi DUE middleware gestiscono la sessione in modo DIVERSO, e quindi
 *   il login creava una sessione che /api/user non riconosceva → "Unauthenticated".
 *
 *   SOLUZIONE: spostare TUTTO qui in api.php, cosi' tutte le rotte usano
 *   lo stesso middleware stack "statefulApi" e la sessione e' condivisa.
 *
 * COME FUNZIONA IL MIDDLEWARE "statefulApi":
 *   Configurato in bootstrap/app.php con $middleware->statefulApi().
 *   Quando una richiesta arriva da un dominio "stateful" (definito in SANCTUM_STATEFUL_DOMAINS
 *   nel file .env), Sanctum aggiunge automaticamente questi middleware:
 *   1. EncryptCookies — cifra i cookie
 *   2. AddQueuedCookiesToResponse — aggiunge cookie in coda
 *   3. StartSession — avvia la sessione PHP
 *   4. ValidateCsrfToken — verifica il token CSRF (protezione da attacchi)
 *   5. AuthenticateSession — collega la sessione all'utente autenticato
 *
 * ORGANIZZAZIONE:
 *   1. Utente corrente e logout
 *   2. Rotte pubbliche (login, registrazione, sessione, carrello ospite, ecc.)
 *   3. Rotte protette (auth:sanctum) — tutto cio' che richiede login
 *   4. Portafoglio virtuale, referral, prelievi, partner pro
 *   5. Pannello di amministrazione (admin)
 *   6. Rotte pubbliche per contenuti dinamici (guide, servizi, prezzi)
 *
 * CHIAMATO DA:
 *   - Frontend Nuxt (tramite chiamate HTTP con cookie di sessione)
 *   - Il modulo nuxt-auth-sanctum gestisce automaticamente CSRF e sessione
 */

use App\Http\Middleware\CheckCart;
use App\Http\Middleware\CheckAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CartController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\AppleController;
use App\Http\Controllers\FacebookController;
use App\Http\Controllers\GoogleController;
use App\Http\Controllers\StripeController;
use App\Http\Controllers\AddressController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\GuestCartController;
use App\Http\Controllers\CustomLoginController;
use App\Http\Controllers\UserAddressController;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\StripeConnectController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\ChangePasswordController;
use App\Http\Controllers\CustomRegisterController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\PasswordResetRequestController;
use App\Http\Controllers\SavedShipmentController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\ReferralController;
use App\Http\Controllers\WithdrawalController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\BrtController;
use App\Http\Controllers\RefundController;
use App\Http\Controllers\Admin\ContentController as AdminContentController;
use App\Http\Controllers\Admin\CouponController as AdminCouponController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\OrderManagementController;
use App\Http\Controllers\Admin\ReferralStatsController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\Admin\WalletManagementController;
use App\Http\Controllers\ArticleController;
use App\Http\Controllers\PriceBandController;
use App\Http\Controllers\ProRequestController;
use App\Http\Controllers\PublicArticleController;
use App\Http\Controllers\PublicPriceBandController;
use App\Http\Controllers\ShipmentExecutionController;
use App\Support\AuthUiCookie;

/* ===================================================================== */
/* UTENTE CORRENTE E LOGOUT                                              */
/* Queste rotte sono le piu' importanti per l'autenticazione SPA.        */
/* Il frontend le chiama per sapere chi e' loggato e per fare logout.    */
/* ===================================================================== */

// GET /api/user — Restituisce i dati dell'utente loggato
// Il frontend Nuxt chiama questa rotta al caricamento di ogni pagina
// per verificare se l'utente e' ancora autenticato.
// Se la sessione e' valida, restituisce l'oggetto User (JSON).
// Se la sessione e' scaduta o invalida, restituisce 401 "Unauthenticated".
Route::get('/user', function (Request $request) {
    return response()->json($request->user())
        ->cookie(AuthUiCookie::issueForUser($request->user(), Auth::guard('web')->viaRemember()));
})->middleware('auth:sanctum');

// POST /api/logout — Esegue il logout dell'utente
// 1. Auth::guard('web')->logout() — rimuove l'utente dalla sessione
// 2. session()->invalidate() — distrugge la sessione corrente
// 3. session()->regenerateToken() — crea un nuovo token CSRF
// Il frontend dopo il logout redirige alla pagina principale.
Route::post('/logout', function (Request $request) {
    Auth::guard('web')->logout();
    // Invalida la sessione e rigenera il token CSRF solo se la sessione e' disponibile.
    // Su tunnel Cloudflare la sessione potrebbe non essere attiva se il dominio
    // non e' riconosciuto come "stateful" da Sanctum.
    if ($request->hasSession()) {
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
    return response()->json(['message' => 'Logged out'])
        ->cookie(AuthUiCookie::forget());
})->middleware('auth:sanctum');

/* ===================================================================== */
/* ROTTE PUBBLICHE (senza login)                                         */
/* Accessibili da chiunque, anche utenti non autenticati.                */
/* ===================================================================== */

/* ===== REGISTRAZIONE ===== */
// POST /api/custom-register — Crea un nuovo account utente
// Limitato a 5 tentativi al minuto per prevenire registrazioni automatiche (bot)
Route::middleware(['throttle:5,1'])->post('/custom-register', [CustomRegisterController::class, 'register']);

// GET /api/auth/google/redirect — Reindirizza l'utente alla pagina di login di Google
// Quando l'utente clicca "Accedi con Google", viene mandato prima qui,
// poi questo controller lo redirige a Google per l'autenticazione OAuth
Route::get('/auth/providers', function () {
    $isConfigured = static fn (string $provider) => filled(config("services.{$provider}.client_id"))
        && filled(config("services.{$provider}.client_secret"))
        && filled(config("services.{$provider}.redirect"));

    $isAppleConfigured = static function (): bool {
        $hasDirectSecret = filled(config('services.apple.client_secret'));
        $hasDerivedSecret = filled(config('services.apple.team_id'))
            && filled(config('services.apple.key_id'))
            && filled(config('services.apple.private_key'));

        return filled(config('services.apple.client_id'))
            && filled(config('services.apple.redirect'))
            && ($hasDirectSecret || $hasDerivedSecret);
    };

    return response()->json([
        'google' => $isConfigured('google'),
        'facebook' => $isConfigured('facebook'),
        'apple' => $isAppleConfigured(),
    ]);
});

Route::get('/auth/apple/redirect', [AppleController::class, 'redirectToApple']);
Route::get('/auth/google/redirect', [GoogleController::class, 'redirectToGoogle']);
Route::get('/auth/facebook/redirect', [FacebookController::class, 'redirectToFacebook']);

// POST /api/upload-file — Carica un'immagine (solo per admin)
// Usato dall'admin per caricare immagini del sito (es. homepage)
Route::post('/upload-file', [UserController::class, 'uploadFile'])
        ->middleware(CheckAdmin::class);

// GET /api/get-admin-image — Recupera l'immagine caricata dall'admin (pubblica)
// Usato dal frontend per mostrare l'immagine dell'admin in homepage
Route::get('/get-admin-image', [UserController::class, 'getAdminImage']);

/* ===== LOGIN ===== */
// POST /api/custom-login — Effettua il login con email e password
// Limitato a 10 tentativi al minuto per prevenire attacchi brute-force
// Se l'account non e' verificato, restituisce 403 con requires_verification=true
Route::middleware(['throttle:10,1'])->post('/custom-login', [CustomLoginController::class, 'login']);

// POST /api/resend-verification-email — Reinvia l'email col codice di verifica
// Usato quando l'utente non ha ricevuto il codice o quando e' scaduto (max 5/min)
Route::middleware(['throttle:5,1'])->post('/resend-verification-email', [CustomLoginController::class, 'resendVerificationEmail']);

// POST /api/verify-code — Verifica il codice a 6 cifre inviato via email
// Dopo la verifica, l'account viene attivato e l'utente viene loggato automaticamente
Route::middleware(['throttle:10,1'])->post('/verify-code', [CustomLoginController::class, 'verifyCode']);

/* ===== CONFERMA EMAIL ===== */
// GET /api/verify-email/{id} — Link di verifica email cliccato dall'utente nell'email
// Il middleware 'signed' verifica che il link non sia stato manomesso
// (contiene una firma crittografica generata da Laravel)
Route::get('/verify-email/{id}', [VerificationController::class, 'verify'])
        ->middleware('signed')
        ->name('verification.verify');

/* ===== COMUNI, CAP, PROVINCE (autocompletamento indirizzi) ===== */
// GET /api/locations/search?q=Mil — Cerca localita' per nome (es. "Mil" → "Milano")
// Usato nei form di spedizione per l'autocompletamento della citta'
Route::get('/locations/search', [LocationController::class, 'search']);
// GET /api/locations/by-cap?cap=20121 — Cerca localita' per CAP (es. "20121" → "Milano, MI")
Route::get('/locations/by-cap', [LocationController::class, 'byCap']);
// GET /api/locations/by-city?city=Roma — Cerca localita' per citta' con CAP coerenti
Route::get('/locations/by-city', [LocationController::class, 'byCity']);

/* ===== RECUPERO E MODIFICA PASSWORD ===== */
// POST /api/forgot-password — Invia email con link per recuperare la password
// L'utente inserisce la sua email e riceve un link con token per reimpostare la password
Route::middleware(['throttle:5,1'])->post('/forgot-password', [PasswordResetRequestController::class, 'sendEmail']);
// POST /api/update-password — Reimposta la password con il token ricevuto via email
// L'utente arriva qui dopo aver cliccato il link nell'email di recupero
Route::middleware(['throttle:5,1'])->post('/update-password', [ChangePasswordController::class, 'passwordResetProcess']);

/* ===== SESSIONE PREVENTIVO ===== */
// GET /api/session — Mostra i dati della sessione corrente del preventivo
// Contiene i dati del pacco (peso, dimensioni, indirizzi) salvati durante il preventivo
Route::get('/session', [SessionController::class, 'show']);
// POST /api/session/first-step — Salva i dati del primo step del preventivo
// Calcola il prezzo in base a peso e volume e salva tutto nella sessione
Route::post('/session/first-step', [SessionController::class, 'firstStep']);
// POST /api/session/second-step — Salva servizi, data e indirizzi del funnel
Route::post('/session/second-step', [SessionController::class, 'secondStep']);

/* ===== CARRELLO OSPITE (utenti non loggati) ===== */
// CRUD completo per il carrello degli ospiti (salvato nella sessione PHP)
// Quando l'utente fara' login, il carrello ospite verra' trasferito nel database
Route::apiResource('guest-cart', GuestCartController::class);

// DELETE /api/empty-guest-cart — Svuota completamente il carrello dell'ospite
Route::delete('empty-guest-cart', [GuestCartController::class, 'emptyCart']);

/* ===== TRACKING PUBBLICO ===== */
// GET /api/tracking/search?code=... — Cerca una spedizione per codice tracking
// Accessibile a chiunque, anche senza login. Limitato a 15 richieste/minuto.
Route::middleware(['throttle:15,1'])->get('/tracking/search', [BrtController::class, 'publicTracking']);

/* ===== CONTATTACI ===== */
// POST /api/contact — Invia un messaggio dal form "Contattaci"
// Salva il messaggio nel database per la revisione dell'admin
Route::middleware(['throttle:5,1'])->post('/contact', [ContactController::class, 'store']);

/* ===== BRT - PUDO PUBBLICO (Punti di ritiro/consegna) ===== */
// PUDO = Pick Up / Drop Off — Punti dove ritirare o consegnare i pacchi
// Accessibili senza autenticazione per permettere la ricerca durante il checkout

// GET /api/brt/pudo/search — Cerca punti di ritiro BRT per indirizzo
Route::middleware(['throttle:30,1'])->get('brt/pudo/search', [BrtController::class, 'pudoSearch']);
// GET /api/brt/pudo/nearby — Cerca punti di ritiro BRT nelle vicinanze (per coordinate)
Route::middleware(['throttle:30,1'])->get('brt/pudo/nearby', [BrtController::class, 'pudoNearby']);
// GET /api/brt/pudo/{pudoId} — Dettagli di un punto di ritiro specifico
Route::middleware(['throttle:30,1'])->get('brt/pudo/{pudoId}', [BrtController::class, 'pudoDetails']);

/* ===================================================================== */
/* ROTTE PROTETTE — Accessibili solo da utenti loggati (auth:sanctum)    */
/* Il middleware auth:sanctum verifica che la sessione contenga un utente */
/* autenticato. Se no, restituisce 401 "Unauthenticated".                */
/* ===================================================================== */
Route::group(['middleware' => ['auth:sanctum']], function() {

    Route::post('/auth/confirm-password', [CustomLoginController::class, 'confirmPassword']);

    /* ===== INFORMAZIONI UTENTE ===== */
    // CRUD completo per l'utente: GET (profilo), PUT (modifica dati), DELETE (elimina account)
    Route::apiResource('users', UserController::class);

    /* ===== INDIRIZZI UTENTE (RUBRICA) ===== */
    // CRUD completo per la rubrica indirizzi dell'utente
    // Permette di salvare indirizzi frequenti per riusarli nelle spedizioni
    Route::apiResource('user-addresses', UserAddressController::class);

    /* ===== ASSISTENZA UTENTE ===== */
    // POST /api/support-tickets — Apre un ticket dal pannello account usando i dati dell'utente autenticato
    Route::middleware(['throttle:10,1'])->post('/support-tickets', [ContactController::class, 'storeSupportTicket']);

    /* ===== STRIPE CONNECT (per Partner Pro) ===== */
    // GET /api/stripe/connect — Avvia il collegamento dell'account Stripe dell'utente
    Route::get('/stripe/connect', [StripeConnectController::class, 'connect']);
    // GET /api/stripe/callback — Callback dopo il collegamento Stripe
    Route::get('/stripe/callback', [StripeConnectController::class, 'callback']);
    // GET /api/stripe/create-account — Crea un account Stripe collegato per l'utente
    Route::get('/stripe/create-account', [StripeConnectController::class, 'createAccount']);

    /* ===== CARRELLO (utente loggato) ===== */
    // A differenza del carrello ospite, questo e' salvato nel database (tabella cart_user)
    // e sopravvive alla chiusura del browser

    // DELETE /api/empty-cart — Svuota completamente il carrello dell'utente
    Route::delete('empty-cart', [CartController::class, 'emptyCart']);

    // POST /api/cart/merge — Unisce automaticamente i pacchi identici nel carrello
    // Es. se hai 2 pacchi uguali da 1 pezzo, li unisce in 1 pacco da 2 pezzi
    // NOTA: definito PRIMA di apiResource per evitare conflitto con cart/{id}
    Route::post('cart/merge', [CartController::class, 'mergeIdentical']);
    // CRUD completo per il carrello (index, store, show, update, destroy)
    Route::apiResource('cart', CartController::class);
    // PATCH /api/cart/{id}/quantity — Aggiorna solo la quantita' di un pacco nel carrello
    Route::patch('cart/{id}/quantity', [CartController::class, 'updateQuantity']);

    // CRUD completo per i pacchi (gestione diretta dei pacchi nel database)
    Route::apiResource('packages', PackageController::class);

    /* ===== PAGAMENTO ORDINI GIA' ESISTENTI ===== */
    // Queste rotte sono FUORI dal middleware CheckCart perche' l'ordine esiste gia'
    // e il carrello potrebbe essere vuoto (l'utente paga un ordine gia' creato)

    // POST /api/stripe/mark-order-completed — Completa un ordine con pagamento
    // non-Stripe (portafoglio virtuale o bonifico bancario)
    Route::post('stripe/mark-order-completed', [StripeController::class, 'markOrderCompleted']);

    // Pagamento di un ordine gia' esistente tramite Stripe
    Route::post('stripe/existing-order-payment', [StripeController::class, 'createPayment']);
    Route::post('stripe/existing-order-payment-intent', [StripeController::class, 'createPaymentIntent']);
    Route::post('stripe/existing-order-paid', [StripeController::class, 'orderPaid']);

    /* ===== PAGAMENTO DA CARRELLO (richiede carrello non vuoto) ===== */
    // Il middleware CheckCart verifica che il carrello non sia vuoto prima di procedere
    // Se il carrello e' vuoto, restituisce un errore
    Route::group(['middleware' => [CheckCart::class]], function() {
        // POST /api/stripe/create-payment — Crea un pagamento Stripe dal carrello
        Route::post('stripe/create-payment', [StripeController::class, 'createPayment']);
        // POST /api/stripe/create-order — Crea un ordine nel database dal carrello
        Route::post('stripe/create-order', [StripeController::class, 'createOrder']);
        // POST /api/stripe/create-payment-intent — Crea un PaymentIntent Stripe (pagamento con carta)
        Route::post('stripe/create-payment-intent', [StripeController::class, 'createPaymentIntent']);
        // POST /api/stripe/order-paid — Conferma che l'ordine e' stato pagato con successo
        Route::post('stripe/order-paid', [StripeController::class, 'orderPaid']);
    });

    /* ===== IMPOSTAZIONI STRIPE (solo admin in pratica) ===== */
    // Lettura e salvataggio delle chiavi Stripe (publishable key, secret key)
    Route::get('settings/stripe', [SettingsController::class, 'getStripeConfig']);
    Route::post('settings/stripe', [SettingsController::class, 'saveStripeConfig']);

    /* ===== CARTE DI CREDITO SALVATE ===== */
    // POST /api/stripe/create-setup-intent — Crea un SetupIntent per salvare una nuova carta
    // Il SetupIntent raccoglie i dati della carta senza addebitare nulla
    Route::post('stripe/create-setup-intent', [StripeController::class, 'createSetupIntent']);
    // GET /api/stripe/payment-methods — Lista tutte le carte salvate dell'utente
    Route::get('stripe/payment-methods', [StripeController::class, 'listPaymentMethods']);
    // POST /api/stripe/set-default-payment-method — Imposta la carta predefinita
    Route::post('stripe/set-default-payment-method', [StripeController::class, 'setDefaultPaymentMethod']);
    // POST /api/stripe/change-default-payment-method — Cambia la carta predefinita
    Route::post('stripe/change-default-payment-method', [StripeController::class, 'changeDefaultPaymentMethod']);
    // GET /api/stripe/default-payment-method — Legge quale carta e' la predefinita
    Route::get('stripe/default-payment-method', [StripeController::class, 'getDefaultPaymentMethod']);
    // DELETE /api/stripe/delete-card — Elimina una carta salvata
    Route::delete('stripe/delete-card', [StripeController::class, 'deleteCard']);

    /* ===== INDIRIZZI DI SPEDIZIONE (partenza e destinazione) ===== */
    // CRUD completo per gli indirizzi di spedizione associati ai pacchi
    Route::apiResource('addresses', AddressController::class);

    /* ===== ORDINI ===== */
    // CRUD completo per gli ordini: lista, dettaglio, creazione
    Route::apiResource('orders', OrderController::class);
    // POST /api/orders/{order}/cancel — Annulla un ordine (con eventuale rimborso)
    Route::post('orders/{order}/cancel', [OrderController::class, 'cancel']);
    // GET /api/orders/{order}/invoice — Scarica la ricevuta PDF dell'ordine
    Route::get('orders/{order}/invoice', [OrderController::class, 'invoice']);
    // GET /api/orders/{order}/refund-eligibility — Controlla se un ordine puo' essere rimborsato
    // Le regole: "processing" e "completed" si', "in_transit" no (gia' partito)
    Route::get('orders/{order}/refund-eligibility', [RefundController::class, 'checkRefundEligibility']);
    // POST /api/orders/{order}/add-package — Aggiungi un collo a un ordine in attesa di pagamento
    Route::post('orders/{order}/add-package', [OrderController::class, 'addPackage']);
    // POST /api/create-direct-order — Crea un ordine diretto (senza passare dal carrello)
    Route::post('create-direct-order', [OrderController::class, 'createDirectOrder']);

    // POST /api/calculate-coupon — Calcola lo sconto di un codice coupon
    Route::post('calculate-coupon', [CouponController::class, 'calculateCoupon']);

    /* ===== SPEDIZIONI CONFIGURATE (modelli salvati per riuso) ===== */
    // L'utente puo' salvare configurazioni di spedizioni frequenti per riutilizzarle
    Route::get('saved-shipments', [SavedShipmentController::class, 'index']);       // Lista
    Route::post('saved-shipments', [SavedShipmentController::class, 'store']);      // Crea nuova
    Route::put('saved-shipments/{id}', [SavedShipmentController::class, 'update']); // Modifica
    Route::delete('saved-shipments/{id}', [SavedShipmentController::class, 'destroy']); // Elimina
    // POST /api/saved-shipments/add-to-cart — Aggiunge una spedizione salvata al carrello
    Route::post('saved-shipments/add-to-cart', [SavedShipmentController::class, 'addToCart']);

    /* ===== ADMIN - TEST BRT ===== */
    // Solo gli admin possono testare la creazione di spedizioni BRT
    Route::middleware([CheckAdmin::class])->group(function () {
        Route::post('admin/brt/test-create', [BrtController::class, 'testCreate']);
    });

    /* ===== BRT - GESTIONE SPEDIZIONI ===== */
    // Queste rotte comunicano con l'API di BRT (Bartolini) per gestire le spedizioni reali

    // POST /api/brt/create-shipment — Crea una nuova spedizione su BRT
    Route::post('brt/create-shipment', [BrtController::class, 'createShipment']);
    // POST /api/brt/confirm-shipment — Conferma una spedizione BRT (la rende definitiva)
    Route::post('brt/confirm-shipment', [BrtController::class, 'confirmShipment']);
    // POST /api/brt/delete-shipment — Cancella una spedizione BRT non ancora confermata
    Route::post('brt/delete-shipment', [BrtController::class, 'deleteShipment']);
    // GET /api/brt/label/{order} — Scarica l'etichetta di spedizione in PDF
    Route::get('brt/label/{order}', [BrtController::class, 'downloadLabel']);
    // GET /api/brt/tracking/{order} — Controlla lo stato della spedizione (tracking)
    Route::get('brt/tracking/{order}', [BrtController::class, 'tracking']);

    /* ===== ESECUZIONE SPEDIZIONE (pickup, bordero, documenti) ===== */
    // Gestisce il flusso post-etichetta: ritiro a domicilio, bordero e invio documenti.

    // GET /api/orders/{order}/execution — Stato esecuzione spedizione (pickup, bordero, documenti)
    Route::get('orders/{order}/execution', [ShipmentExecutionController::class, 'show']);
    // POST /api/orders/{order}/pickup — Richiede il ritiro a domicilio BRT
    Route::post('orders/{order}/pickup', [ShipmentExecutionController::class, 'requestPickup']);
    // POST /api/orders/{order}/bordero — Genera il bordero di spedizione (PDF)
    Route::post('orders/{order}/bordero', [ShipmentExecutionController::class, 'createBordero']);
    // POST /api/orders/{order}/send-documents — Invia documenti (etichetta + bordero) via email
    Route::post('orders/{order}/send-documents', [ShipmentExecutionController::class, 'sendDocuments']);
});

/* ===================================================================== */
/* PORTAFOGLIO VIRTUALE                                                  */
/* Permette all'utente di ricaricare un saldo virtuale e usarlo per     */
/* pagare le spedizioni. Alternativa al pagamento con carta di credito. */
/* ===================================================================== */
Route::middleware('auth:sanctum')->prefix('wallet')->group(function () {
    // GET /api/wallet/balance — Mostra il saldo disponibile nel portafoglio
    Route::get('/balance', [WalletController::class, 'balance']);
    // GET /api/wallet/movements — Lista tutti i movimenti (ricariche, pagamenti, rimborsi)
    Route::get('/movements', [WalletController::class, 'movements']);
    // POST /api/wallet/top-up — Ricarica il portafoglio tramite Stripe
    Route::post('/top-up', [WalletController::class, 'topUp']);
    // POST /api/wallet/pay — Paga un ordine usando il saldo del portafoglio
    Route::post('/pay', [WalletController::class, 'payWithWallet']);
});

/* ===================================================================== */
/* SISTEMA REFERRAL (codici sconto)                                     */
/* I Partner Pro hanno un codice referral personale. Quando un nuovo    */
/* utente usa il codice, entrambi ricevono uno sconto/commissione.      */
/* ===================================================================== */
Route::middleware('auth:sanctum')->prefix('referral')->group(function () {
    // GET /api/referral/my-code — Mostra il tuo codice referral personale
    Route::get('/my-code', [ReferralController::class, 'myCode']);
    // POST /api/referral/validate — Verifica se un codice referral e' valido
    Route::post('/validate', [ReferralController::class, 'validate']);
    // POST /api/referral/apply — Applica un codice referral a un ordine
    Route::post('/apply', [ReferralController::class, 'apply']);
    // POST /api/referral/store — Salva l'utilizzo del referral nel database
    Route::post('/store', [ReferralController::class, 'storeReferral']);
    // GET /api/referral/my-discount — Mostra lo sconto disponibile grazie al referral
    Route::get('/my-discount', [ReferralController::class, 'myDiscount']);
    // GET /api/referral/earnings — Mostra i guadagni totali dalle commissioni referral
    Route::get('/earnings', [ReferralController::class, 'earnings']);
});

/* ===================================================================== */
/* PRELIEVI COMMISSIONI (per Partner Pro)                                */
/* I Partner Pro possono richiedere il prelievo delle commissioni       */
/* guadagnate tramite il sistema referral (trasferimento su conto).     */
/* ===================================================================== */
Route::middleware('auth:sanctum')->prefix('withdrawals')->group(function () {
    // GET /api/withdrawals — Lista le richieste di prelievo dell'utente
    Route::get('/', [WithdrawalController::class, 'index']);
    // POST /api/withdrawals — Crea una nuova richiesta di prelievo
    Route::post('/', [WithdrawalController::class, 'store']);
});

/* ===================================================================== */
/* RICHIESTA PARTNER PRO                                                */
/* Un utente normale puo' richiedere di diventare Partner Pro per      */
/* accedere a sconti e guadagnare commissioni tramite referral.        */
/* ===================================================================== */
Route::middleware('auth:sanctum')->prefix('pro-request')->group(function () {
    // POST /api/pro-request — Invia la richiesta per diventare Partner Pro
    Route::post('/', [ProRequestController::class, 'store']);
    // GET /api/pro-request/status — Controlla lo stato della richiesta (pending/approved/rejected)
    Route::get('/status', [ProRequestController::class, 'status']);
});

/* ===================================================================== */
/* ROTTE ADMIN — Accessibili solo dagli amministratori                   */
/* Il middleware CheckAdmin verifica che l'utente abbia ruolo "Admin".  */
/* Queste rotte alimentano il pannello di amministrazione del sito.    */
/* ===================================================================== */
Route::middleware(['auth:sanctum', CheckAdmin::class])->prefix('admin')->group(function () {

    // --- Dashboard ---
    Route::get('/dashboard', [AdminDashboardController::class, 'dashboard']);

    // --- Ordini e Spedizioni ---
    Route::get('/orders', [OrderManagementController::class, 'orders']);
    Route::patch('/orders/{order}/status', [OrderManagementController::class, 'updateOrderStatus']);
    Route::get('/shipments', [OrderManagementController::class, 'shipments']);
    Route::patch('/orders/{order}/pudo', [OrderManagementController::class, 'updateOrderPudo']);
    Route::post('/orders/{order}/regenerate-label', [OrderManagementController::class, 'regenerateLabel']);

    // --- Portafoglio e Prelievi ---
    Route::get('/wallet/overview', [WalletManagementController::class, 'walletOverview']);
    Route::get('/wallet/users/{user}/movements', [WalletManagementController::class, 'userMovements']);
    Route::get('/withdrawals', [WalletManagementController::class, 'withdrawals']);
    Route::post('/withdrawals/{withdrawal}/approve', [WalletManagementController::class, 'approveWithdrawal']);
    Route::post('/withdrawals/{withdrawal}/reject', [WalletManagementController::class, 'rejectWithdrawal']);

    // --- Referral ---
    Route::get('/referrals', [ReferralStatsController::class, 'referralStats']);

    // --- Richieste Partner Pro ---
    Route::get('/pro-requests', [ProRequestController::class, 'index']);
    Route::patch('/pro-requests/{proRequest}/approve', [ProRequestController::class, 'approve']);
    Route::patch('/pro-requests/{proRequest}/reject', [ProRequestController::class, 'reject']);

    // --- Utenti ---
    Route::get('/users', [UserManagementController::class, 'users']);
    Route::patch('/users/{user}/approve', [UserManagementController::class, 'approveUser']);
    Route::patch('/users/{user}/role', [UserManagementController::class, 'updateUserRole']);
    Route::patch('/users/{user}/user-type', [UserManagementController::class, 'updateUserType']);
    Route::delete('/users/{user}', [UserManagementController::class, 'deleteUser']);

    // --- Contenuti (messaggi, impostazioni) ---
    Route::get('/contact-messages', [AdminContentController::class, 'contactMessages']);
    Route::patch('/contact-messages/{id}/read', [AdminContentController::class, 'markContactMessageRead']);
    Route::get('/settings', [AdminContentController::class, 'settings']);
    Route::post('/settings', [AdminContentController::class, 'updateSettings']);

    // --- Articoli (guide e servizi) ---
    // CRUD completo per gli articoli del blog/guide/servizi
    Route::get('/articles', [ArticleController::class, 'index']);          // Lista articoli
    Route::post('/articles', [ArticleController::class, 'store']);         // Crea nuovo articolo
    Route::get('/articles/{article}', [ArticleController::class, 'show']); // Dettaglio articolo
    Route::put('/articles/{article}', [ArticleController::class, 'update']); // Modifica articolo
    Route::delete('/articles/{article}', [ArticleController::class, 'destroy']); // Elimina articolo
    // POST /api/admin/articles/{article}/upload-image — Carica immagine per un articolo
    Route::post('/articles/{article}/upload-image', [ArticleController::class, 'uploadImage']);

    // --- Fasce di prezzo ---
    // Le fasce di prezzo determinano quanto costa una spedizione in base a peso e volume
    // GET /api/admin/price-bands — Lista tutte le fasce di prezzo
    Route::get('/price-bands', [PriceBandController::class, 'index']);
    // PUT /api/admin/price-bands — Aggiorna tutte le fasce di prezzo in blocco
    Route::put('/price-bands', [PriceBandController::class, 'bulkUpdate']);
    // POST /api/admin/price-bands/seed — Inizializza le fasce di prezzo con i valori predefiniti
    Route::post('/price-bands/seed', [PriceBandController::class, 'seed']);

    // --- Impostazioni promozione ---
    // Gestisce le promozioni mostrate in homepage (es. sconto attivo, immagine promo)
    Route::get('/promo-settings', [PriceBandController::class, 'getPromoSettings']);
    Route::post('/promo-settings', [PriceBandController::class, 'savePromoSettings']);
    Route::post('/promo-settings/upload-image', [PriceBandController::class, 'uploadPromoImage']);

    // --- Homepage ---
    Route::post('/homepage-image', [AdminContentController::class, 'uploadHomepageImage']);
    Route::get('/homepage-image', [AdminContentController::class, 'getHomepageImage']);

    // --- Coupon ---
    Route::get('/coupons', [AdminCouponController::class, 'coupons']);
    Route::post('/coupons', [AdminCouponController::class, 'storeCoupon']);
    Route::put('/coupons/{coupon}', [AdminCouponController::class, 'updateCoupon']);
    Route::delete('/coupons/{coupon}', [AdminCouponController::class, 'deleteCoupon']);
});

/* ===================================================================== */
/* ROTTE PUBBLICHE — Contenuti dinamici del sito                        */
/* Accessibili senza login, usate dal frontend per mostrare guide,     */
/* servizi e fasce di prezzo pubbliche.                                 */
/* ===================================================================== */
Route::prefix('public')->group(function () {
    // GET /api/public/guides — Lista tutte le guide pubblicate
    Route::get('/guides', [PublicArticleController::class, 'guides']);
    // GET /api/public/guides/{slug} — Dettaglio di una guida specifica (per URL amichevole)
    Route::get('/guides/{slug}', [PublicArticleController::class, 'guide']);
    // GET /api/public/services — Lista tutti i servizi offerti
    Route::get('/services', [PublicArticleController::class, 'services']);
    // GET /api/public/services/{slug} — Dettaglio di un servizio specifico
    Route::get('/services/{slug}', [PublicArticleController::class, 'service']);
    // GET /api/public/price-bands — Fasce di prezzo pubbliche (mostrate nel preventivo)
    Route::get('/price-bands', [PublicPriceBandController::class, 'index']);
    // GET /api/public/homepage-image — Immagine principale della homepage
    Route::get('/homepage-image', [AdminContentController::class, 'getHomepageImage']);
});
