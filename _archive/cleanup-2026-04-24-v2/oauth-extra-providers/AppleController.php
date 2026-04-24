<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AppleJwtService;
use App\Support\AuthUiCookie;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * FILE: AppleController.php
 * SCOPO: Sign in with Apple OAuth con state session-based + nonce (RFC 6749/OIDC).
 *
 * SICUREZZA (Sprint 6.3 — BLOCKER GO-LIVE):
 *   - State in SESSIONE (non cookie), TTL 10 min, single-shot via pull().
 *   - Nonce aggiuntivo per validare l'ID token contro replay (OIDC best practice,
 *     https://developer.apple.com/documentation/signinwithapplerestapi).
 *   - PKCE NON supportato da Sign in with Apple (REST API): state+nonce sono
 *     le contromisure equivalenti.
 *   - Ogni state/nonce mismatch logga su channel "security".
 */
class AppleController extends Controller
{
    /** TTL state/nonce in minuti. */
    private const STATE_TTL_MINUTES = 10;

    private const SESSION_STATE_KEY = 'oauth_state_apple';
    private const SESSION_STATE_CREATED_KEY = 'oauth_state_apple_created_at';
    private const SESSION_NONCE_KEY = 'oauth_nonce_apple';

    private AppleJwtService $jwt;

    public function __construct(?AppleJwtService $jwt = null)
    {
        $this->jwt = $jwt ?? new AppleJwtService();
    }

    public function redirectToApple(Request $request)
    {
        $frontend = $this->resolveAllowedFrontendUrl((string) $request->query('frontend', ''));
        $redirectPath = $this->normalizeRedirectPath((string) $request->query('redirect', '/'));

        if (!$this->isAppleConfigured()) {
            return $this->redirectWithFrontendError($frontend, $redirectPath, 'apple_unavailable');
        }

        $state = Str::random(40);
        $nonce = Str::random(40);
        $intent = trim((string) $request->query('intent', 'login'));
        $referral = trim((string) $request->query('ref', ''));
        $userType = trim((string) $request->query('user_type', ''));

        // Salviamo state + nonce in SESSIONE (bound al session id). Fix CVSS 5.9.
        $request->session()->put(self::SESSION_STATE_KEY, $state);
        $request->session()->put(self::SESSION_STATE_CREATED_KEY, now()->timestamp);
        $request->session()->put(self::SESSION_NONCE_KEY, $nonce);

        $query = http_build_query([
            'client_id' => config('services.apple.client_id'), 'redirect_uri' => config('services.apple.redirect'),
            'response_type' => 'code', 'response_mode' => 'form_post', 'scope' => 'name email',
            'state' => $state, 'nonce' => $nonce,
        ]);

        return redirect('https://appleid.apple.com/auth/authorize?' . $query)
            ->withCookie($this->cookie('frontend_redirect', $frontend))
            ->withCookie($this->cookie('frontend_redirect_path', $redirectPath))
            ->withCookie($this->cookie('frontend_social_intent', $intent === 'register' ? 'register' : 'login'))
            ->withCookie($this->cookie('frontend_social_referral', $referral !== '' ? strtoupper($referral) : ''))
            ->withCookie($this->cookie('frontend_social_user_type', in_array($userType, ['privato', 'commerciante'], true) ? $userType : 'privato'));
    }

