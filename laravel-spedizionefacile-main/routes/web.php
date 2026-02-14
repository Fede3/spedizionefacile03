<?php

/**
 * ROTTE WEB (web.php)
 *
 * Questo file definisce TUTTE le URL (indirizzi) disponibili sul sito
 * e cosa succede quando un utente visita ognuna di esse.
 *
 * Le rotte sono organizzate cosi':
 * 1. Rotte pubbliche - accessibili da tutti senza login
 * 2. Rotte protette (auth:sanctum) - accessibili solo da utenti loggati
 * 3. Rotte admin (CheckAdmin) - accessibili solo dagli amministratori
 *
 * Tutte le rotte sono dentro il prefisso "api/" perche' il frontend Nuxt
 * comunica con il backend Laravel tramite chiamate API.
 *
 * Il "throttle" limita il numero di richieste per minuto per prevenire abusi
 * (es. throttle:5,1 = massimo 5 richieste al minuto).
 */

use App\Http\Middleware\CheckCart;
use App\Http\Middleware\CheckAdmin;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CartController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\GoogleController;
use App\Http\Controllers\StripeController;
use App\Http\Controllers\AddressController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\ShipmentController;
use App\Http\Controllers\GuestCartController;
use App\Http\Controllers\CustomLoginController;
use App\Http\Controllers\UserAddressController;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\StripeConnectController;
use App\Http\Controllers\StripeWebhookController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\ChangePasswordController;
use App\Http\Controllers\CustomRegisterController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\PasswordResetRequestController;
use App\Http\Controllers\SavedShipmentController;
use App\Http\Controllers\ReferralController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\BrtController;
use App\Http\Controllers\RefundController;

// Pagina principale del backend Laravel (non usata dal frontend Nuxt)
Route::get('/', function () {
    return view('welcome');
});

// Reindirizza la rotta /login alla pagina di autenticazione del frontend
Route::get('/login', function () {
    return redirect('/autenticazione');
})->name('login');

// Webhook di Stripe - riceve notifiche di pagamento da Stripe (pubblico, senza login)
Route::post('/stripe/webhook', [StripeWebhookController::class, 'handle']);

// Callback di Google dopo il login con Google
Route::get('/auth/google/callback', [GoogleController::class, 'handleGoogleCallback']);

