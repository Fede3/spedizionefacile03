<?php

/**
 * ROTTE AUTENTICAZIONE E GESTIONE UTENTE
 *
 * Include: utente corrente, logout, login, registrazione, verifica email,
 * recupero password, OAuth social, upload file admin, confirm password.
 */

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AppleController;
use App\Http\Controllers\FacebookController;
use App\Http\Controllers\GoogleController;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\RegisterController;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\ChangePasswordController;
use App\Http\Controllers\CustomRegisterController;
use App\Http\Controllers\PasswordResetRequestController;
use App\Http\Middleware\CheckAdmin;
use App\Support\AuthUiCookie;

/* ===== UTENTE CORRENTE E LOGOUT ===== */

Route::get('/user', function (Request $request) {
    return response()->json($request->user())
        ->cookie(AuthUiCookie::issueForUser($request->user(), Auth::guard('web')->viaRemember()));
})->middleware('auth:sanctum');

Route::post('/logout', function (Request $request) {
    // GDPR-07: Revoca tutti i token Sanctum prima del logout
    $request->user()->tokens()->delete();

    Auth::guard('web')->logout();
    if ($request->hasSession()) {
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
    return response()->json(['message' => 'Logged out'])
        ->cookie(AuthUiCookie::forget());
})->middleware('auth:sanctum');

/* ===== REGISTRAZIONE ===== */

Route::middleware(['throttle:5,1'])->post('/custom-register', [CustomRegisterController::class, 'register']);

/* ===== PROVIDER OAUTH ===== */

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

/* ===== LOGIN ===== */

Route::middleware(['throttle:10,1'])->post('/custom-login', [LoginController::class, 'login']);
Route::middleware(['throttle:5,1'])->post('/resend-verification-email', [RegisterController::class, 'resendVerificationEmail']);
Route::middleware(['throttle:5,1'])->post('/verify-code', [RegisterController::class, 'verifyCode']);

/* ===== CONFERMA EMAIL ===== */

Route::get('/verify-email/{id}', [VerificationController::class, 'verify'])
    ->middleware('signed')
    ->name('verification.verify');

/* ===== RECUPERO PASSWORD ===== */

Route::middleware(['throttle:5,1'])->post('/forgot-password', [PasswordResetRequestController::class, 'sendEmail']);
Route::middleware(['throttle:5,1'])->post('/update-password', [ChangePasswordController::class, 'passwordResetProcess']);

/* ===== UPLOAD FILE (admin) E IMMAGINE ADMIN ===== */

Route::post('/upload-file', [UserController::class, 'uploadFile'])
    ->middleware(['auth:sanctum', CheckAdmin::class]);
Route::get('/get-admin-image', [UserController::class, 'getAdminImage']);

/* ===== ROTTE PROTETTE UTENTE ===== */

Route::group(['middleware' => ['auth:sanctum']], function () {
    Route::post('/auth/confirm-password', [LoginController::class, 'confirmPassword']);
    // Solo le rotte necessarie — NO apiResource completo che espone GET /api/users
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::put('/users/{user}', [UserController::class, 'update']);
});
