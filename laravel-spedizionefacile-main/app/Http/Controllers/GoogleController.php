<?php

/**
 * FILE: GoogleController.php
 * SCOPO: Gestisce login/registrazione tramite Google OAuth (Socialite).
 *
 * COSA ENTRA:
 *   - Query param "frontend" e "redirect" per redirectToGoogle (URL di ritorno)
 *   - Callback da Google con token OAuth in handleGoogleCallback
 *
 * COSA ESCE:
 *   - Redirect a Google per autenticazione (redirectToGoogle)
 *   - Redirect al frontend con sessione autenticata (handleGoogleCallback)
 *   - Redirect con ?error=google_failed se l'autenticazione fallisce
 *
 * CHIAMATO DA:
 *   - routes/web.php — GET /auth/google (redirect a Google)
 *   - routes/web.php — GET /auth/google/callback (callback da Google)
 *   - nuxt: pages/autenticazione.vue (bottone "Accedi con Google")
 *
 * EFFETTI COLLATERALI:
 *   - Rete: chiamate OAuth a Google tramite Socialite
 *   - Database: crea utente se non esiste (ruolo "User", password casuale, email verificata)
 *   - Sessione: crea sessione autenticata (Auth::login)
 *   - Cookie: salva frontend_redirect e frontend_redirect_path (durata 15 min)
 *
 * VINCOLI:
 *   - Usa Socialite in modalita' stateless (non usa sessione per OAuth)
 *   - Il redirect_uri DEVE corrispondere a quello configurato nella Google Cloud Console
 *   - I cookie frontend_redirect durano 15 minuti (il tempo per completare il flusso Google)
 *   - Il campo "role" NON e' tra i $fillable (impostato manualmente a "User" per sicurezza)
 *   - Solo percorsi relativi (iniziano con /) sono accettati come redirect path
 *
 * ERRORI TIPICI:
 *   - Redirect con error=google_failed se Google restituisce errore
 *   - L'utente gia' registrato con email viene collegato automaticamente
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere un provider OAuth: creare un controller simile con lo stesso pattern
 *   - Per cambiare la durata del cookie: modificare il valore 15 in withCookie()
 *   - Per richiedere scope aggiuntivi: aggiungerli nella chiamata Socialite::driver()
 *
 * COLLEGAMENTI:
 *   - config/services.php — google.client_id, google.client_secret, google.redirect
 *   - CustomLoginController.php — login alternativo con email/password
 *   - pages/autenticazione.vue — bottone "Accedi con Google"
 */

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\AuthUiCookie;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;

class GoogleController extends Controller
{
    private function isGoogleConfigured(): bool
    {
        return filled(config('services.google.client_id'))
            && filled(config('services.google.client_secret'))
            && filled(config('services.google.redirect'));
    }

    private function statefulHosts(): array
    {
        $stateful = config('sanctum.stateful', []);
        $items = is_array($stateful) ? $stateful : explode(',', (string) $stateful);

        return collect($items)
            ->map(fn ($item) => trim(strtolower((string) $item)))
            ->filter()
            ->map(fn ($item) => explode(':', $item)[0])
            ->values()
            ->all();
    }

    private function fallbackFrontendUrl(): string
    {
        return rtrim((string) config('app.frontend_url', config('app.url')), '/');
    }

