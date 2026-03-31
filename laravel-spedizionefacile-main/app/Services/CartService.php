<?php
/**
 * FILE: CartService.php
 * SCOPO: Logica condivisa tra CartController (utenti autenticati) e GuestCartController (ospiti).
 *
 * COSA FA:
 *   - Conversione prezzi euro <-> centesimi
 *   - Calcolo prezzo unitario e ricalcolo dopo merge
 *   - Rilevamento duplicati (stessi dati pacco + indirizzi + servizio)
 *   - Costruzione gruppi di indirizzi per il riepilogo
 *   - Calcolo subtotale carrello (somma single_price + sovrapprezzi servizi)
 *   - Normalizzazione dati servizi (camelCase -> snake_case)
 *
 * COLLEGAMENTI:
 *   - CartController.php — lo usa per il carrello DB (utenti autenticati)
 *   - GuestCartController.php — lo usa per il carrello sessione (ospiti)
 *   - ShipmentServicePricingService.php — delegato per calcolo sovrapprezzi
 *
 * VINCOLI:
 *   - I prezzi nel DB/sessione sono in CENTESIMI (900 = 9,00 EUR)
 *   - Il frontend invia prezzi in euro; la conversione avviene qui
 */

namespace App\Services;

use App\Cart\MyMoney;
use App\Models\Service;
use App\Models\Package;

class CartService
{
    // ─── Price helpers ────────────────────────────────────────────

    /**
     * Converte un prezzo da euro (float) a centesimi (int).
     * Es. 9.00 -> 900, 12.50 -> 1250
     */
    public static function euroToCents(float|int|null $euro): int
    {
        return (int) round(($euro ?? 0) * 100);
    }

    /**
     * Calcola il prezzo unitario (per 1 pacco) dato il prezzo totale e la quantita'.
     * Protegge dalla divisione per zero.
     */
    public static function unitPrice(int $totalPriceCents, int $quantity): int
    {
        return $quantity > 0
            ? (int) round($totalPriceCents / $quantity)
            : $totalPriceCents;
    }

    /**
     * Ricalcola il prezzo totale dopo un merge di quantita'.
     *
     * @param int $existingPriceCents  Prezzo totale attuale in centesimi
     * @param int $existingQty         Quantita' attuale
     * @param int $addedQty            Quantita' da aggiungere
     * @param int|null $newUnitPriceCents  Prezzo unitario del nuovo pacco (opzionale, usa quello esistente)
     * @return array{quantity: int, single_price: int}
     */
    public static function mergeQuantity(
        int $existingPriceCents,
        int $existingQty,
        int $addedQty,
        ?int $newUnitPriceCents = null
    ): array {
        $existingUnitPrice = self::unitPrice($existingPriceCents, $existingQty);
        $unitPrice = $newUnitPriceCents ?? $existingUnitPrice;
        $totalQty = $existingQty + $addedQty;

        return [
            'quantity' => $totalQty,
            'single_price' => $unitPrice * $totalQty,
        ];
    }

    // ─── Duplicate detection ──────────────────────────────────────

    /**
     * Normalizza un valore stringa per il confronto (lowercase + trim).
     */
    public static function normalize(?string $value): string
    {
        return mb_strtolower(trim($value ?? ''), 'UTF-8');
    }

    /**
     * Verifica se i dati di un pacco (tipo, peso, dimensioni) corrispondono.
     *
     * @param array $a  Dati pacco A (array con package_type, weight, first_size, ecc.)
     * @param array $b  Dati pacco B
     */
    public static function samePackageDimensions(array $a, array $b): bool
    {
        return ($a['package_type'] ?? '') === ($b['package_type'] ?? '')
            && (string) ($a['weight'] ?? '') === (string) ($b['weight'] ?? '')
            && (string) ($a['first_size'] ?? '') === (string) ($b['first_size'] ?? '')
            && (string) ($a['second_size'] ?? '') === (string) ($b['second_size'] ?? '')
            && (string) ($a['third_size'] ?? '') === (string) ($b['third_size'] ?? '');
    }

