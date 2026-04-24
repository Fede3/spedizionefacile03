<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\AuthUiCookie;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\FacebookProvider;

/**
 * FILE: FacebookController.php
 * SCOPO: Facebook OAuth con state session-based (Sprint 6.3 BLOCKER GO-LIVE).
 *
 * SICUREZZA:
 *   - State in SESSIONE (non cookie), TTL 10 min, single-shot via pull().
 *   - PKCE non applicato: Facebook Login non supporta S256 via Graph API flow
 *     legacy; state + Sanctum CSRF rimangono difese primarie.
 */
class FacebookController extends Controller
{
    private const STATE_TTL_MINUTES = 10;
    private const SESSION_STATE_KEY = 'oauth_state_facebook';
    private const SESSION_STATE_CREATED_KEY = 'oauth_state_facebook_created_at';

    private function isFacebookConfigured(): bool
    {
        return filled(config('services.facebook.client_id'))
            && filled(config('services.facebook.client_secret'))
            && filled(config('services.facebook.redirect'));
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

    private function splitName(?string $fullName): array
    {
        $value = trim((string) $fullName);
        if ($value === '') {
            return ['', ''];
        }

        $parts = preg_split('/\s+/', $value) ?: [];
        $name = array_shift($parts) ?: '';
        $surname = trim(implode(' ', $parts));

        return [$name, $surname];
    }

    public function redirectToFacebook(Request $request)
    {
        $frontend = $this->resolveAllowedFrontendUrl((string) $request->query('frontend', ''));
        $redirectPath = $this->normalizeRedirectPath((string) $request->query('redirect', '/'));

        if (! $this->isFacebookConfigured()) {
            return $this->redirectWithFrontendError($frontend, $redirectPath, 'facebook_unavailable');
        }

        $state = Str::random(40);
        $request->session()->put(self::SESSION_STATE_KEY, $state);
        $request->session()->put(self::SESSION_STATE_CREATED_KEY, now()->timestamp);

        $redirectUri = config('services.facebook.redirect');
        /** @var FacebookProvider $facebook */
        $facebook = Socialite::driver('facebook');
        $response = $facebook
            ->stateless()
            ->redirectUrl($redirectUri)
            ->scopes(['email'])
            ->with(['state' => $state])
            ->redirect();

        $intent = trim((string) $request->query('intent', 'login'));
        $referral = trim((string) $request->query('ref', ''));
        $userType = trim((string) $request->query('user_type', ''));

        return $response
            ->withCookie(cookie('frontend_redirect', $frontend, self::STATE_TTL_MINUTES, '/', null, false, false))
            ->withCookie(cookie('frontend_redirect_path', $redirectPath, self::STATE_TTL_MINUTES, '/', null, false, false))
            ->withCookie(cookie('frontend_social_intent', $intent === 'register' ? 'register' : 'login', self::STATE_TTL_MINUTES, '/', null, false, false))
            ->withCookie(cookie('frontend_social_referral', $referral !== '' ? strtoupper($referral) : '', self::STATE_TTL_MINUTES, '/', null, false, false))
            ->withCookie(cookie('frontend_social_user_type', in_array($userType, ['privato', 'commerciante'], true) ? $userType : 'privato', self::STATE_TTL_MINUTES, '/', null, false, false));
    }

    public function handleFacebookCallback(Request $request)
    {
        $frontendUrl = $this->resolveAllowedFrontendUrl((string) ($request->cookie('frontend_redirect') ?: $this->fallbackFrontendUrl()));
        $redirectPath = $this->normalizeRedirectPath((string) ($request->cookie('frontend_redirect_path') ?: '/'));

        if (! $this->isFacebookConfigured()) {
            return $this->clearSocialState(
                $this->redirectWithFrontendError($frontendUrl, $redirectPath, 'facebook_unavailable'),
                $request
            );
        }

        // pull() atomic: blocca replay sul medesimo session id.
        $expectedState = (string) $request->session()->pull(self::SESSION_STATE_KEY, '');
        $stateCreatedAt = (int) $request->session()->pull(self::SESSION_STATE_CREATED_KEY, 0);
        $receivedState = trim((string) $request->query('state', ''));

        if ($expectedState === '' || $receivedState === '' || ! hash_equals($expectedState, $receivedState)) {
            $this->logSecurityEvent($request, 'state.mismatch');
            return $this->clearSocialState(
                $this->redirectWithFrontendError($frontendUrl, $redirectPath, 'facebook_invalid_state'),
                $request
            );
        }

        if ($stateCreatedAt <= 0 || Carbon::createFromTimestamp($stateCreatedAt)->addMinutes(self::STATE_TTL_MINUTES)->isPast()) {
            $this->logSecurityEvent($request, 'state.expired', ['age_seconds' => $stateCreatedAt > 0 ? now()->timestamp - $stateCreatedAt : null]);
            return $this->clearSocialState(
                $this->redirectWithFrontendError($frontendUrl, $redirectPath, 'facebook_invalid_state'),
                $request
            );
        }

        try {
            $redirectUri = config('services.facebook.redirect');
            /** @var FacebookProvider $facebook */
            $facebook = Socialite::driver('facebook');
            $facebookUser = $facebook
                ->stateless()
                ->redirectUrl($redirectUri)
                ->user();
        } catch (\Exception $e) {
            return $this->clearSocialState(
                $this->redirectWithFrontendError($frontendUrl, $redirectPath, 'facebook_failed'),
                $request
            );
        }

        $facebookEmail = $facebookUser->getEmail();
        if (! $facebookEmail) {
            return $this->clearSocialState(
                $this->redirectWithFrontendError($frontendUrl, $redirectPath, 'facebook_email_missing'),
                $request
            );
        }

        $user = User::where('email', $facebookEmail)->first();

        if ($user) {
            $dirty = false;
            if (! $user->facebook_id) {
                $user->facebook_id = $facebookUser->getId();
                $dirty = true;
            }
            if (! $user->avatar && $facebookUser->getAvatar()) {
                $user->avatar = $facebookUser->getAvatar();
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

            [$name, $surname] = $this->splitName($facebookUser->getName());

            $user = new User([
                'email' => $facebookEmail,
                'name' => $name,
                'surname' => $surname,
                'telephone_number' => '',
                'email_verified_at' => now(),
                'password' => Str::random(16),
                'avatar' => $facebookUser->getAvatar(),
                'user_type' => in_array($userType, ['privato', 'commerciante'], true) ? $userType : 'privato',
            ]);
            // Campi non in $fillable: vanno assegnati direttamente per sicurezza
            $user->role = 'User';
            $user->facebook_id = $facebookUser->getId();
            // referred_by gia' validato sopra contro referral_code di un Partner Pro esistente
            if ($validatedReferral !== null) {
                $user->referred_by = $validatedReferral;
            }
            $user->save();
        }

        Auth::login($user, true);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return redirect($frontendUrl.$redirectPath)
            ->withCookie(AuthUiCookie::issueForUser($user, true))
            ->withoutCookie('frontend_redirect')
            ->withoutCookie('frontend_redirect_path')
            ->withoutCookie('frontend_social_intent')
            ->withoutCookie('frontend_social_referral')
            ->withoutCookie('frontend_social_user_type');
    }

    private function clearSocialState($response, Request $request)
    {
        if ($request->hasSession()) {
            $request->session()->forget([
                self::SESSION_STATE_KEY,
                self::SESSION_STATE_CREATED_KEY,
            ]);
        }

        return $response
            ->withoutCookie('frontend_redirect')
            ->withoutCookie('frontend_redirect_path')
            ->withoutCookie('frontend_social_intent')
            ->withoutCookie('frontend_social_referral')
            ->withoutCookie('frontend_social_user_type');
    }

    private function logSecurityEvent(Request $request, string $reason, array $context = []): void
    {
        Log::channel('security')->warning('oauth.facebook.'.$reason, array_merge([
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
            'timestamp' => now()->toIso8601String(),
        ], $context));
    }
}
