<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    // Reindirizza a Google
    public function redirectToGoogle(Request $request)
    {
        $frontend = trim((string) $request->query('frontend', ''));
        $fallbackFrontend = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        if (!filter_var($frontend, FILTER_VALIDATE_URL)) {
            $frontend = $fallbackFrontend;
        }

        $redirectUri = config('services.google.redirect');
        $response = Socialite::driver('google')
            ->stateless()
            ->redirectUrl($redirectUri)
            ->with(['prompt' => 'select_account consent'])
            ->redirect();

        return $response->withCookie(cookie('frontend_redirect', $frontend, 15, '/', null, false, false));
    }

    // Callback da Google
    public function handleGoogleCallback(Request $request)
    {
        $frontendUrl = rtrim((string) ($request->cookie('frontend_redirect') ?: config('app.frontend_url', config('app.url'))), '/');

        try {
            $redirectUri = config('services.google.redirect');
            $googleUser = Socialite::driver('google')
                ->stateless()
                ->redirectUrl($redirectUri)
                ->user();
        } catch (\Exception $e) {
            return redirect($frontendUrl . '/autenticazione?error=google_failed')->withoutCookie('frontend_redirect');
        }

        // Trova o crea l'utente
        $user = User::updateOrCreate(
            ['email' => $googleUser->email],
            [
                'name' => $googleUser->user['given_name'] ?? $googleUser->getName(),
                'surname' => $googleUser->user['family_name'] ?? '',
                'telephone_number' => '0',
                'role' => 'Cliente',
                'email_verified_at' => now(),
                'password' => Str::random(16),
            ]
        );

        // Ensure email_verified_at is set for existing users
        if (!$user->email_verified_at) {
            $user->email_verified_at = now();
            $user->save();
        }

        Auth::login($user);

        return redirect($frontendUrl . '/account')->withoutCookie('frontend_redirect');
    }
}
