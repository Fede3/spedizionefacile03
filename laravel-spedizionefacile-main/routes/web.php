<?php

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

Route::get('/', function () {
    return view('welcome');
});

Route::get('/login', function () {
    return redirect('/autenticazione');
})->name('login');

Route::post('/stripe/webhook', [StripeWebhookController::class, 'handle']);

Route::get('/auth/google/callback', [GoogleController::class, 'handleGoogleCallback']);

Route::group(['prefix' => 'api'], function() {

    /* REGISTRAZIONE */
    Route::middleware(['throttle:5,1'])->post('/custom-register', [CustomRegisterController::class, 'register']);

    Route::get('/auth/google/redirect', [GoogleController::class, 'redirectToGoogle']);

    Route::post('/upload-file', [UserController::class, 'uploadFile'])
            ->middleware(CheckAdmin::class);

    Route::get('/get-admin-image', [UserController::class, 'getAdminImage']);

    /* LOGIN */
    Route::middleware(['throttle:10,1'])->post('/custom-login', [CustomLoginController::class, 'login']);
    Route::middleware(['throttle:5,1'])->post('/resend-verification-email', [CustomLoginController::class, 'resendVerificationEmail']);
    Route::middleware(['throttle:10,1'])->post('/verify-code', [CustomLoginController::class, 'verifyCode']);

    /* CONFERMA EMAIL */
    Route::get('/verify-email/{id}', [VerificationController::class, 'verify'])
            ->middleware('signed')
            ->name('verification.verify');


    /* COMUNI, CAP, PROVINCE */
    /* Route::post('/postLocation', [LocationController::class, 'postLocation']);
    Route::get('/getLocations', [LocationController::class, 'getLocations']); */
    Route::get('/locations/search', [LocationController::class, 'search']);
    Route::get('/locations/by-cap', [LocationController::class, 'byCap']);
    
    /* RECUPERO E MODIFICA PASSWORD */
    Route::post('/forgot-password', [PasswordResetRequestController::class, 'sendEmail']);
    Route::post('/update-password', [ChangePasswordController::class, 'passwordResetProcess']);


    Route::get('/session', [SessionController::class, 'show']);
    Route::post('/session/first-step', [SessionController::class, 'firstStep']);

    /* COLLI E INDIRIZZI PARTENZA E DESTINAZIONE INSIEME */
    /* Route::apiResource('shipments', ShipmentController::class); */

    Route::apiResource('guest-cart', GuestCartController::class);

    Route::delete('empty-guest-cart', [GuestCartController::class, 'emptyCart']);

    /* CONTATTACI */
    Route::middleware(['throttle:5,1'])->post('/contact', [ContactController::class, 'store']);

    /* MIDDLEWARE PER LE ROTTE QUANDO DEVI ESSERE LOGGATO */
    Route::group(['middleware' => ['auth:sanctum']], function() {
        /* INFORMAZIONI UTENTE */
        Route::apiResource('users', UserController::class);

        /* INDIRIZZI UTENTE */
        Route::apiResource('user-addresses', UserAddressController::class);

        /* Route::apiResource('user_addresses', UserAddressController::class); */
            /* ->parameters([
                'user_addresses' => 'user_addresses:identifier'
            ]); */


        Route::get('/stripe/connect', [StripeConnectController::class, 'connect']);
        Route::get('/stripe/callback', [StripeConnectController::class, 'callback']);

        Route::get('/stripe/create-account', [StripeConnectController::class, 'createAccount']);

        
        /* CARRELLO */
        Route::delete('empty-cart', [CartController::class, 'emptyCart']);

        Route::apiResource('cart', CartController::class);
        
        Route::apiResource('packages', PackageController::class);

        // Non-Stripe payment completion (wallet/bonifico) - outside CheckCart
        Route::post('stripe/mark-order-completed', [StripeController::class, 'markOrderCompleted']);

        Route::group(['middleware' => [CheckCart::class]], function() {
            Route::post('stripe/create-payment', [StripeController::class, 'createPayment']);

            Route::post('stripe/create-order', [StripeController::class, 'createOrder']);

            Route::post('stripe/create-payment-intent', [StripeController::class, 'createPaymentIntent']);

            Route::post('stripe/order-paid', [StripeController::class, 'orderPaid']);

            Route::post('stripe/webhook', [StripeWebhookController::class, 'handle']);
        });

        /* Route::post('stripe/create-payment', [StripeController::class, 'createPayment']);

        Route::post('stripe/create-order', [StripeController::class, 'createOrder']);

        Route::post('stripe/order-paid', [StripeController::class, 'orderPaid']);

        Route::post('stripe/webhook', [StripeWebhookController::class, 'handle']); */

        /* IMPOSTAZIONI */
        Route::get('settings/stripe', [SettingsController::class, 'getStripeConfig']);
        Route::post('settings/stripe', [SettingsController::class, 'saveStripeConfig']);

        Route::post('stripe/create-setup-intent', [StripeController::class, 'createSetupIntent']);

        Route::get('stripe/payment-methods', [StripeController::class, 'listPaymentMethods']);

        Route::post('stripe/set-default-payment-method', [StripeController::class, 'setDefaultPaymentMethod']);

        Route::post('stripe/change-default-payment-method', [StripeController::class, 'changeDefaultPaymentMethod']);

        Route::get('stripe/default-payment-method', [StripeController::class, 'getDefaultPaymentMethod']);

        Route::delete('stripe/delete-card', [StripeController::class, 'deleteCard']);

       

        /* COLLI */
        Route::apiResource('packages', PackageController::class);

        /* INDIRIZZI PARTENZA E DESTINAZIONE */
        Route::apiResource('addresses', AddressController::class);

        /* ORDINI */
        Route::apiResource('orders', OrderController::class);
            /* ->middleware(CheckAdmin::class); */

        Route::post('calculate-coupon', [CouponController::class, 'calculateCoupon']);

        /* SPEDIZIONI CONFIGURATE (SAVED SHIPMENTS) */
        Route::get('saved-shipments', [SavedShipmentController::class, 'index']);
        Route::post('saved-shipments', [SavedShipmentController::class, 'store']);
        Route::put('saved-shipments/{id}', [SavedShipmentController::class, 'update']);
        Route::delete('saved-shipments/{id}', [SavedShipmentController::class, 'destroy']);
        Route::post('saved-shipments/add-to-cart', [SavedShipmentController::class, 'addToCart']);

        /* BRAINTREETOKEN */
        /* Route::get('braintreeToken', 'App\Http\Controllers\PaymentMethodController@generateCustomerBraintreeToken'); */

        /* METODI DI PAGAMENTO */
        /* Route::post('addCard', 'App\Http\Controllers\PaymentMethodController@addCard');
        Route::post('editInfoCard', 'App\Http\Controllers\PaymentMethodController@editInfoCard');
        Route::post('deleteCard', 'App\Http\Controllers\PaymentMethodController@deleteCard');

        Route::get('paymentMethods/{customerId}', 'App\Http\Controllers\PaymentMethodController@getPaymentMethods');

        Route::get('defaultPaymentMethod/{customerId}', 'App\Http\Controllers\PaymentMethodController@getDefaultPaymentMethod'); */

        /* MESSAGGI CONTATTO (ADMIN) */
        Route::middleware([CheckAdmin::class])->group(function () {
            Route::get('admin/contact-messages', [ContactController::class, 'index']);
            Route::patch('admin/contact-messages/{id}/read', [ContactController::class, 'markAsRead']);
        });
    });
});