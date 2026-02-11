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
    public function redirectToGoogle() {
        return Socialite::driver('google')->stateless()->with(['prompt' => 'select_account consent'])->redirect();
    }

    // Callback da Google
    public function handleGoogleCallback() {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Exception $e) {
            return redirect(config('app.frontend_url', config('app.url')) . '/autenticazione?error=google_failed');
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

        return redirect(config('app.frontend_url', config('app.url')) . '/account');
    }
}
