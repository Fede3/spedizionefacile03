<?php

namespace App\Services\Brt;

use App\Models\Order;
use Illuminate\Support\Facades\Log;

class ShipmentService
{
    private BrtPayloadBuilder $payloadBuilder;

    public function __construct(
        private readonly BrtConfig $config,
        private readonly AddressNormalizer $addressNormalizer,
        private readonly ErrorTranslator $errorTranslator,
        ?BrtPayloadBuilder $payloadBuilder = null,
    ) {
        $this->payloadBuilder = $payloadBuilder ?? new BrtPayloadBuilder();
    }

    public function createShipment(Order $order, array $options = []): array
    {
        $order->loadMissing(['packages.originAddress', 'packages.destinationAddress', 'packages.service', 'user']);

        $package = $order->packages->first();
        if (!$package) return ['success' => false, 'error' => 'Nessun collo trovato nell\'ordine.'];

        $origin = $package->originAddress;
        $destination = $package->destinationAddress;
        if (!$origin || !$destination) return ['success' => false, 'error' => 'Indirizzi di partenza o destinazione mancanti.'];

        $totalWeight = $order->packages->sum(fn ($pkg) => (float) preg_replace('/[^0-9.]/', '', $pkg->weight ?? '0'));
        $totalParcels = $order->packages->sum(fn ($pkg) => max(1, (int) ($pkg->quantity ?? 1)));

        $missingFields = $this->validateDestination($destination);
        if (!empty($missingFields)) {
            return ['success' => false, 'error' => 'Dati mancanti per BRT: ' . implode(', ', $missingFields) . '.'];
        }

        $normalizedDest = $this->addressNormalizer->normalizeAddressForBrt($destination);

        $payload = [
            'account' => $this->config->accountPayload(),
            'createData' => [
                'departureDepot' => $this->config->departureDepot,
                'senderCustomerCode' => (int) $this->config->clientId,
                'deliveryFreightTypeCode' => $options['delivery_freight_type'] ?? 'DAP',
                'consigneeCompanyName' => $destination->name ?? '',
                'consigneeAddress' => trim(($destination->address ?? '') . ' ' . ($destination->address_number ?? '')),
                'consigneeZIPCode' => $normalizedDest['postal_code'],
                'consigneeCity' => $normalizedDest['city'],
                'consigneeProvinceAbbreviation' => $normalizedDest['province'],
                'consigneeCountryAbbreviationISOAlpha2' => $this->addressNormalizer->countryToIso2($destination->country ?? 'Italia'),
                'consigneeContactName' => $destination->name ?? '',
                'consigneeTelephone' => $destination->telephone_number ?? '',
                'consigneeEMail' => $destination->email ?? ($order->user->email ?? ''),
                'consigneeMobilePhoneNumber' => $destination->telephone_number ?? '',
                'numberOfParcels' => $totalParcels,
                'weightKG' => max(1, (int) ceil($totalWeight)),
                'numericSenderReference' => $order->id,
                'alphanumericSenderReference' => 'SF-' . str_pad($order->id, 6, '0', STR_PAD_LEFT),
                'notes' => $this->payloadBuilder->buildNotes($order, $options),
                'isAlertRequired' => '1',
                'isCODMandatory' => '0',
            ],
            'isLabelRequired' => 1,
            'labelParameters' => BrtPayloadBuilder::defaultLabelParameters(),
        ];

        if (!empty($options['is_cod']) && !empty($options['cod_amount'])) {
            $payload['createData']['isCODMandatory'] = '1';
            $payload['createData']['cashOnDelivery'] = (float) ($options['cod_amount'] / 100);
            $payload['createData']['codPaymentType'] = $options['cod_payment_type'] ?? 'BM';
            $payload['createData']['codCurrency'] = 'EUR';
        }

        if (!empty($options['pudo_id'])) {
            $payload['createData']['pudoId'] = $options['pudo_id'];
        }

        $this->payloadBuilder->addServicesToPayload($payload, $order, $options);

        try {
            $payloadForLog = $payload;
            $payloadForLog['account']['password'] = '***';
            Log::info('BRT createShipment request', ['order_id' => $order->id, 'payload' => $payloadForLog]);

            $response = $this->config->shipmentClient()->post($this->config->apiUrl . '/shipment', $payload);
            $body = $response->json();
            $responseData = $body['createResponse'] ?? $body;

            Log::info('BRT createShipment response', ['order_id' => $order->id, 'http_status' => $response->status()]);

            if (!$response->successful()) {
                return ['success' => false, 'error' => $responseData['executionMessage']['message'] ?? 'Errore API BRT (HTTP ' . $response->status() . ')'];
            }

            $execCode = $responseData['executionMessage']['code'] ?? -1;
            if ($execCode < 0) {
                $errorMsg = $this->errorTranslator->translate($execCode, $responseData['executionMessage']['codeDesc'] ?? '', $responseData['executionMessage']['message'] ?? '', $payload['createData'] ?? []);
                Log::warning('BRT createShipment error response', ['order_id' => $order->id, 'exec_code' => $execCode]);
                return ['success' => false, 'error' => $errorMsg];
            }

            return $this->extractShipmentResult($body, $responseData, $order->id);
        } catch (\Exception $e) {
            Log::error('BRT createShipment exception', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Errore di connessione BRT: ' . $e->getMessage()];
        }
    }

    public function testCreateShipment(array $data): array
    {
        $built = $this->payloadBuilder->buildTestPayload($this->config, $this->addressNormalizer, $data);
        $payload = $built['payload'];

        try {
            Log::info('BRT TEST createShipment request', ['payload' => array_merge($payload, ['account' => ['userID' => $this->config->clientId, 'password' => '***']])]);
            $response = $this->config->shipmentClient()->post($this->config->apiUrl . '/shipment', $payload);
            $body = $response->json();

            $createResponse = $body['createResponse'] ?? $body;
            $execCode = $createResponse['executionMessage']['code'] ?? $body['executionMessage']['code'] ?? -1;

            if ($execCode < 0) {
                return ['success' => false, 'error' => $createResponse['executionMessage']['message'] ?? 'Errore BRT', 'exec_code' => $execCode, 'raw_response' => $body, 'payload_sent' => array_merge($payload, ['account' => ['userID' => $this->config->clientId, 'password' => '***']])];
            }

            $labels = $createResponse['labels']['label'] ?? $body['labels'] ?? [];
            $labelBase64 = '';
            $parcelId = '';
            if (!empty($labels) && is_array($labels) && ($first = $labels[0] ?? null)) {
                $parcelId = $first['parcelID'] ?? $first['parcelId'] ?? '';
                $labelBase64 = $first['stream'] ?? '';
            }

            return ['success' => true, 'parcel_id' => $parcelId, 'label_base64' => $labelBase64, 'tracking_url' => $parcelId ? 'https://www.brt.it/it/tracking?parcelId=' . urlencode($parcelId) : '', 'raw_response' => $body];
        } catch (\Exception $e) {
            Log::error('BRT TEST createShipment exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Errore connessione BRT: ' . $e->getMessage()];
        }
    }

    public function confirmShipment(int $numericSenderReference): array
    {
        $payload = ['account' => $this->config->accountPayload(), 'confirmData' => ['senderCustomerCode' => (int) $this->config->clientId, 'numericSenderReference' => $numericSenderReference]];
        try {
            $response = $this->config->shipmentClient()->put($this->config->apiUrl . '/shipment', $payload);
            $body = $response->json();
            Log::info('BRT confirmShipment response', ['reference' => $numericSenderReference]);
            $execCode = $body['executionMessage']['code'] ?? -1;
            if ($execCode < 0) return ['success' => false, 'error' => $body['executionMessage']['message'] ?? 'Errore conferma BRT.'];
            return ['success' => true, 'raw_response' => $body];
        } catch (\Exception $e) {
            Log::error('BRT confirmShipment exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function deleteShipment(int $numericSenderReference): array
    {
        $payload = ['account' => $this->config->accountPayload(), 'deleteData' => ['senderCustomerCode' => (int) $this->config->clientId, 'numericSenderReference' => $numericSenderReference]];
        try {
            $response = $this->config->shipmentClient()->put($this->config->apiUrl . '/delete', $payload);
            $body = $response->json();
            $execCode = $body['executionMessage']['code'] ?? -1;
            return ['success' => $execCode >= 0, 'error' => $execCode < 0 ? ($body['executionMessage']['message'] ?? 'Errore') : null, 'raw_response' => $body];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function validateDestination($destination): array
    {
        $missing = [];
        if (empty(trim($destination->name ?? ''))) $missing[] = 'nome destinatario';
        if (empty(trim(($destination->address ?? '') . ' ' . ($destination->address_number ?? '')))) $missing[] = 'indirizzo destinatario';
        if (empty(trim($destination->postal_code ?? ''))) $missing[] = 'CAP destinatario';
        if (empty(trim($destination->city ?? ''))) $missing[] = 'città destinatario';
        if (empty(trim($destination->province ?? ''))) $missing[] = 'provincia destinatario';
        return $missing;
    }

    private function extractShipmentResult(array $body, array $responseData, int $orderId): array
    {
        $parcelId = '';
        $labelBase64 = '';
        $labels = $responseData['labels']['label'] ?? $responseData['labels'] ?? [];
        if (!empty($labels) && is_array($labels) && ($firstLabel = $labels[0] ?? null)) {
            $parcelId = $firstLabel['parcelID'] ?? $firstLabel['parcelId'] ?? '';
            $labelBase64 = $firstLabel['stream'] ?? '';
        }

        $parcelNumberFrom = (string) ($responseData['parcelNumberFrom'] ?? '');
        $trackingNumber = $parcelNumberFrom ?: $parcelId;
        $trackingUrl = $trackingNumber ? 'https://vas.brt.it/vas/sped_det_show.hsm?refnr=' . urlencode($trackingNumber) . '&tiession=' : '';

        Log::info('BRT createShipment tracking data extracted', ['order_id' => $orderId, 'parcel_id' => $parcelId, 'tracking_number' => $trackingNumber]);

        return [
            'success' => true,
            'parcel_id' => $parcelId,
            'numeric_sender_reference' => $orderId,
            'label_base64' => $labelBase64,
            'tracking_url' => $trackingUrl,
            'tracking_number' => $trackingNumber,
            'parcel_number_from' => $parcelNumberFrom,
            'parcel_number_to' => (string) ($responseData['parcelNumberTo'] ?? ''),
            'departure_depot' => (string) ($responseData['departureDepot'] ?? ''),
            'arrival_terminal' => (string) ($responseData['arrivalTerminal'] ?? ''),
            'arrival_depot' => (string) ($responseData['arrivalDepot'] ?? ''),
            'delivery_zone' => (string) ($responseData['deliveryZone'] ?? ''),
            'series_number' => (string) ($responseData['seriesNumber'] ?? ''),
            'service_type' => (string) ($responseData['serviceType'] ?? ''),
            'raw_response' => $body,
        ];
    }
}