    /**
     * Verifica se due indirizzi corrispondono (confronta city, postal_code, name, address).
     *
     * @param array $a  Indirizzo A (array associativo)
     * @param array $b  Indirizzo B (array associativo)
     */
    public static function sameAddress(array $a, array $b): bool
    {
        return ($a['city'] ?? '') === ($b['city'] ?? '')
            && ($a['postal_code'] ?? '') === ($b['postal_code'] ?? '')
            && ($a['name'] ?? '') === ($b['name'] ?? '')
            && ($a['address'] ?? '') === ($b['address'] ?? '');
    }

    /**
     * Verifica se un pacco e' un duplicato confrontando dimensioni, indirizzi e servizio.
     *
     * @param array $packageData       Dati del nuovo pacco
     * @param array $originAddress     Indirizzo partenza del nuovo pacco
     * @param array $destAddress       Indirizzo destinazione del nuovo pacco
     * @param string $serviceSignature Firma del servizio del nuovo pacco
     * @param array $existingPkg       Dati del pacco esistente (array con le stesse chiavi)
     * @param array $existingOrigin    Indirizzo partenza del pacco esistente
     * @param array $existingDest      Indirizzo destinazione del pacco esistente
     * @param string $existingServiceSig Firma del servizio del pacco esistente
     */
    public static function isDuplicate(
        array $packageData,
        array $originAddress,
        array $destAddress,
        string $serviceSignature,
        array $existingPkg,
        array $existingOrigin,
        array $existingDest,
        string $existingServiceSig
    ): bool {
        return self::samePackageDimensions($packageData, $existingPkg)
            && self::sameAddress($originAddress, $existingOrigin)
            && self::sameAddress($destAddress, $existingDest)
            && $serviceSignature === $existingServiceSig;
    }

    // ─── Merge key (for auto-merge of DB packages) ───────────────

    /**
     * Costruisce una chiave univoca per un pacco Model, usata per identificare pacchi identici.
     * Due pacchi con la stessa chiave possono essere uniti (merge).
     *
     * @param Package $pkg  Il pacco (con relazioni originAddress, destinationAddress, service)
     */
    public static function buildMergeKey(Package $pkg): string
    {
        $o = $pkg->originAddress;
        $d = $pkg->destinationAddress;
        $s = $pkg->service;

        return implode('|', [
            self::normalize($pkg->package_type),
            (string) $pkg->weight,
            (string) $pkg->first_size,
            (string) $pkg->second_size,
            (string) $pkg->third_size,
            $o ? self::normalize($o->name) . '|' . self::normalize($o->address) . '|' . self::normalize($o->city) . '|' . self::normalize($o->postal_code) : 'no-origin',
            $d ? self::normalize($d->name) . '|' . self::normalize($d->address) . '|' . self::normalize($d->city) . '|' . self::normalize($d->postal_code) : 'no-dest',
            $s ? self::normalize($s->service_type) : 'nessuno',
            $s ? self::buildServiceSignatureFromService($s) : 'no-service-data',
        ]);
    }

    // ─── Address grouping ─────────────────────────────────────────

    /**
     * Raggruppa i pacchi per coppia di indirizzi identici E stesso servizio.
     * Restituisce un array di gruppi, ognuno con gli ID dei pacchi che verranno uniti
     * in una singola spedizione al momento della creazione dell'ordine.
     *
     * Funziona con Collection di Package models (utente autenticato).
     *
     * @param \Illuminate\Support\Collection $packages  Pacchi con originAddress, destinationAddress e service
     * @return array  Array di gruppi con: package_ids, count, origin_summary, destination_summary, service_type
     */
    public static function buildAddressGroups($packages): array
    {
        if ($packages->isEmpty()) return [];

        $groups = [];

        foreach ($packages as $package) {
            $origin = $package->originAddress;
            $destination = $package->destinationAddress;
            $serviceType = $package->service->service_type ?? 'Nessuno';

            $originParts = $origin ? implode('|', [
                self::normalize($origin->name),
                self::normalize($origin->address),
                self::normalize($origin->address_number),
                self::normalize($origin->city),
                self::normalize($origin->postal_code),
                self::normalize($origin->province),
            ]) : 'no-origin';

            $destParts = $destination ? implode('|', [
                self::normalize($destination->name),
                self::normalize($destination->address),
                self::normalize($destination->address_number),
                self::normalize($destination->city),
                self::normalize($destination->postal_code),
                self::normalize($destination->province),
            ]) : 'no-dest';

            $servicePart = self::normalize($serviceType);

            $key = md5($originParts . '::' . $destParts . '::' . $servicePart);

            if (!isset($groups[$key])) {
                $groups[$key] = [
                    'package_ids' => [],
                    'count' => 0,
                    'origin_summary' => $origin
                        ? trim(($origin->name ?? '') . ' - ' . ($origin->city ?? ''))
                        : '',
                    'destination_summary' => $destination
                        ? trim(($destination->name ?? '') . ' - ' . ($destination->city ?? ''))
                        : '',
                    'service_type' => $serviceType,
                ];
            }

            $groups[$key]['package_ids'][] = $package->id;
            $groups[$key]['count']++;
        }

        return array_values($groups);
    }

