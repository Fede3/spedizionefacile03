<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\AuthUiCookie;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\FacebookProvider;

class FacebookController extends Controller
{
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

        $redirectUri = config('services.facebook.redirect');
        /** @var FacebookProvider $facebook */
        $facebook = Socialite::driver('facebook');
        $response = $facebook
            ->stateless()
            ->redirectUrl($redirectUri)
            ->scopes(['email'])
            ->redirect();

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

    public function handleFacebookCallback(Request $request)
    {
        $frontendUrl = $this->resolveAllowedFrontendUrl((string) ($request->cookie('frontend_redirect') ?: $this->fallbackFrontendUrl()));
        $redirectPath = $this->normalizeRedirectPath((string) ($request->cookie('frontend_redirect_path') ?: '/'));

        if (! $this->isFacebookConfigured()) {
            return $this->redirectWithFrontendError($frontendUrl, $redirectPath, 'facebook_unavailable')
                ->withoutCookie('frontend_redirect')
                ->withoutCookie('frontend_redirect_path')
                ->withoutCookie('frontend_social_intent')
                ->withoutCookie('frontend_social_referral')
                ->withoutCookie('frontend_social_user_type');
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
            return $this->redirectWithFrontendError($frontendUrl, $redirectPath, 'facebook_failed')
                ->withoutCookie('frontend_redirect')
                ->withoutCookie('frontend_redirect_path')
                ->withoutCookie('frontend_social_intent')
                ->withoutCookie('frontend_social_referral')
                ->withoutCookie('frontend_social_user_type');
        }

        $facebookEmail = $facebookUser->getEmail();
        if (! $facebookEmail) {
            return $this->redirectWithFrontendError($frontendUrl, $redirectPath, 'facebook_email_missing')
                ->withoutCookie('frontend_redirect')
                ->withoutCookie('frontend_redirect_path')
                ->withoutCookie('frontend_social_intent')
                ->withoutCookie('frontend_social_referral')
                ->withoutCookie('frontend_social_user_type');
        }

        $user = User::where('email', $facebookEmail)->first();

        if ($user) {
            $updates = [];
            if (! $user->facebook_id) {
                $updates['facebook_id'] = $facebookUser->getId();
            }
            if (! $user->avatar && $facebookUser->getAvatar()) {
                $updates['avatar'] = $facebookUser->getAvatar();
            }
            if (! $user->email_verified_at) {
                $updates['email_verified_at'] = now();
            }
            if (! empty($updates)) {
                $user->update($updates);
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
                'facebook_id' => $facebookUser->getId(),
                'avatar' => $facebookUser->getAvatar(),
                'referred_by' => $validatedReferral,
                'user_type' => in_array($userType, ['privato', 'commerciante'], true) ? $userType : 'privato',
            ]);
            $user->role = 'User';
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
}
