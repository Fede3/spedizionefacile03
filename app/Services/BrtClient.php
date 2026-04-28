<?php

namespace App\Services;

use App\Models\Order;
use App\Services\Brt\AddressNormalizer;
use App\Services\Brt\BrtBordereauGenerator;
use App\Services\Brt\BrtConfig;
use App\Services\Brt\ErrorTranslator;
use App\Services\Brt\FilialeLookup;
use App\Services\Brt\PickupService;
use App\Services\Brt\PudoPointMapper;
use App\Services\Brt\PudoService;
use App\Services\Brt\ShipmentService;
use App\Services\Brt\TrackingService;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * BrtClient — Facade unificata per tutte le operazioni BRT.
 *
 * Punto d'ingresso pubblico unico per consumatori esterni (Controllers,
 * Listeners, Jobs). I 11 sub-service in `App\Services\Brt\*` mantengono
 * la responsabilità SOLID single-purpose; BrtClient è solo il facade
 * che li orchestra e fornisce un'API uniforme.
 *
 * RAZIONALE:
 *   - I caller esterni dipendono solo da BrtClient (1 dipendenza)
 *   - In futuro è possibile rimpiazzare l'implementazione interna senza
 *     rompere caller esterni (Open/Closed)
 *   - Sub-service restano testabili in isolamento via DI (i loro test
 *     attuali continuano a passare)
 *
 * USO:
 *   public function __construct(private readonly BrtClient $brt) {}
 *
 *   // Spedizioni
 *   $brt->createShipment($order);
 *   $brt->confirmShipment(123);
 *
 *   // Tracking
 *   $brt->getTrackingStatus($order);
 *
 *   // PUDO
 *   $brt->searchPudoByAddress('Via Roma 1', '20100', 'Milano');
 *   $brt->searchPudoByCoordinates(45.46, 9.18);
 *
 *   // Ritiri
 *   $brt->requestPickup($order, $pickupRequest);
 *
 *   // PDF
 *   $brt->buildBordereau($pickupDate, $orders, $sender);
 *   $brt->buildLabels($order);
 *
 *   // Indirizzi / Errori (helpers puri)
 *   $brt->normalizeAddress($address);
 *   $brt->translateError($code, $codeDesc, $message);
 */
class BrtClient
{
    public function __construct(
        private readonly ShipmentService $shipments,
        private readonly TrackingService $tracking,
        private readonly PudoService $pudo,
        private readonly PudoPointMapper $pudoMapper,
        private readonly PickupService $pickups,
        private readonly BrtBordereauGenerator $pdf,
        private readonly AddressNormalizer $addresses,
        private readonly ErrorTranslator $errors,
        private readonly FilialeLookup $filiali,
        private readonly BrtConfig $config,
    ) {}

    /* ── Spedizioni ──────────────────────────────────────────────── */

    public function createShipment(Order $order, array $options = []): array
    {
        return $this->shipments->createShipment($order, $options);
    }

    public function confirmShipment(int $numericSenderReference): array
    {
        return $this->shipments->confirmShipment($numericSenderReference);
    }

    public function deleteShipment(int $numericSenderReference): array
    {
        return $this->shipments->deleteShipment($numericSenderReference);
    }

    /* ── Tracking ────────────────────────────────────────────────── */

    public function getTrackingStatus(Order $order): array
    {
        return $this->tracking->getTrackingStatus($order);
    }

    public function getTrackingUrl(string $parcelNumber): string
    {
        return $this->tracking->getTrackingUrl($parcelNumber);
    }

    public function mapCarrierStatus(string $eventCode, string $eventDesc = ''): ?string
    {
        return $this->tracking->mapCarrierStatus($eventCode, $eventDesc);
    }

    /* ── PUDO ────────────────────────────────────────────────────── */

    public function searchPudoByAddress(string $address, string $zipCode, string $city, string $countryCode = 'ITA', int $maxResults = 50): array
    {
        return $this->pudo->getPudoByAddress($address, $zipCode, $city, $countryCode, $maxResults);
    }

    public function searchPudoByCoordinates(float $latitude, float $longitude, int $maxResults = 50): array
    {
        return $this->pudo->getPudoByCoordinates($latitude, $longitude, $maxResults);
    }

    public function getPudoDetails(string $pudoId): array
    {
        return $this->pudo->getPudoDetails($pudoId);
    }

    /* ── Ritiri ──────────────────────────────────────────────────── */

    public function requestPickup(Order $order, array $pickupRequest): array
    {
        return $this->pickups->requestPickup($order, $pickupRequest);
    }

    /* ── PDF ─────────────────────────────────────────────────────── */

    public function buildBordereau(Carbon $pickupDate, Collection $orders, array $sender): string
    {
        return $this->pdf->buildDailyBordereau($pickupDate, $orders, $sender);
    }

    public function buildLabels(Order $order): string
    {
        return $this->pdf->buildOrderLabels($order);
    }

    /* ── Helpers puri ────────────────────────────────────────────── */

    public function normalizeAddress(object $address): array
    {
        return $this->addresses->normalizeAddressForBrt($address);
    }

    public function countryToIso2(string $country): string
    {
        return $this->addresses->countryToIso2($country);
    }

    public function translateError(int $code, string $codeDesc, string $message, array $createData = []): string
    {
        return $this->errors->translate($code, $codeDesc, $message, $createData);
    }

    public function isRetryableError(int $code): bool
    {
        return $this->errors->isRetryable($code);
    }

    /* ── Accesso sub-service per casi d'uso avanzati ─────────────── */

    /**
     * Espone PudoPointMapper per il merge/filtering avanzato di PUDO da
     * più sorgenti (DB locale + API BRT). Caso d'uso minoritario: la maggior
     * parte dei caller usa direttamente searchPudoByAddress/Coordinates.
     */
    public function pudoMapper(): PudoPointMapper
    {
        return $this->pudoMapper;
    }

    public function filiali(): FilialeLookup
    {
        return $this->filiali;
    }

    public function config(): BrtConfig
    {
        return $this->config;
    }
}