    // ─── Subtotal calculation ─────────────────────────────────────

    /**
     * Calcola il subtotale del carrello da una Collection di Package models (utente autenticato).
     *
     * @param \Illuminate\Support\Collection $packages  Pacchi con service caricato
     * @return MyMoney  Subtotale formattabile
     */
    public static function subtotalFromModels($packages): MyMoney
    {
        $subtotal = $packages->sum(function ($package) {
            return (int) $package->single_price;
        });
        $subtotal += self::calculateGroupedSurchargeFromModels($packages);

        return new MyMoney($subtotal);
    }

    /**
     * Calcola il subtotale del carrello da un array di pacchi sessione (ospite).
     *
     * @param array $packages  Array di pacchi (array associativi)
     * @return MyMoney  Subtotale formattabile
     */
    public static function subtotalFromArray(array $packages): MyMoney
    {
        $subtotal = 0;
        foreach ($packages as $package) {
            $subtotal += (int) ($package['single_price'] ?? 0);
        }
        $subtotal += self::calculateGroupedSurchargeFromArray($packages);

        return new MyMoney($subtotal);
    }

    // ─── Service signatures ───────────────────────────────────────

    /**
     * Costruisce la firma di un servizio da un model Service.
     */
    public static function buildServiceSignatureFromService(Service $service): string
    {
        return app(ShipmentServicePricingService::class)->buildSelectionSignature(
            $service->service_type ?? 'Nessuno',
            $service->service_data ?? [],
            (bool) (($service->service_data ?? [])['sms_email_notification'] ?? false),
        );
    }

    /**
     * Costruisce la firma di un servizio da tipo e dati (array).
     */
    public static function buildServiceSignatureFromArray(string $serviceType, array $serviceData = []): string
    {
        return app(ShipmentServicePricingService::class)->buildSelectionSignature(
            $serviceType,
            $serviceData,
            (bool) ($serviceData['sms_email_notification'] ?? false),
        );
    }

    /**
     * Costruisce la firma di un servizio dai dati del carrello ospite (formato sessione).
     */
    public static function buildServiceSignatureFromGuest(array $services = []): string
    {
        $serviceData = $services['serviceData'] ?? $services['service_data'] ?? [];

        return app(ShipmentServicePricingService::class)->buildSelectionSignature(
            $services['service_type'] ?? 'Nessuno',
            is_array($serviceData) ? $serviceData : [],
            (bool) (
                $services['sms_email_notification']
                ?? (is_array($serviceData) ? ($serviceData['sms_email_notification'] ?? false) : false)
            ),
        );
    }

    // ─── Service surcharge calculation ────────────────────────────

    /**
     * Calcola il sovrapprezzi dei servizi raggruppati per indirizzo (pacchi DB / models).
     *
     * @param \Illuminate\Support\Collection $packages
     */
    public static function calculateGroupedSurchargeFromModels($packages): int
    {
        if ($packages->isEmpty()) {
            return 0;
        }

        $pricing = app(ShipmentServicePricingService::class);
        $groups = [];

        foreach ($packages as $package) {
            $service = $package->service;
            if (! $service) {
                continue;
            }

            $serviceSignature = self::buildServiceSignatureFromService($service);
            $groupKey = self::buildAddressKeyForServices($package, $serviceSignature);

            if (! isset($groups[$groupKey])) {
                $groups[$groupKey] = [
                    'service' => $service,
                    'packages' => [],
                    'origin_address' => $package->originAddress?->toArray() ?? [],
                    'destination_address' => $package->destinationAddress?->toArray() ?? [],
                ];
            }

            $groups[$groupKey]['packages'][] = $package;
        }

        return array_sum(array_map(function (array $group) use ($pricing) {
            /** @var Service $service */
            $service = $group['service'];
            $serviceData = $service->service_data ?? [];
            $deliveryMode = $serviceData['delivery_mode'] ?? 'home';

            return $pricing->calculateSurchargeCents(
                $service->service_type ?? 'Nessuno',
                $serviceData,
                (bool) ($serviceData['sms_email_notification'] ?? false),
                [
                    'packages' => $group['packages'] ?? [],
                    'origin_address' => $group['origin_address'] ?? [],
                    'destination_address' => ($deliveryMode === 'pudo' && ! empty($serviceData['pudo']))
                        ? $serviceData['pudo']
                        : ($group['destination_address'] ?? []),
                    'delivery_mode' => $deliveryMode,
                    'selected_pudo' => $serviceData['pudo'] ?? null,
                    'requires_manual_quote' => (bool) ($serviceData['requires_manual_quote'] ?? false),
                ],
            );
        }, $groups));
    }