    public function handleAppleCallback(Request $request)
    {
        $frontendUrl = $this->resolveAllowedFrontendUrl((string) ($request->cookie('frontend_redirect') ?: $this->fallbackFrontendUrl()));
        $redirectPath = $this->normalizeRedirectPath((string) ($request->cookie('frontend_redirect_path') ?: '/'));

        if (!$this->isAppleConfigured()) {
            return $this->clearSocialCookies($this->redirectWithFrontendError($frontendUrl, $redirectPath, 'apple_unavailable'), $request);
        }

        // pull() = read+delete atomic → replay bloccato.
        $expectedState = (string) $request->session()->pull(self::SESSION_STATE_KEY, '');
        $stateCreatedAt = (int) $request->session()->pull(self::SESSION_STATE_CREATED_KEY, 0);
        $expectedNonce = (string) $request->session()->pull(self::SESSION_NONCE_KEY, '');
        $receivedState = trim((string) $request->input('state', $request->query('state', '')));

        if ($expectedState === '' || $receivedState === '' || !hash_equals($expectedState, $receivedState)) {
            $this->logSecurityEvent($request, 'state.mismatch');
            return $this->clearSocialCookies($this->redirectWithFrontendError($frontendUrl, $redirectPath, 'apple_invalid_state'), $request);
        }

        if ($stateCreatedAt <= 0 || Carbon::createFromTimestamp($stateCreatedAt)->addMinutes(self::STATE_TTL_MINUTES)->isPast()) {
            $this->logSecurityEvent($request, 'state.expired', ['age_seconds' => $stateCreatedAt > 0 ? now()->timestamp - $stateCreatedAt : null]);
            return $this->clearSocialCookies($this->redirectWithFrontendError($frontendUrl, $redirectPath, 'apple_invalid_state'), $request);
        }

        if ($request->filled('error')) {
            return $this->clearSocialCookies($this->redirectWithFrontendError($frontendUrl, $redirectPath, 'apple_failed'), $request);
        }

        $authorizationCode = trim((string) $request->input('code', ''));
        if ($authorizationCode === '') {
            return $this->clearSocialCookies($this->redirectWithFrontendError($frontendUrl, $redirectPath, 'apple_failed'), $request);
        }

        try {
            $tokenResponse = Http::asForm()->acceptJson()->post('https://appleid.apple.com/auth/token', [
                'grant_type' => 'authorization_code', 'code' => $authorizationCode,
                'redirect_uri' => config('services.apple.redirect'), 'client_id' => config('services.apple.client_id'),
                'client_secret' => $this->jwt->buildAppleClientSecret(),
            ]);

            if (!$tokenResponse->successful()) throw new \RuntimeException('Apple token exchange fallito.');
            $idToken = trim((string) $tokenResponse->json('id_token', ''));
            if ($idToken === '') throw new \RuntimeException('Apple non ha restituito id_token.');

            $claims = $this->jwt->parseIdTokenClaims($idToken);
            $this->jwt->validateAppleClaims($claims);

            // Nonce binding (OIDC): se Apple ha restituito un nonce, DEVE matchare
            // quello salvato in sessione prima del redirect. Se il claim manca
            // (flussi form_post legacy) la validazione state copre il vettore CSRF.
            $returnedNonce = trim((string) ($claims['nonce'] ?? ''));
            if ($expectedNonce !== '' && $returnedNonce !== '' && !hash_equals($expectedNonce, $returnedNonce)) {
                $this->logSecurityEvent($request, 'nonce.mismatch');
                throw new \RuntimeException('Apple nonce mismatch.');
            }
        } catch (\Throwable $e) {
            return $this->clearSocialCookies($this->redirectWithFrontendError($frontendUrl, $redirectPath, 'apple_failed'), $request);
        }

        $appleId = trim((string) ($claims['sub'] ?? ''));
        $appleEmail = trim((string) ($claims['email'] ?? ''));
        $appleUserPayload = $this->parseAppleUserPayload($request);

        $user = User::where('apple_id', $appleId)->first();
        if (!$user && $appleEmail !== '') $user = User::where('email', $appleEmail)->first();

        if ($user) {
            $dirty = false;
            if (!$user->apple_id) {
                $user->apple_id = $appleId;
                $dirty = true;
            }
            if (!$user->email_verified_at) {
                $user->email_verified_at = now();
                $dirty = true;
            }
            if ($dirty) {
                $user->save();
            }
        } else {
            if ($appleEmail === '') {
                return $this->clearSocialCookies($this->redirectWithFrontendError($frontendUrl, $redirectPath, 'apple_email_missing'));
            }
            $user = $this->createUserFromApple($request, $appleId, $appleEmail, $appleUserPayload, $claims);
        }

        Auth::login($user, true);
        if ($request->hasSession()) $request->session()->regenerate();

        return $this->clearSocialCookies(redirect($frontendUrl . $redirectPath)->withCookie(AuthUiCookie::issueForUser($user, true)), $request);
    }

    /**
     * Logga un evento di sicurezza su channel "security" (Sprint W1.1 → Sentry).
     */
    private function logSecurityEvent(Request $request, string $reason, array $context = []): void
    {
        Log::channel('security')->warning('oauth.apple.'.$reason, array_merge([
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
            'timestamp' => now()->toIso8601String(),
        ], $context));
    }

