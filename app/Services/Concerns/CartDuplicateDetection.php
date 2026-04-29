<?php

namespace App\Services\Concerns;

/**
 * Trait helper di CartService — Duplicate detection e normalize.
 *
 * Estratti per ridurre LOC del CartService preservando 100% l'API public.
 * Un pacco e' duplicato di un altro se ha stesse dimensioni + stesso origin
 * + stessa destination + stessa firma servizi.
 */
trait CartDuplicateDetection
{
    public function normalize(?string $value): string
    {
        return mb_strtolower(trim($value ?? ''), 'UTF-8');
    }

    public function samePackageDimensions(array $a, array $b): bool
    {
        return ($a['package_type'] ?? '') === ($b['package_type'] ?? '')
            && (string) ($a['weight'] ?? '') === (string) ($b['weight'] ?? '')
            && (string) ($a['first_size'] ?? '') === (string) ($b['first_size'] ?? '')
            && (string) ($a['second_size'] ?? '') === (string) ($b['second_size'] ?? '')
            && (string) ($a['third_size'] ?? '') === (string) ($b['third_size'] ?? '');
    }

    public function sameAddress(array $a, array $b): bool
    {
        return ($a['city'] ?? '') === ($b['city'] ?? '')
            && ($a['postal_code'] ?? '') === ($b['postal_code'] ?? '')
            && ($a['name'] ?? '') === ($b['name'] ?? '')
            && ($a['address'] ?? '') === ($b['address'] ?? '');
    }

    public function isDuplicate(
        array $packageData, array $originAddress, array $destAddress, string $serviceSignature,
        array $existingPkg, array $existingOrigin, array $existingDest, string $existingServiceSig
    ): bool {
        return $this->samePackageDimensions($packageData, $existingPkg)
            && $this->sameAddress($originAddress, $existingOrigin)
            && $this->sameAddress($destAddress, $existingDest)
            && $serviceSignature === $existingServiceSig;
    }
}