    /**
     * Calcola il sovrapprezzi dei servizi raggruppati per indirizzo (pacchi sessione / array).
     *
     * @param array $packages  Array di pacchi (array associativi)
     */
    public static function calculateGroupedSurchargeFromArray(array $packages): int
    {
        if (empty($packages)) {
            return 0;
        }

        $pricing = app(ShipmentServicePricingService::class);
        $groups = [];

        foreach ($packages as $package) {
            $services = is_array($package['services'] ?? null) ? $package['services'] : [];
            $serviceType = $services['service_type'] ?? 'Nessuno';
            $serviceData = $services['serviceData'] ?? $services['service_data'] ?? [];
            $smsEmailNotification = (bool) (
                $services['sms_email_notification']
                ?? $serviceData['sms_email_notification']
                ?? false
            );

            $groupKey = md5(
                ($package['origin_address']['city'] ?? '') . '|'
                . ($package['origin_address']['postal_code'] ?? '') . '|'
                . ($package['destination_address']['city'] ?? '') . '|'
                . ($package['destination_address']['postal_code'] ?? '') . '|'
                . self::buildServiceSignatureFromGuest($services)
            );

            if (! isset($groups[$groupKey])) {
                $groups[$groupKey] = [
                    'service_type' => $serviceType,
                    'service_data' => $serviceData,
                    'sms_email_notification' => $smsEmailNotification,
                    'packages' => [],
                    'origin_address' => $package['origin_address'] ?? [],
                    'destination_address' => $package['destination_address'] ?? [],
                ];
            }

            $groups[$groupKey]['packages'][] = $package;
        }

        return array_sum(array_map(function (array $group) use ($pricing) {
            $serviceData = is_array($group['service_data'] ?? null) ? $group['service_data'] : [];
            $deliveryMode = $serviceData['delivery_mode'] ?? 'home';

            return $pricing->calculateSurchargeCents(
                $group['service_type'] ?? 'Nessuno',
                $serviceData,
                (bool) ($group['sms_email_notification'] ?? false),
                [
                    'packages' => $group['packages'] ?? [],
                    'origin_address' => $group['origin_address'] ?? [],
                    'destination_address' => ($deliveryMode === 'pudo' && ! empty($serviceData['pudo']))
                        ? $serviceData['pudo']
                        : ($group['destination_address'] ?? []),
                    'delivery_mode' => $deliveryMode,
                    'selected_pudo' => $serviceData['pudo'] ?? null,
                    'requires_manual_quote' => (bool) ($serviceData['requires_manual_quote'] ?? false),
                ],
            );
        }, $groups));
    }

    // ─── Normalizzazione servizi ──────────────────────────────────

    /**
     * Normalizza i dati dei servizi dal frontend al formato DB.
     * - service_type default 'Nessuno'
     * - date/time default stringa vuota
     * - serviceData (camelCase) -> service_data (snake_case)
     *
     * Replica la logica del trait NormalizesServiceData, per uso standalone.
     */
    public static function normalizeServiceData(array $servicesData): array
    {
        $servicesData['service_type'] = !empty($servicesData['service_type']) ? $servicesData['service_type'] : 'Nessuno';
        $servicesData['date'] = $servicesData['date'] ?? '';
        $servicesData['time'] = $servicesData['time'] ?? '';

        if (isset($servicesData['serviceData']) && is_array($servicesData['serviceData'])) {
            $servicesData['service_data'] = $servicesData['serviceData'];
            unset($servicesData['serviceData']);
        }

        if (! isset($servicesData['service_data']) || ! is_array($servicesData['service_data'])) {
            $servicesData['service_data'] = [];
        }

        if (array_key_exists('sms_email_notification', $servicesData)) {
            $servicesData['service_data']['sms_email_notification'] = (bool) $servicesData['sms_email_notification'];
        }

        return $servicesData;
    }