// ==========================================
// TUTTE LE ROTTE API (prefisso /api/)
// ==========================================
Route::group(['prefix' => 'api'], function() {

    /* ===== REGISTRAZIONE ===== */
    // Crea un nuovo account utente (max 5 tentativi al minuto)
    Route::middleware(['throttle:5,1'])->post('/custom-register', [CustomRegisterController::class, 'register']);

    // Reindirizza l'utente alla pagina di login di Google
    Route::get('/auth/google/redirect', [GoogleController::class, 'redirectToGoogle']);

    // Carica un'immagine (solo admin)
    Route::post('/upload-file', [UserController::class, 'uploadFile'])
            ->middleware(CheckAdmin::class);

    // Recupera l'immagine dell'admin (pubblica)
    Route::get('/get-admin-image', [UserController::class, 'getAdminImage']);

    /* ===== LOGIN ===== */
    // Effettua il login con email e password (max 10 tentativi al minuto)
    Route::middleware(['throttle:10,1'])->post('/custom-login', [CustomLoginController::class, 'login']);
    // Reinvia l'email di verifica (max 5 al minuto)
    Route::middleware(['throttle:5,1'])->post('/resend-verification-email', [CustomLoginController::class, 'resendVerificationEmail']);
    // Verifica il codice di conferma inviato via email (max 10 al minuto)
    Route::middleware(['throttle:10,1'])->post('/verify-code', [CustomLoginController::class, 'verifyCode']);

    /* ===== CONFERMA EMAIL ===== */
    // Link di verifica email (cliccato dall'utente nell'email ricevuta)
    // Il middleware 'signed' garantisce che il link non sia stato manomesso
    Route::get('/verify-email/{id}', [VerificationController::class, 'verify'])
            ->middleware('signed')
            ->name('verification.verify');


    /* ===== COMUNI, CAP, PROVINCE (autocompletamento indirizzi) ===== */
    // Cerca localita' per nome (es. "Mil" -> "Milano")
    Route::get('/locations/search', [LocationController::class, 'search']);
    // Cerca localita' per CAP (es. "20121" -> "Milano, MI")
    Route::get('/locations/by-cap', [LocationController::class, 'byCap']);

    /* ===== RECUPERO E MODIFICA PASSWORD ===== */
    // Invia email con link per recuperare la password (max 5 al minuto)
    Route::middleware(['throttle:5,1'])->post('/forgot-password', [PasswordResetRequestController::class, 'sendEmail']);
    // Reimposta la password con il token ricevuto via email (max 5 al minuto)
    Route::middleware(['throttle:5,1'])->post('/update-password', [ChangePasswordController::class, 'passwordResetProcess']);


    // Mostra i dati della sessione corrente
    Route::get('/session', [SessionController::class, 'show']);
    // Salva i dati del primo step del preventivo
    Route::post('/session/first-step', [SessionController::class, 'firstStep']);

    /* COLLI E INDIRIZZI PARTENZA E DESTINAZIONE INSIEME */
    /* Route::apiResource('shipments', ShipmentController::class); */

    // Carrello per utenti non loggati (ospiti)
    Route::apiResource('guest-cart', GuestCartController::class);

    // Svuota il carrello dell'ospite
    Route::delete('empty-guest-cart', [GuestCartController::class, 'emptyCart']);

    /* ===== TRACKING PUBBLICO ===== */
    // Cerca una spedizione per codice tracking (pubblico, senza login)
    Route::middleware(['throttle:15,1'])->get('/tracking/search', [BrtController::class, 'publicTracking']);

    /* ===== CONTATTACI ===== */
    // Invia un messaggio dal form "Contattaci" (max 5 al minuto)
    Route::middleware(['throttle:5,1'])->post('/contact', [ContactController::class, 'store']);

    /* ===================================================================== */
    /* ROTTE PROTETTE - Accessibili solo da utenti loggati (auth:sanctum)    */
    /* ===================================================================== */
    Route::group(['middleware' => ['auth:sanctum']], function() {
        /* ===== INFORMAZIONI UTENTE ===== */
        // CRUD completo per l'utente (profilo, modifica dati, elimina account)
        Route::apiResource('users', UserController::class);

        /* ===== INDIRIZZI UTENTE (RUBRICA) ===== */
        // CRUD completo per la rubrica indirizzi dell'utente
        Route::apiResource('user-addresses', UserAddressController::class);

        /* Route::apiResource('user_addresses', UserAddressController::class); */
            /* ->parameters([
                'user_addresses' => 'user_addresses:identifier'
            ]); */


        // Collega l'account Stripe dell'utente (per Partner Pro)
        Route::get('/stripe/connect', [StripeConnectController::class, 'connect']);
        Route::get('/stripe/callback', [StripeConnectController::class, 'callback']);

        // Crea un account Stripe per l'utente
        Route::get('/stripe/create-account', [StripeConnectController::class, 'createAccount']);


        /* ===== CARRELLO (utente loggato) ===== */
        // Svuota il carrello
        Route::delete('empty-cart', [CartController::class, 'emptyCart']);

        // Unisce automaticamente i pacchi identici nel carrello (prima di apiResource per evitare conflitto)
        Route::post('cart/merge', [CartController::class, 'mergeIdentical']);
        // CRUD completo per il carrello
        Route::apiResource('cart', CartController::class);
        // Aggiorna la quantita' di un pacco nel carrello
        Route::patch('cart/{id}/quantity', [CartController::class, 'updateQuantity']);

        // CRUD completo per i pacchi
        Route::apiResource('packages', PackageController::class);

        // Completa un ordine con pagamento non-Stripe (portafoglio/bonifico)
        Route::post('stripe/mark-order-completed', [StripeController::class, 'markOrderCompleted']);

        // Pagamento di un ordine gia' esistente (fuori dal CheckCart perche' il carrello potrebbe essere vuoto)
        Route::post('stripe/existing-order-payment', [StripeController::class, 'createPayment']);
        Route::post('stripe/existing-order-payment-intent', [StripeController::class, 'createPaymentIntent']);
        Route::post('stripe/existing-order-paid', [StripeController::class, 'orderPaid']);

        /* ===== PAGAMENTO (richiede carrello non vuoto) ===== */
        Route::group(['middleware' => [CheckCart::class]], function() {
            // Crea un pagamento Stripe dal carrello
            Route::post('stripe/create-payment', [StripeController::class, 'createPayment']);

            // Crea un ordine dal carrello
            Route::post('stripe/create-order', [StripeController::class, 'createOrder']);

            // Crea un PaymentIntent Stripe (per pagamenti con carta)
            Route::post('stripe/create-payment-intent', [StripeController::class, 'createPaymentIntent']);

            // Conferma che l'ordine e' stato pagato
            Route::post('stripe/order-paid', [StripeController::class, 'orderPaid']);
        });

        /* ===== IMPOSTAZIONI STRIPE (admin) ===== */
        Route::get('settings/stripe', [SettingsController::class, 'getStripeConfig']);
        Route::post('settings/stripe', [SettingsController::class, 'saveStripeConfig']);

        // Crea un SetupIntent per salvare una nuova carta di credito
        Route::post('stripe/create-setup-intent', [StripeController::class, 'createSetupIntent']);

        // Lista tutte le carte di credito salvate dell'utente
        Route::get('stripe/payment-methods', [StripeController::class, 'listPaymentMethods']);

        // Imposta la carta di credito predefinita
        Route::post('stripe/set-default-payment-method', [StripeController::class, 'setDefaultPaymentMethod']);

        // Cambia la carta predefinita
        Route::post('stripe/change-default-payment-method', [StripeController::class, 'changeDefaultPaymentMethod']);

        // Legge la carta predefinita corrente
        Route::get('stripe/default-payment-method', [StripeController::class, 'getDefaultPaymentMethod']);

        // Elimina una carta di credito salvata
        Route::delete('stripe/delete-card', [StripeController::class, 'deleteCard']);



        /* ===== INDIRIZZI PARTENZA E DESTINAZIONE ===== */
        Route::apiResource('addresses', AddressController::class);

        /* ===== ORDINI ===== */
        // CRUD completo per gli ordini
        Route::apiResource('orders', OrderController::class);
        // Annulla un ordine (con eventuale rimborso)
        Route::post('orders/{order}/cancel', [OrderController::class, 'cancel']);
        // Controlla se un ordine e' idoneo al rimborso
        Route::get('orders/{order}/refund-eligibility', [RefundController::class, 'checkRefundEligibility']);
        // Aggiungi un collo a un ordine in attesa
        Route::post('orders/{order}/add-package', [OrderController::class, 'addPackage']);
        // Crea un ordine diretto (senza carrello)
        Route::post('create-direct-order', [OrderController::class, 'createDirectOrder']);

        // Calcola lo sconto di un coupon
        Route::post('calculate-coupon', [CouponController::class, 'calculateCoupon']);

        /* ===== SPEDIZIONI CONFIGURATE (modelli salvati per riuso) ===== */
        Route::get('saved-shipments', [SavedShipmentController::class, 'index']);
        Route::post('saved-shipments', [SavedShipmentController::class, 'store']);
        Route::put('saved-shipments/{id}', [SavedShipmentController::class, 'update']);
        Route::delete('saved-shipments/{id}', [SavedShipmentController::class, 'destroy']);
        // Aggiunge una spedizione salvata al carrello
        Route::post('saved-shipments/add-to-cart', [SavedShipmentController::class, 'addToCart']);

        /* BRAINTREETOKEN */
        /* Route::get('braintreeToken', 'App\Http\Controllers\PaymentMethodController@generateCustomerBraintreeToken'); */

        /* METODI DI PAGAMENTO */
        /* Route::post('addCard', 'App\Http\Controllers\PaymentMethodController@addCard');
        Route::post('editInfoCard', 'App\Http\Controllers\PaymentMethodController@editInfoCard');
        Route::post('deleteCard', 'App\Http\Controllers\PaymentMethodController@deleteCard');

        Route::get('paymentMethods/{customerId}', 'App\Http\Controllers\PaymentMethodController@getPaymentMethods');

        Route::get('defaultPaymentMethod/{customerId}', 'App\Http\Controllers\PaymentMethodController@getDefaultPaymentMethod'); */

        /* ===== ADMIN - TEST BRT ===== */
        Route::middleware([CheckAdmin::class])->group(function () {
            // Test creazione spedizione BRT (solo admin)
            Route::post('admin/brt/test-create', [BrtController::class, 'testCreate']);
        });

        /* ===== BRT - GESTIONE SPEDIZIONI ===== */
        // Crea una nuova spedizione BRT
        Route::post('brt/create-shipment', [BrtController::class, 'createShipment']);
        // Conferma una spedizione BRT
        Route::post('brt/confirm-shipment', [BrtController::class, 'confirmShipment']);
        // Cancella una spedizione BRT
        Route::post('brt/delete-shipment', [BrtController::class, 'deleteShipment']);
        // Scarica l'etichetta di spedizione BRT (PDF)
        Route::get('brt/label/{order}', [BrtController::class, 'downloadLabel']);
        // Controlla lo stato della spedizione (tracking)
        Route::get('brt/tracking/{order}', [BrtController::class, 'tracking']);

        /* ===== BRT - PUDO (Punti di ritiro/consegna) ===== */
        // Cerca punti di ritiro BRT per indirizzo
        Route::get('brt/pudo/search', [BrtController::class, 'pudoSearch']);
        // Cerca punti di ritiro BRT nelle vicinanze
        Route::get('brt/pudo/nearby', [BrtController::class, 'pudoNearby']);
        // Dettagli di un punto di ritiro specifico
        Route::get('brt/pudo/{pudoId}', [BrtController::class, 'pudoDetails']);
    });
});
