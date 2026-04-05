<?php

/**
 * FILE: Brt/PickupService.php
 * SCOPO: Richiede il ritiro a domicilio tramite API BRT.
 *
 * DOVE SI USA:
 *   - BrtService.php — delegato da requestHomePickup()
 *   - ShipmentExecutionService.php — flusso automatico post-etichetta
 *
 * ENDPOINT BRT: POST /rest/v1/shipments/pickup
 * Il ritiro e' SEPARATO dalla creazione spedizione e richiede
 * che l'etichetta sia gia' stata generata (brt_parcel_id presente).
 *
 * COLLEGAMENTI:
 *   - BrtConfig.php — configurazione e client HTTP
 *   - ShipmentService.php — pattern di riferimento per le chiamate HTTP
 */

namespace App\Services\Brt;

use App\Models\Order;
use Illuminate\Support\Facades\Log;

class PickupService
{
    public function __construct(
        private readonly BrtConfig $config,
        private readonly AddressNormalizer $addressNormalizer,
    ) {}

    /**
     * Richiede il ritiro a domicilio a BRT per un ordine con etichetta generata.
     *
     * @param Order $order L'ordine con brt_parcel_id e indirizzi caricati
     * @param array $pickupRequest Dati ritiro: time_slot, notes, date
     * @return array {success, status, pickup_reference?, error?}
     */
    public function requestPickup(Order $order, array $pickupRequest): array
    {
        $order->loadMissing(['packages.originAddress', 'user']);

        $origin = $order->packages->first()?->originAddress;
        if (! $origin) {
            return [
                'success' => false,
                'status' => 'failed',
                'error' => 'Indirizzo di ritiro non disponibile.',
            ];
        }

        $pickupDate = $pickupRequest['date'] ?? now()->addWeekday()->format('Y-m-d');
        $timeSlot = $pickupRequest['time_slot'] ?? '09:00-18:00';
        $notes = $pickupRequest['notes'] ?? '';

        $totalParcels = $order->packages->sum(fn ($pkg) => max(1, (int) ($pkg->quantity ?? 1)));
        $totalWeight = $order->packages->sum(fn ($pkg) => (float) preg_replace('/[^0-9.]/', '', $pkg->weight ?? '0'));

        // Normalize origin address using the same normalizer used by ShipmentService,
        // so BRT receives consistent, validated city/postal_code/province values.
        $normalizedOrigin = $this->addressNormalizer->normalizeAddressForBrt($origin);
        $pickupCountry = $this->addressNormalizer->countryToIso2($origin->country ?? 'Italia');

        $payload = [
            'account' => $this->config->accountPayload(),
            'pickupData' => [
                'senderCustomerCode' => (int) $this->config->clientId,
                'numericSenderReference' => $order->brt_numeric_sender_reference ?? $order->id,
                'pickupContactName' => $origin->name ?? '',
                'pickupCompanyName' => $origin->name ?? '',
                'pickupAddress' => trim(($origin->address ?? '') . ' ' . ($origin->address_number ?? '')),
                'pickupZIPCode' => $normalizedOrigin['postal_code'],
                'pickupCity' => $normalizedOrigin['city'],
                'pickupProvinceAbbreviation' => $normalizedOrigin['province'],
                'pickupCountryAbbreviationISOAlpha2' => $pickupCountry,
                'pickupContactPhone' => $origin->telephone_number ?? '',
                'pickupContactEMail' => $origin->email ?? ($order->user?->email ?? ''),
                'pickupDate' => $pickupDate,
                'pickupTimeSlotFrom' => $this->extractTimeSlotPart($timeSlot, 'from'),
                'pickupTimeSlotTo' => $this->extractTimeSlotPart($timeSlot, 'to'),
                'numberOfParcels' => $totalParcels,
                'weightKG' => max(1, (int) ceil($totalWeight)),
                'pickupNotes' => mb_substr($notes, 0, 120),
            ],
        ];

        try {
            $payloadForLog = $payload;
            $payloadForLog['account']['password'] = '***';
            Log::info('BRT requestPickup request', [
                'order_id' => $order->id,
                'payload' => $payloadForLog,
            ]);

            $response = $this->config->shipmentClient()
                ->post($this->config->apiUrl . '/pickup', $payload);

            $body = $response->json();

            Log::info('BRT requestPickup response', [
                'order_id' => $order->id,
                'http_status' => $response->status(),
            ]);

            if (! $response->successful()) {
                $errorMsg = $body['executionMessage']['message']
                    ?? 'Errore API BRT ritiro (HTTP ' . $response->status() . ')';
                return [
                    'success' => false,
                    'status' => 'failed',
                    'error' => $errorMsg,
                ];
            }

            $execCode = $body['executionMessage']['code'] ?? -1;
            if ($execCode < 0) {
                $errorMsg = $body['executionMessage']['message']
                    ?? 'Errore richiesta ritiro BRT (code: ' . $execCode . ')';
                Log::warning('BRT requestPickup error response', [
                    'order_id' => $order->id,
                    'exec_code' => $execCode,
                    'message' => $errorMsg,
                ]);
                return [
                    'success' => false,
                    'status' => 'failed',
                    'error' => $errorMsg,
                ];
            }

            $pickupReference = $body['pickupConfirmationNumber']
                ?? $body['confirmationNumber']
                ?? ('PU-' . $order->id . '-' . now()->format('Ymd'));

            Log::info('BRT requestPickup success', [
                'order_id' => $order->id,
                'pickup_reference' => $pickupReference,
            ]);

            return [
                'success' => true,
                'status' => 'requested',
                'pickup_reference' => $pickupReference,
            ];
        } catch (\Exception $e) {
            Log::error('BRT requestPickup exception', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
            return [
                'success' => false,
                'status' => 'failed',
                'error' => 'Errore di connessione BRT ritiro: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Estrae l'orario di inizio o fine da una fascia oraria "HH:MM-HH:MM".
     */
    private function extractTimeSlotPart(string $timeSlot, string $part): string
    {
        $segments = explode('-', $timeSlot);
        if ($part === 'from') {
            return trim($segments[0] ?? '09:00');
        }
        return trim($segments[1] ?? '18:00');
    }
}
