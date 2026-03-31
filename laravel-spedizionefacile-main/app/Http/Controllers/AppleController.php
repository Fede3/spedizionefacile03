<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\AuthUiCookie;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class AppleController extends Controller
{
    private function isAppleConfigured(): bool
    {
        $hasDirectSecret = filled(config('services.apple.client_secret'));
        $hasDerivedSecret = filled(config('services.apple.team_id'))
            && filled(config('services.apple.key_id'))
            && filled(config('services.apple.private_key'));

        return filled(config('services.apple.client_id'))
            && filled(config('services.apple.redirect'))
            && ($hasDirectSecret || $hasDerivedSecret);
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

    private function cookie(string $name, string $value, int $minutes = 15)
    {
        return cookie($name, $value, $minutes, '/', null, false, false);
    }

    private function clearSocialCookies($response)
    {
        return $response
            ->withoutCookie('frontend_redirect')
            ->withoutCookie('frontend_redirect_path')
            ->withoutCookie('frontend_social_intent')
            ->withoutCookie('frontend_social_referral')
            ->withoutCookie('frontend_social_user_type')
            ->withoutCookie('frontend_social_state');
    }

    private function normalizeApplePrivateKey(string $privateKey): string
    {
        $value = trim($privateKey);
        if ($value === '') {
            throw new RuntimeException('Apple private key mancante.');
        }

        if (is_file($value)) {
            $contents = file_get_contents($value);
            if ($contents === false || trim($contents) === '') {
                throw new RuntimeException('Apple private key file non leggibile.');
            }

            return $contents;
        }

        return str_replace(["\\r\\n", "\\n", "\\r"], ["\n", "\n", "\n"], $value);
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        $remainder = strlen($value) % 4;
        if ($remainder > 0) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        if ($decoded === false) {
            throw new RuntimeException('Token Apple non decodificabile.');
        }

        return $decoded;
    }

    private function readAsn1Length(string $binary, int &$offset): int
    {
        $length = ord($binary[$offset]);
        $offset++;

        if (($length & 0x80) === 0) {
            return $length;
        }

        $octets = $length & 0x7f;
        if ($octets < 1 || $octets > 4) {
            throw new RuntimeException('Lunghezza ASN.1 Apple non valida.');
        }

        $length = 0;
        for ($i = 0; $i < $octets; $i++) {
            $length = ($length << 8) | ord($binary[$offset]);
            $offset++;
        }

        return $length;
    }

    private function derToJose(string $der, int $partLength = 32): string
    {
        $offset = 0;
        if (! isset($der[$offset]) || ord($der[$offset]) !== 0x30) {
            throw new RuntimeException('Firma Apple DER non valida.');
        }
        $offset++;
        $this->readAsn1Length($der, $offset);

        if (! isset($der[$offset]) || ord($der[$offset]) !== 0x02) {
            throw new RuntimeException('Firma Apple DER non valida (r).');
        }
        $offset++;
        $rLength = $this->readAsn1Length($der, $offset);
        $r = substr($der, $offset, $rLength);
        $offset += $rLength;

        if (! isset($der[$offset]) || ord($der[$offset]) !== 0x02) {
            throw new RuntimeException('Firma Apple DER non valida (s).');
        }
        $offset++;
        $sLength = $this->readAsn1Length($der, $offset);
        $s = substr($der, $offset, $sLength);

        $r = ltrim($r, "\x00");
        $s = ltrim($s, "\x00");

        return str_pad($r, $partLength, "\x00", STR_PAD_LEFT)
            .str_pad($s, $partLength, "\x00", STR_PAD_LEFT);
    }

    private function buildAppleClientSecret(): string
    {
        $directSecret = trim((string) config('services.apple.client_secret'));
        if ($directSecret !== '') {
            return $directSecret;
        }

        $teamId = trim((string) config('services.apple.team_id'));
        $keyId = trim((string) config('services.apple.key_id'));
        $clientId = trim((string) config('services.apple.client_id'));
        $privateKey = $this->normalizeApplePrivateKey((string) config('services.apple.private_key'));

        if ($teamId === '' || $keyId === '' || $clientId === '') {
            throw new RuntimeException('Configurazione Apple incompleta per generare il client secret.');
        }

        $header = $this->base64UrlEncode(json_encode([
            'alg' => 'ES256',
            'kid' => $keyId,
            'typ' => 'JWT',
        ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        $now = time();
        $payload = $this->base64UrlEncode(json_encode([
            'iss' => $teamId,
            'iat' => $now,
            'exp' => $now + 3600,
            'aud' => 'https://appleid.apple.com',
            'sub' => $clientId,
        ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        $signingInput = $header.'.'.$payload;
        $privateKeyResource = openssl_pkey_get_private($privateKey);
        if ($privateKeyResource === false) {
            throw new RuntimeException('Apple private key non valida.');
        }

        $signature = '';
        $signed = openssl_sign($signingInput, $signature, $privateKeyResource, OPENSSL_ALGO_SHA256);
        openssl_free_key($privateKeyResource);

        if (! $signed) {
            throw new RuntimeException('Firma Apple client secret fallita.');
        }

        return $signingInput.'.'.$this->base64UrlEncode($this->derToJose($signature));
    }

    private function parseAppleUserPayload(Request $request): array
    {
        $payload = $request->input('user');
        if (! is_string($payload) || trim($payload) === '') {
            return [];
        }

        $decoded = json_decode($payload, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function parseIdTokenClaims(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) < 2) {
            throw new RuntimeException('id_token Apple non valido.');
        }

        $claims = json_decode($this->base64UrlDecode($parts[1]), true);
        if (! is_array($claims)) {
            throw new RuntimeException('Claim Apple non validi.');
        }

        return $claims;
    }

    private function validateAppleClaims(array $claims): void
    {
        $expectedAudience = trim((string) config('services.apple.client_id'));
        $issuer = (string) ($claims['iss'] ?? '');
        $subject = trim((string) ($claims['sub'] ?? ''));
        $audience = $claims['aud'] ?? null;

        $audienceValid = is_array($audience)
            ? in_array($expectedAudience, $audience, true)
            : $audience === $expectedAudience;

        if ($issuer !== 'https://appleid.apple.com' || $subject === '' || ! $audienceValid) {
            throw new RuntimeException('Token Apple non valido per questa applicazione.');
        }
    }

    private function splitAppleName(array $appleUserPayload, ?string $fallbackName, ?string $fallbackEmail): array
    {
        $firstName = trim((string) data_get($appleUserPayload, 'name.firstName', ''));
        $lastName = trim((string) data_get($appleUserPayload, 'name.lastName', ''));

        if ($firstName !== '' || $lastName !== '') {
            return [$firstName, $lastName];
        }

        $fallback = trim((string) $fallbackName);
        if ($fallback !== '') {
            $parts = preg_split('/\s+/', $fallback) ?: [];
            $name = array_shift($parts) ?: '';
            $surname = trim(implode(' ', $parts));

            return [$name, $surname];
        }

        $emailLocalPart = trim((string) Str::before((string) $fallbackEmail, '@'));
        if ($emailLocalPart !== '') {
            return [Str::title(str_replace(['.', '_', '-'], ' ', $emailLocalPart)), ''];
        }

        return ['', ''];
    }

    public function redirectToApple(Request $request)
    {
        $frontend = $this->resolveAllowedFrontendUrl((string) $request->query('frontend', ''));
        $redirectPath = $this->normalizeRedirectPath((string) $request->query('redirect', '/'));

        if (! $this->isAppleConfigured()) {
            return $this->redirectWithFrontendError($frontend, $redirectPath, 'apple_unavailable');
        }

        $state = Str::random(40);
        $intent = trim((string) $request->query('intent', 'login'));
        $referral = trim((string) $request->query('ref', ''));
        $userType = trim((string) $request->query('user_type', ''));

        $query = http_build_query([
            'client_id' => config('services.apple.client_id'),
            'redirect_uri' => config('services.apple.redirect'),
            'response_type' => 'code',
            'response_mode' => 'form_post',
            'scope' => 'name email',
            'state' => $state,
        ]);

        return redirect('https://appleid.apple.com/auth/authorize?'.$query)
            ->withCookie($this->cookie('frontend_redirect', $frontend))
            ->withCookie($this->cookie('frontend_redirect_path', $redirectPath))
            ->withCookie($this->cookie('frontend_social_intent', $intent === 'register' ? 'register' : 'login'))
            ->withCookie($this->cookie('frontend_social_referral', $referral !== '' ? strtoupper($referral) : ''))
            ->withCookie($this->cookie('frontend_social_user_type', in_array($userType, ['privato', 'commerciante'], true) ? $userType : 'privato'))
            ->withCookie($this->cookie('frontend_social_state', $state));
    }

    public function handleAppleCallback(Request $request)
    {
        $frontendUrl = $this->resolveAllowedFrontendUrl((string) ($request->cookie('frontend_redirect') ?: $this->fallbackFrontendUrl()));
        $redirectPath = $this->normalizeRedirectPath((string) ($request->cookie('frontend_redirect_path') ?: '/'));

        if (! $this->isAppleConfigured()) {
            return $this->clearSocialCookies($this->redirectWithFrontendError($frontendUrl, $redirectPath, 'apple_unavailable'));
        }

        $expectedState = trim((string) $request->cookie('frontend_social_state', ''));
        $receivedState = trim((string) $request->input('state', $request->query('state', '')));
        if ($expectedState === '' || ! hash_equals($expectedState, $receivedState)) {
            return $this->clearSocialCookies($this->redirectWithFrontendError($frontendUrl, $redirectPath, 'apple_invalid_state'));
        }

        if ($request->filled('error')) {
            return $this->clearSocialCookies($this->redirectWithFrontendError($frontendUrl, $redirectPath, 'apple_failed'));
        }

        $authorizationCode = trim((string) $request->input('code', ''));
        if ($authorizationCode === '') {
            return $this->clearSocialCookies($this->redirectWithFrontendError($frontendUrl, $redirectPath, 'apple_failed'));
        }

        try {
            $tokenResponse = Http::asForm()
                ->acceptJson()
                ->post('https://appleid.apple.com/auth/token', [
                    'grant_type' => 'authorization_code',
                    'code' => $authorizationCode,
                    'redirect_uri' => config('services.apple.redirect'),
                    'client_id' => config('services.apple.client_id'),
                    'client_secret' => $this->buildAppleClientSecret(),
                ]);

            if (! $tokenResponse->successful()) {
                throw new RuntimeException('Apple token exchange fallito.');
            }

            $idToken = trim((string) $tokenResponse->json('id_token', ''));
            if ($idToken === '') {
                throw new RuntimeException('Apple non ha restituito id_token.');
            }

            $claims = $this->parseIdTokenClaims($idToken);
            $this->validateAppleClaims($claims);
        } catch (\Throwable $e) {
            return $this->clearSocialCookies($this->redirectWithFrontendError($frontendUrl, $redirectPath, 'apple_failed'));
        }

        $appleId = trim((string) ($claims['sub'] ?? ''));
        $appleEmail = trim((string) ($claims['email'] ?? ''));
        $appleUserPayload = $this->parseAppleUserPayload($request);

        $user = User::where('apple_id', $appleId)->first();

        if (! $user && $appleEmail !== '') {
            $user = User::where('email', $appleEmail)->first();
        }

        if ($user) {
            $updates = [];
            if (! $user->apple_id) {
                $updates['apple_id'] = $appleId;
            }
            if (! $user->email_verified_at) {
                $updates['email_verified_at'] = now();
            }
            if (! empty($updates)) {
                $user->update($updates);
            }
        } else {
            if ($appleEmail === '') {
                return $this->clearSocialCookies($this->redirectWithFrontendError($frontendUrl, $redirectPath, 'apple_email_missing'));
            }

            $socialIntent = $request->cookie('frontend_social_intent');
            $referralCode = strtoupper(trim((string) $request->cookie('frontend_social_referral', '')));
            $userType = trim((string) $request->cookie('frontend_social_user_type', 'privato'));
            $validatedReferral = null;

            if ($socialIntent === 'register' && $referralCode !== '') {
                $validatedReferral = User::where('referral_code', $referralCode)
                    ->where('role', 'Partner Pro')
                    ->value('referral_code');
            }

            [$name, $surname] = $this->splitAppleName($appleUserPayload, (string) ($claims['name'] ?? ''), $appleEmail);

            $user = new User([
                'email' => $appleEmail,
                'name' => $name,
                'surname' => $surname,
                'telephone_number' => '',
                'email_verified_at' => now(),
                'password' => Str::random(32),
                'apple_id' => $appleId,
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

        return $this->clearSocialCookies(
            redirect($frontendUrl.$redirectPath)
                ->withCookie(AuthUiCookie::issueForUser($user, true))
        );
    }
}
