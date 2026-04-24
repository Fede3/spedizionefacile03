<?php

namespace App\Services;

use RuntimeException;

class AppleJwtService
{
    public function normalizeApplePrivateKey(string $privateKey): string
    {
        $value = trim($privateKey);
        if ($value === '') throw new RuntimeException('Apple private key mancante.');

        if (is_file($value)) {
            $contents = file_get_contents($value);
            if ($contents === false || trim($contents) === '') throw new RuntimeException('Apple private key file non leggibile.');
            return $contents;
        }

        return str_replace(["\\r\\n", "\\n", "\\r"], ["\n", "\n", "\n"], $value);
    }

    public function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    public function base64UrlDecode(string $value): string
    {
        $remainder = strlen($value) % 4;
        if ($remainder > 0) $value .= str_repeat('=', 4 - $remainder);
        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        if ($decoded === false) throw new RuntimeException('Token Apple non decodificabile.');
        return $decoded;
    }

    public function readAsn1Length(string $binary, int &$offset): int
    {
        $length = ord($binary[$offset]);
        $offset++;

        if (($length & 0x80) === 0) return $length;
        $octets = $length & 0x7f;
        if ($octets < 1 || $octets > 4) throw new RuntimeException('Lunghezza ASN.1 Apple non valida.');

        $length = 0;
        for ($i = 0; $i < $octets; $i++) {
            $length = ($length << 8) | ord($binary[$offset]);
            $offset++;
        }
        return $length;
    }

    public function derToJose(string $der, int $partLength = 32): string
    {
        $offset = 0;
        if (!isset($der[$offset]) || ord($der[$offset]) !== 0x30) throw new RuntimeException('Firma Apple DER non valida.');
        $offset++;
        $this->readAsn1Length($der, $offset);

        if (!isset($der[$offset]) || ord($der[$offset]) !== 0x02) throw new RuntimeException('Firma Apple DER non valida (r).');
        $offset++;
        $rLength = $this->readAsn1Length($der, $offset);
        $r = substr($der, $offset, $rLength);
        $offset += $rLength;

        if (!isset($der[$offset]) || ord($der[$offset]) !== 0x02) throw new RuntimeException('Firma Apple DER non valida (s).');
        $offset++;
        $sLength = $this->readAsn1Length($der, $offset);
        $s = substr($der, $offset, $sLength);

        return str_pad(ltrim($r, "\x00"), $partLength, "\x00", STR_PAD_LEFT)
            . str_pad(ltrim($s, "\x00"), $partLength, "\x00", STR_PAD_LEFT);
    }

    public function buildAppleClientSecret(): string
    {
        $directSecret = trim((string) config('services.apple.client_secret'));
        if ($directSecret !== '') return $directSecret;

        $teamId = trim((string) config('services.apple.team_id'));
        $keyId = trim((string) config('services.apple.key_id'));
        $clientId = trim((string) config('services.apple.client_id'));
        $privateKey = $this->normalizeApplePrivateKey((string) config('services.apple.private_key'));

        if ($teamId === '' || $keyId === '' || $clientId === '') {
            throw new RuntimeException('Configurazione Apple incompleta per generare il client secret.');
        }

        $header = $this->base64UrlEncode(json_encode(['alg' => 'ES256', 'kid' => $keyId, 'typ' => 'JWT'], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        $now = time();
        $payload = $this->base64UrlEncode(json_encode(['iss' => $teamId, 'iat' => $now, 'exp' => $now + 3600, 'aud' => 'https://appleid.apple.com', 'sub' => $clientId], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        $signingInput = $header . '.' . $payload;
        $privateKeyResource = openssl_pkey_get_private($privateKey);
        if ($privateKeyResource === false) throw new RuntimeException('Apple private key non valida.');

        $signature = '';
        $signed = openssl_sign($signingInput, $signature, $privateKeyResource, OPENSSL_ALGO_SHA256);
        openssl_free_key($privateKeyResource);
        if (!$signed) throw new RuntimeException('Firma Apple client secret fallita.');

        return $signingInput . '.' . $this->base64UrlEncode($this->derToJose($signature));
    }

    public function parseIdTokenClaims(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) < 2) throw new RuntimeException('id_token Apple non valido.');
        $claims = json_decode($this->base64UrlDecode($parts[1]), true);
        if (!is_array($claims)) throw new RuntimeException('Claim Apple non validi.');
        return $claims;
    }

    public function validateAppleClaims(array $claims): void
    {
        $expectedAudience = trim((string) config('services.apple.client_id'));
        $issuer = (string) ($claims['iss'] ?? '');
        $subject = trim((string) ($claims['sub'] ?? ''));
        $audience = $claims['aud'] ?? null;
        $audienceValid = is_array($audience) ? in_array($expectedAudience, $audience, true) : $audience === $expectedAudience;
        if ($issuer !== 'https://appleid.apple.com' || $subject === '' || !$audienceValid) {
            throw new RuntimeException('Token Apple non valido per questa applicazione.');
        }
    }
}