    private function createUserFromApple(Request $request, string $appleId, string $appleEmail, array $appleUserPayload, array $claims): User
    {
        $referralCode = strtoupper(trim((string) $request->cookie('frontend_social_referral', '')));
        $userType = trim((string) $request->cookie('frontend_social_user_type', 'privato'));
        $validatedReferral = null;

        if ($request->cookie('frontend_social_intent') === 'register' && $referralCode !== '') {
            $validatedReferral = User::where('referral_code', $referralCode)->where('role', 'Partner Pro')->value('referral_code');
        }

        [$name, $surname] = $this->splitAppleName($appleUserPayload, (string) ($claims['name'] ?? ''), $appleEmail);

        $user = new User([
            'email' => $appleEmail, 'name' => $name, 'surname' => $surname, 'telephone_number' => '',
            'email_verified_at' => now(), 'password' => Str::random(32),
            'user_type' => in_array($userType, ['privato', 'commerciante'], true) ? $userType : 'privato',
        ]);
        // Campi non in $fillable: vanno assegnati direttamente per sicurezza
        $user->role = 'User';
        $user->apple_id = $appleId;
        // referred_by gia' validato sopra contro referral_code di un Partner Pro esistente
        if ($validatedReferral !== null) {
            $user->referred_by = $validatedReferral;
        }
        $user->save();
        return $user;
    }

    private function isAppleConfigured(): bool
    {
        $hasDirectSecret = filled(config('services.apple.client_secret'));
        $hasDerivedSecret = filled(config('services.apple.team_id')) && filled(config('services.apple.key_id')) && filled(config('services.apple.private_key'));
        return filled(config('services.apple.client_id')) && filled(config('services.apple.redirect')) && ($hasDirectSecret || $hasDerivedSecret);
    }

    private function fallbackFrontendUrl(): string
    {
        return rtrim((string) config('app.frontend_url', config('app.url')), '/');
    }

    private function resolveAllowedFrontendUrl(?string $frontend): string
    {
        $fallback = $this->fallbackFrontendUrl();
        $value = trim((string) $frontend);
        if (!filter_var($value, FILTER_VALIDATE_URL)) return $fallback;

        $parts = parse_url($value);
        $host = strtolower((string) ($parts['host'] ?? ''));
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        if (!in_array($scheme, ['http', 'https'], true) || $host === '') return $fallback;

        $stateful = config('sanctum.stateful', []);
        $items = is_array($stateful) ? $stateful : explode(',', (string) $stateful);
        $statefulHosts = collect($items)->map(fn ($i) => explode(':', trim(strtolower((string) $i)))[0])->filter()->values()->all();

        $allowed = array_unique(array_filter([strtolower((string) parse_url($fallback, PHP_URL_HOST)), ...$statefulHosts, 'localhost', '127.0.0.1']));
        $isAllowed = in_array($host, $allowed, true) || str_ends_with($host, '.trycloudflare.com');

        return $isAllowed ? rtrim($value, '/') : $fallback;
    }

    private function normalizeRedirectPath(?string $redirectPath): string
    {
        $path = trim((string) $redirectPath);
        return str_starts_with($path, '/') ? $path : '/';
    }

    private function redirectWithFrontendError(string $frontendUrl, string $redirectPath, string $error)
    {
        $base = $frontendUrl . $redirectPath;
        $glue = str_contains($base, '?') ? '&' : '?';
        return redirect($base . $glue . http_build_query(['auth_modal' => 'login', 'auth_error' => $error]));
    }

    private function cookie(string $name, string $value, int $minutes = 15)
    {
        return cookie($name, $value, $minutes, '/', null, false, false);
    }

    private function clearSocialCookies($response, ?Request $request = null)
    {
        if ($request && $request->hasSession()) {
            $request->session()->forget([
                self::SESSION_STATE_KEY,
                self::SESSION_STATE_CREATED_KEY,
                self::SESSION_NONCE_KEY,
            ]);
        }

        return $response->withoutCookie('frontend_redirect')->withoutCookie('frontend_redirect_path')
            ->withoutCookie('frontend_social_intent')->withoutCookie('frontend_social_referral')
            ->withoutCookie('frontend_social_user_type')->withoutCookie('frontend_social_state');
    }

    private function parseAppleUserPayload(Request $request): array
    {
        $payload = $request->input('user');
        if (!is_string($payload) || trim($payload) === '') return [];
        $decoded = json_decode($payload, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function splitAppleName(array $appleUserPayload, ?string $fallbackName, ?string $fallbackEmail): array
    {
        $firstName = trim((string) data_get($appleUserPayload, 'name.firstName', ''));
        $lastName = trim((string) data_get($appleUserPayload, 'name.lastName', ''));
        if ($firstName !== '' || $lastName !== '') return [$firstName, $lastName];

        $fallback = trim((string) $fallbackName);
        if ($fallback !== '') {
            $parts = preg_split('/\s+/', $fallback) ?: [];
            return [array_shift($parts) ?: '', trim(implode(' ', $parts))];
        }

        $emailLocal = trim((string) Str::before((string) $fallbackEmail, '@'));
        return $emailLocal !== '' ? [Str::title(str_replace(['.', '_', '-'], ' ', $emailLocal)), ''] : ['', ''];
    }
}