    private function resolveAllowedFrontendUrl(?string $frontend): string
    {
        $fallback = $this->fallbackFrontendUrl();
        $value = trim((string) $frontend);

        if (! filter_var($value, FILTER_VALIDATE_URL)) {
            return $fallback;
        }

        $parts = parse_url($value);
        $host = strtolower((string) ($parts['host'] ?? ''));
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));

        if (! in_array($scheme, ['http', 'https'], true) || $host === '') {
            return $fallback;
        }

        $fallbackHost = strtolower((string) parse_url($fallback, PHP_URL_HOST));
        $stateful = $this->statefulHosts();

        $allowed = array_unique(array_filter([
            $fallbackHost,
            ...$stateful,
            'localhost',
            '127.0.0.1',
        ]));

        $isAllowed = in_array($host, $allowed, true) || str_ends_with($host, '.trycloudflare.com');

        return $isAllowed ? rtrim($value, '/') : $fallback;
    }

    private function normalizeRedirectPath(?string $redirectPath): string
    {
        $path = trim((string) $redirectPath);

        return str_starts_with($path, '/') ? $path : '/';
    }

    private function buildFrontendUrl(string $frontendUrl, string $redirectPath, array $query = []): string
    {
        $base = $frontendUrl.$redirectPath;
        if (empty($query)) {
            return $base;
        }

        $glue = str_contains($base, '?') ? '&' : '?';

        return $base.$glue.http_build_query($query);
    }

    private function redirectWithFrontendError(string $frontendUrl, string $redirectPath, string $error)
    {
        return redirect($this->buildFrontendUrl($frontendUrl, $redirectPath, [
            'auth_modal' => 'login',
            'auth_error' => $error,
        ]));
    }

    // Reindirizza l'utente alla pagina di accesso di Google
    // L'utente scegliera' quale account Google usare
    public function redirectToGoogle(Request $request)
    {
        // Recuperiamo l'URL del frontend (il sito che l'utente sta usando)
        // per sapere dove rimandarlo dopo l'accesso
        $frontend = $this->resolveAllowedFrontendUrl((string) $request->query('frontend', ''));
        $redirectPath = $this->normalizeRedirectPath((string) $request->query('redirect', '/'));

        if (! $this->isGoogleConfigured()) {
            return $this->redirectWithFrontendError($frontend, $redirectPath, 'google_unavailable');
        }

        // Prepariamo il reindirizzamento verso Google
        $redirectUri = config('services.google.redirect');
        /** @var GoogleProvider $google */
        $google = Socialite::driver('google');
        $response = $google
            ->stateless()
            ->redirectUrl($redirectUri)
            ->with(['prompt' => 'select_account consent']) // Chiede sempre di scegliere l'account
            ->redirect();

        // Salviamo l'URL del frontend e la pagina di redirect in cookie
        // per ricordare dove rimandare l'utente dopo che Google risponde
        $intent = trim((string) $request->query('intent', 'login'));
        $referral = trim((string) $request->query('ref', ''));
        $userType = trim((string) $request->query('user_type', ''));

        return $response
            ->withCookie(cookie('frontend_redirect', $frontend, 15, '/', null, false, false))
            ->withCookie(cookie('frontend_redirect_path', $redirectPath, 15, '/', null, false, false))
            ->withCookie(cookie('frontend_social_intent', $intent === 'register' ? 'register' : 'login', 15, '/', null, false, false))
            ->withCookie(cookie('frontend_social_referral', $referral !== '' ? strtoupper($referral) : '', 15, '/', null, false, false))
            ->withCookie(cookie('frontend_social_user_type', in_array($userType, ['privato', 'commerciante'], true) ? $userType : 'privato', 15, '/', null, false, false));
    }

    // Questa funzione viene chiamata quando Google rimanda l'utente al nostro sito
    // Riceve i dati dell'utente da Google e gestisce la registrazione/accesso
    public function handleGoogleCallback(Request $request)
    {
        // Recuperiamo l'URL del frontend dal cookie salvato prima
        $frontendUrl = $this->resolveAllowedFrontendUrl((string) ($request->cookie('frontend_redirect') ?: $this->fallbackFrontendUrl()));
        $redirectPath = $this->normalizeRedirectPath((string) ($request->cookie('frontend_redirect_path') ?: '/'));

        if (! $this->isGoogleConfigured()) {
            return $this->redirectWithFrontendError($frontendUrl, $redirectPath, 'google_unavailable')
                ->withoutCookie('frontend_redirect')
                ->withoutCookie('frontend_redirect_path')
                ->withoutCookie('frontend_social_intent')
                ->withoutCookie('frontend_social_referral')
                ->withoutCookie('frontend_social_user_type');
        }

        try {
            // Chiediamo a Google i dati dell'utente che ha fatto l'accesso
            $redirectUri = config('services.google.redirect');
            /** @var GoogleProvider $google */
            $google = Socialite::driver('google');
            $googleUser = $google
                ->stateless()
                ->redirectUrl($redirectUri)
                ->user();
        } catch (\Exception $e) {
            // Se qualcosa va storto con Google, rimandiamo l'utente alla pagina di login con un errore
            return $this->redirectWithFrontendError($frontendUrl, $redirectPath, 'google_failed')
                ->withoutCookie('frontend_redirect')
                ->withoutCookie('frontend_redirect_path')
                ->withoutCookie('frontend_social_intent')
                ->withoutCookie('frontend_social_referral')
                ->withoutCookie('frontend_social_user_type');
        }

        $googleEmail = $googleUser->getEmail();
        if (! $googleEmail) {
            return $this->redirectWithFrontendError($frontendUrl, $redirectPath, 'google_email_missing')
                ->withoutCookie('frontend_redirect')
                ->withoutCookie('frontend_redirect_path')
                ->withoutCookie('frontend_social_intent')
                ->withoutCookie('frontend_social_referral')
                ->withoutCookie('frontend_social_user_type');
        }

        // Cerchiamo se esiste gia' un utente con questa email nel nostro database
        $user = User::where('email', $googleEmail)->first();

        if ($user) {
            // Utente esistente - aggiorniamo google_id e avatar se non presenti
            $dirty = false;
            if (! $user->google_id) {
                $user->google_id = $googleUser->getId();
                $dirty = true;
            }
            if (! $user->avatar && $googleUser->getAvatar()) {
                $user->avatar = $googleUser->getAvatar();
                $dirty = true;
            }
            if (! $user->email_verified_at) {
                $user->email_verified_at = now();
                $dirty = true;
            }
            if ($dirty) {
                $user->save();
            }
        } else {
            $socialIntent = $request->cookie('frontend_social_intent');
            $referralCode = strtoupper(trim((string) $request->cookie('frontend_social_referral', '')));
            $userType = trim((string) $request->cookie('frontend_social_user_type', 'privato'));
            $validatedReferral = null;

            if ($socialIntent === 'register' && $referralCode !== '') {
                $validatedReferral = User::where('referral_code', $referralCode)
                    ->where('role', 'Partner Pro')
                    ->value('referral_code');
            }

            // Se l'utente non esiste, lo creiamo con i dati di Google
            $user = new User([
                'email' => $googleEmail,
                'name' => $googleUser->user['given_name'] ?? $googleUser->getName(),
                'surname' => $googleUser->user['family_name'] ?? '',
                'telephone_number' => '',
                'email_verified_at' => now(), // L'email e' automaticamente verificata (Google l'ha gia' controllata)
                'password' => Str::random(16), // Password casuale (l'utente usa Google per accedere)
                'avatar' => $googleUser->getAvatar(),
                'referred_by' => $validatedReferral,
                'user_type' => in_array($userType, ['privato', 'commerciante'], true) ? $userType : 'privato',
            ]);
            // Campi non in $fillable: vanno assegnati direttamente per sicurezza
            $user->role = 'User';
            $user->google_id = $googleUser->getId();
            $user->save();
        }

        // Facciamo il login automatico dell'utente nel sistema
        Auth::login($user, true);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        // Reindirizziamo l'utente alla pagina dove si trovava prima del login
        return redirect($frontendUrl.$redirectPath)
            ->withCookie(AuthUiCookie::issueForUser($user, true))
            ->withoutCookie('frontend_redirect')
            ->withoutCookie('frontend_redirect_path')
            ->withoutCookie('frontend_social_intent')
            ->withoutCookie('frontend_social_referral')
            ->withoutCookie('frontend_social_user_type');
    }
}