    // ─── PUDO helpers ─────────────────────────────────────────────

    /**
     * Applica i dati PUDO (punto di ritiro BRT) al service_data se richiesto.
     *
     * @param array $servicesData  Dati servizi normalizzati
     * @param array $requestData   Dati completi della request (con 'pudo' e 'delivery_mode')
     * @return array  servicesData aggiornato con eventuali dati PUDO
     */
    public static function applyPudoData(array $servicesData, array $requestData): array
    {
        if (!empty($requestData['pudo']) && ($requestData['delivery_mode'] ?? 'home') === 'pudo') {
            $serviceData = $servicesData['service_data'] ?? [];
            $serviceData['pudo'] = $requestData['pudo'];
            $serviceData['delivery_mode'] = 'pudo';
            $servicesData['service_data'] = $serviceData;
        } elseif (($requestData['delivery_mode'] ?? null) === 'home') {
            // Se l'utente e' tornato a domicilio, rimuoviamo i dati PUDO
            $serviceData = $servicesData['service_data'] ?? [];
            unset($serviceData['pudo'], $serviceData['delivery_mode']);
            $servicesData['service_data'] = $serviceData;
        }

        return $servicesData;
    }

    // ─── Merge operations ─────────────────────────────────────

    /**
     * Unisce pacchi identici nel carrello di un utente.
     * Due pacchi sono "identici" se hanno stessi: tipo, peso, dimensioni, indirizzi e servizio.
     *
     * @param \Illuminate\Support\Collection $packages  Pacchi con relazioni caricate
     * @param int $userId  ID dell'utente proprietario del carrello
     * @return int  Numero di pacchi duplicati eliminati
     */
    public static function mergeIdenticalPackages($packages, int $userId): int
    {
        if ($packages->count() < 2) {
            return 0;
        }

        $groups = [];
        foreach ($packages as $pkg) {
            $key = self::buildMergeKey($pkg);
            $groups[$key][] = $pkg;
        }

        $merged = 0;

        foreach ($groups as $groupPackages) {
            if (count($groupPackages) < 2) {
                continue;
            }

            $master = $groupPackages[0];
            $masterQty = (int) $master->quantity;
            $masterUnitPrice = self::unitPrice((int) $master->single_price, $masterQty);

            for ($i = 1; $i < count($groupPackages); $i++) {
                $dup = $groupPackages[$i];
                $masterQty += (int) $dup->quantity;

                \Illuminate\Support\Facades\DB::table('cart_user')
                    ->where('user_id', $userId)
                    ->where('package_id', $dup->id)
                    ->delete();
                $dup->delete();
                $merged++;
            }

            $master->update([
                'quantity' => $masterQty,
                'single_price' => $masterUnitPrice * $masterQty,
            ]);
        }

        return $merged;
    }

    // ─── Private helpers ──────────────────────────────────────────

    /**
     * Costruisce una chiave per raggruppare pacchi per indirizzo + servizio.
     * Usata internamente per il calcolo sovrapprezzi.
     */
    private static function buildAddressKeyForServices(Package $package, string $serviceSignature): string
    {
        $origin = $package->originAddress;
        $destination = $package->destinationAddress;

        $originParts = $origin ? implode('|', [
            self::normalize($origin->name),
            self::normalize($origin->address),
            self::normalize($origin->address_number),
            self::normalize($origin->city),
            self::normalize($origin->postal_code),
            self::normalize($origin->province),
        ]) : 'no-origin';

        $destParts = $destination ? implode('|', [
            self::normalize($destination->name),
            self::normalize($destination->address),
            self::normalize($destination->address_number),
            self::normalize($destination->city),
            self::normalize($destination->postal_code),
            self::normalize($destination->province),
        ]) : 'no-dest';

        return md5($originParts . '::' . $destParts . '::' . $serviceSignature);
    }
}
