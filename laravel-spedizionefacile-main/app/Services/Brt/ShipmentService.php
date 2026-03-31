<?php
/**
 * FILE: Brt/ShipmentService.php
 * SCOPO: Creazione, conferma ed eliminazione spedizioni BRT + generazione etichette PDF.
 *
 * DOVE SI USA:
 *   - BrtController.php — endpoint HTTP per operazioni spedizione
 *   - GenerateBrtLabel.php — generazione automatica etichetta post-pagamento
 *   - AdminController.php — rigenerazione manuale etichetta admin
 *   - RefundController.php — cancellazione spedizione in caso di rimborso
 */

namespace App\Services\Brt;

use App\Models\Order;
use Illuminate\Support\Facades\Log;

class ShipmentService
{
    public function __construct(
        private readonly BrtConfig $config,
        private readonly AddressNormalizer $addressNormalizer,
        private readonly ErrorTranslator $errorTranslator,
    ) {}

    /**
     * Crea una spedizione BRT e genera l'etichetta PDF.
     *
     * @param Order $order  L'ordine (con pacchi e indirizzi caricati)
     * @param array $options  Opzioni: is_cod, cod_amount, pudo_id, notes, ecc.
     * @return array  Risultato con: success, parcel_id, label_base64, tracking_url, error
     */
    public function createShipment(Order $order, array $options = []): array
    {
        $order->loadMissing(['packages.originAddress', 'packages.destinationAddress', 'packages.service', 'user']);

        $package = $order->packages->first();
        if (!$package) {
            return ['success' => false, 'error' => 'Nessun collo trovato nell\'ordine.'];
        }

        $origin = $package->originAddress;
        $destination = $package->destinationAddress;

        if (!$origin || !$destination) {
            return ['success' => false, 'error' => 'Indirizzi di partenza o destinazione mancanti.'];
        }

        $totalWeight = $order->packages->sum(function ($pkg) {
            return (float) preg_replace('/[^0-9.]/', '', $pkg->weight ?? '0');
        });
        $totalParcels = $order->packages->sum(function ($pkg) {
            return max(1, (int) ($pkg->quantity ?? 1));
        });

        $numericSenderReference = $order->id;

        // Validazione dati obbligatori
        $missingFields = [];
        if (empty(trim($destination->name ?? ''))) $missingFields[] = 'nome destinatario';
        if (empty(trim(($destination->address ?? '') . ' ' . ($destination->address_number ?? '')))) $missingFields[] = 'indirizzo destinatario';
        if (empty(trim($destination->postal_code ?? ''))) $missingFields[] = 'CAP destinatario';
        if (empty(trim($destination->city ?? ''))) $missingFields[] = 'città destinatario';
        if (empty(trim($destination->province ?? ''))) $missingFields[] = 'provincia destinatario';

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
                'numericSenderReference' => $numericSenderReference,
                'alphanumericSenderReference' => 'SF-' . str_pad($order->id, 6, '0', STR_PAD_LEFT),
                'notes' => $this->buildNotes($order, $options),
                'isAlertRequired' => '1',
                'isCODMandatory' => '0',
            ],
            'isLabelRequired' => 1,
            'labelParameters' => [
                'outputType' => 'PDF',
                'offsetX' => 0,
                'offsetY' => 0,
                'isBorderRequired' => 0,
                'isLogoRequired' => 1,
                'isBarcodeControlRowRequired' => 1,
            ],
        ];

        // Contrassegno (pagamento alla consegna)
        if (!empty($options['is_cod']) && !empty($options['cod_amount'])) {
            $payload['createData']['isCODMandatory'] = '1';
            $payload['createData']['cashOnDelivery'] = (float) ($options['cod_amount'] / 100);
            $payload['createData']['codPaymentType'] = $options['cod_payment_type'] ?? 'BM';
            $payload['createData']['codCurrency'] = 'EUR';
        }

        // Punto PUDO
        if (!empty($options['pudo_id'])) {
            $payload['createData']['pudoId'] = $options['pudo_id'];
        }

        // Servizi/accessori
        $this->addServicesToPayload($payload, $order, $options);

        try {
            $payloadForLog = $payload;
            $payloadForLog['account']['password'] = '***';
            Log::info('BRT createShipment request', [
                'order_id' => $order->id,
                'payload' => $payloadForLog,
            ]);

            $response = $this->config->shipmentClient()
                ->post($this->config->apiUrl . '/shipment', $payload);

            $body = $response->json();
            $responseData = $body['createResponse'] ?? $body;

            Log::info('BRT createShipment response', [
                'order_id' => $order->id,
                'http_status' => $response->status(),
                'response_data' => $responseData,
            ]);

            if (!$response->successful()) {
                $errorMsg = $responseData['executionMessage']['message'] ?? 'Errore API BRT (HTTP ' . $response->status() . ')';
                return ['success' => false, 'error' => $errorMsg];
            }

            $execCode = $responseData['executionMessage']['code'] ?? -1;
            if ($execCode < 0) {
                $message = $responseData['executionMessage']['message'] ?? '';
                $codeDesc = $responseData['executionMessage']['codeDesc'] ?? '';

                $errorMsg = $this->errorTranslator->translate($execCode, $codeDesc, $message, $payload['createData'] ?? []);

                Log::warning('BRT createShipment error response', [
                    'order_id' => $order->id,
                    'exec_code' => $execCode,
                    'exec_code_desc' => $codeDesc,
                    'exec_message' => $message,
                    'payload_sent' => [
                        'consigneeCity' => $payload['createData']['consigneeCity'] ?? '',
                        'consigneeZIPCode' => $payload['createData']['consigneeZIPCode'] ?? '',
                        'consigneeProvinceAbbreviation' => $payload['createData']['consigneeProvinceAbbreviation'] ?? '',
                        'consigneeAddress' => $payload['createData']['consigneeAddress'] ?? '',
                        'departureDepot' => $payload['createData']['departureDepot'] ?? 0,
                    ],
                ]);
                return ['success' => false, 'error' => $errorMsg];
            }

            // Estrazione etichetta
            $parcelId = '';
            $labelBase64 = '';
            $labels = $responseData['labels']['label'] ?? $responseData['labels'] ?? [];
            if (!empty($labels) && is_array($labels)) {
                $firstLabel = $labels[0] ?? null;
                if ($firstLabel) {
                    $parcelId = $firstLabel['parcelID'] ?? $firstLabel['parcelId'] ?? '';
                    $labelBase64 = $firstLabel['stream'] ?? '';
                }
            }

            // Estrazione dati routing/tracking
            $parcelNumberFrom = (string) ($responseData['parcelNumberFrom'] ?? '');
            $parcelNumberTo = (string) ($responseData['parcelNumberTo'] ?? '');
            $departureDepot = (string) ($responseData['departureDepot'] ?? '');
            $arrivalTerminal = (string) ($responseData['arrivalTerminal'] ?? '');
            $arrivalDepot = (string) ($responseData['arrivalDepot'] ?? '');
            $deliveryZone = (string) ($responseData['deliveryZone'] ?? '');
            $seriesNumber = (string) ($responseData['seriesNumber'] ?? '');
            $serviceType = (string) ($responseData['serviceType'] ?? '');

            $trackingNumber = $parcelNumberFrom ?: $parcelId;
            $trackingUrl = '';
            if ($trackingNumber) {
                $trackingUrl = 'https://vas.brt.it/vas/sped_det_show.hsm?refnr=' . urlencode($trackingNumber) . '&tiession=';
            }

            Log::info('BRT createShipment tracking data extracted', [
                'order_id' => $order->id,
                'parcel_id' => $parcelId,
                'tracking_number' => $trackingNumber,
                'parcel_number_from' => $parcelNumberFrom,
                'parcel_number_to' => $parcelNumberTo,
                'departure_depot' => $departureDepot,
                'arrival_terminal' => $arrivalTerminal,
                'arrival_depot' => $arrivalDepot,
                'delivery_zone' => $deliveryZone,
                'series_number' => $seriesNumber,
                'service_type' => $serviceType,
            ]);

            return [
                'success' => true,
                'parcel_id' => $parcelId,
                'numeric_sender_reference' => $numericSenderReference,
                'label_base64' => $labelBase64,
                'tracking_url' => $trackingUrl,
                'tracking_number' => $trackingNumber,
                'parcel_number_from' => $parcelNumberFrom,
                'parcel_number_to' => $parcelNumberTo,
                'departure_depot' => $departureDepot,
                'arrival_terminal' => $arrivalTerminal,
                'arrival_depot' => $arrivalDepot,
                'delivery_zone' => $deliveryZone,
                'series_number' => $seriesNumber,
                'service_type' => $serviceType,
                'raw_response' => $body,
            ];
        } catch (\Exception $e) {
            Log::error('BRT createShipment exception', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
            return ['success' => false, 'error' => 'Errore di connessione BRT: ' . $e->getMessage()];
        }
    }

    /**
     * Test di creazione spedizione BRT senza ordine reale.
     */
    public function testCreateShipment(array $data): array
    {
        $numericSenderReference = (int) (time() % 1000000000);

        $testAddress = (object) [
            'city' => $data['consignee_city'] ?? '',
            'postal_code' => $data['consignee_zip'] ?? '',
            'province' => $data['consignee_province'] ?? '',
        ];
        $normalizedTest = $this->addressNormalizer->normalizeAddressForBrt($testAddress);

        $payload = [
            'account' => $this->config->accountPayload(),
            'createData' => [
                'departureDepot' => $this->config->departureDepot,
                'senderCustomerCode' => (int) $this->config->clientId,
                'deliveryFreightTypeCode' => 'DAP',
                'consigneeCompanyName' => $data['consignee_name'],
                'consigneeAddress' => $data['consignee_address'],
                'consigneeZIPCode' => $normalizedTest['postal_code'],
                'consigneeCity' => $normalizedTest['city'],
                'consigneeProvinceAbbreviation' => $normalizedTest['province'],
                'consigneeCountryAbbreviationISOAlpha2' => $data['consignee_country'],
                'consigneeContactName' => $data['consignee_name'],
                'consigneeTelephone' => $data['consignee_phone'] ?? '',
                'consigneeEMail' => $data['consignee_email'] ?? '',
                'consigneeMobilePhoneNumber' => $data['consignee_phone'] ?? '',
                'numberOfParcels' => (int) ($data['parcels'] ?? 1),
                'weightKG' => max(1, (int) ($data['weight_kg'] ?? 1)),
                'numericSenderReference' => $numericSenderReference,
                'alphanumericSenderReference' => 'TEST-' . $numericSenderReference,
                'notes' => $data['notes'] ?? 'Test SpediamoFacile',
                'isAlertRequired' => '1',
                'isCODMandatory' => '0',
            ],
            'isLabelRequired' => 1,
            'labelParameters' => [
                'outputType' => 'PDF',
                'offsetX' => 0,
                'offsetY' => 0,
                'isBorderRequired' => 0,
                'isLogoRequired' => 1,
                'isBarcodeControlRowRequired' => 1,
            ],
        ];

        try {
            Log::info('BRT TEST createShipment request', ['payload' => array_merge($payload, ['account' => ['userID' => $this->config->clientId, 'password' => '***']])]);

            $response = $this->config->shipmentClient()
                ->post($this->config->apiUrl . '/shipment', $payload);

            $body = $response->json();

            Log::info('BRT TEST createShipment response', ['http_status' => $response->status(), 'body' => $body]);

            $createResponse = $body['createResponse'] ?? $body;
            $execCode = $createResponse['executionMessage']['code'] ?? $body['executionMessage']['code'] ?? -1;

            if ($execCode < 0) {
                return [
                    'success' => false,
                    'error' => $createResponse['executionMessage']['message'] ?? 'Errore BRT',
                    'exec_code' => $execCode,
                    'raw_response' => $body,
                    'payload_sent' => array_merge($payload, ['account' => ['userID' => $this->config->clientId, 'password' => '***']]),
                ];
            }

            $labels = $createResponse['labels']['label'] ?? $body['labels'] ?? [];
            $labelBase64 = '';
            $parcelId = '';
            if (!empty($labels) && is_array($labels)) {
                $first = $labels[0] ?? null;
                if ($first) {
                    $parcelId = $first['parcelID'] ?? $first['parcelId'] ?? '';
                    $labelBase64 = $first['stream'] ?? '';
                }
            }

            return [
                'success' => true,
                'parcel_id' => $parcelId,
                'label_base64' => $labelBase64,
                'tracking_url' => $parcelId ? 'https://www.brt.it/it/tracking?parcelId=' . urlencode($parcelId) : '',
                'raw_response' => $body,
            ];
        } catch (\Exception $e) {
            Log::error('BRT TEST createShipment exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Errore connessione BRT: ' . $e->getMessage()];
        }
    }

    /**
     * Conferma una spedizione BRT (modalita' di conferma esplicita).
     */
    public function confirmShipment(int $numericSenderReference): array
    {
        $payload = [
            'account' => $this->config->accountPayload(),
            'confirmData' => [
                'senderCustomerCode' => (int) $this->config->clientId,
                'numericSenderReference' => $numericSenderReference,
            ],
        ];

        try {
            $response = $this->config->shipmentClient()
                ->put($this->config->apiUrl . '/shipment', $payload);

            $body = $response->json();

            Log::info('BRT confirmShipment response', [
                'reference' => $numericSenderReference,
                'body' => $body,
            ]);

            $execCode = $body['executionMessage']['code'] ?? -1;
            if ($execCode < 0) {
                return ['success' => false, 'error' => $body['executionMessage']['message'] ?? 'Errore conferma BRT.'];
            }

            return ['success' => true, 'raw_response' => $body];
        } catch (\Exception $e) {
            Log::error('BRT confirmShipment exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Elimina una spedizione BRT.
     */
    public function deleteShipment(int $numericSenderReference): array
    {
        $payload = [
            'account' => $this->config->accountPayload(),
            'deleteData' => [
                'senderCustomerCode' => (int) $this->config->clientId,
                'numericSenderReference' => $numericSenderReference,
            ],
        ];

        try {
            $response = $this->config->shipmentClient()
                ->put($this->config->apiUrl . '/delete', $payload);

            $body = $response->json();
            $execCode = $body['executionMessage']['code'] ?? -1;

            return [
                'success' => $execCode >= 0,
                'error' => $execCode < 0 ? ($body['executionMessage']['message'] ?? 'Errore') : null,
                'raw_response' => $body,
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Mappa i servizi dell'app ai parametri API BRT.
     */
    private function addServicesToPayload(array &$payload, Order $order, array $options): void
    {
        $serviceMapping = [
            'consegna al piano'     => ['field' => 'particularitiesDeliveryManagement', 'value' => 'CP'],
            'delivery al piano'     => ['field' => 'particularitiesDeliveryManagement', 'value' => 'CP'],
            'ritiro al piano'       => ['field' => 'particularitiesPickupManagement', 'value' => 'RP'],
            'pickup al piano'       => ['field' => 'particularitiesPickupManagement', 'value' => 'RP'],
            'sponda idraulica'      => ['field' => 'particularitiesDeliveryManagement', 'value' => 'SU'],
            'sponda idraulica ritiro' => ['field' => 'particularitiesPickupManagement', 'value' => 'SU'],
            'giacenza'              => ['field' => 'particularitiesDeliveryManagement', 'value' => 'GI'],
            'express'               => ['field' => 'serviceType', 'value' => 'E'],
            'priority'              => ['field' => 'serviceType', 'value' => 'P'],
            '10:30'                 => ['field' => 'serviceType', 'value' => 'O'],
            'economy'               => ['field' => 'serviceType', 'value' => 'N'],
        ];

        $appliedServices = [];
        foreach ($order->packages as $package) {
            if ($package->service && !empty($package->service->service_type)) {
                $serviceType = mb_strtolower(trim($package->service->service_type), 'UTF-8');

                if (isset($serviceMapping[$serviceType])) {
                    $mapping = $serviceMapping[$serviceType];
                    $field = $mapping['field'];
                    $value = $mapping['value'];

                    if (!isset($payload['createData'][$field])) {
                        $payload['createData'][$field] = $value;
                        $appliedServices[] = [
                            'app_service' => $package->service->service_type,
                            'brt_field' => $field,
                            'brt_value' => $value,
                        ];
                    }
                } else {
                    Log::info('BRT service not mapped', [
                        'order_id' => $order->id,
                        'service_type' => $package->service->service_type,
                        'available_mappings' => array_keys($serviceMapping),
                    ]);
                }
            }
        }

        if (!empty($options['insurance_amount'])) {
            $payload['createData']['insuranceAmount'] = (float) ($options['insurance_amount'] / 100);
            $appliedServices[] = [
                'app_service' => 'assicurazione',
                'brt_field' => 'insuranceAmount',
                'brt_value' => $payload['createData']['insuranceAmount'],
            ];
        }

        if (!empty($options['delivery_appointment'])) {
            $payload['createData']['isAlertRequired'] = '1';
            $payload['createData']['particularitiesDeliveryManagement'] =
                $payload['createData']['particularitiesDeliveryManagement'] ?? 'AP';
            $appliedServices[] = [
                'app_service' => 'appuntamento_consegna',
                'brt_field' => 'particularitiesDeliveryManagement',
                'brt_value' => 'AP',
            ];
        }

        if (!empty($options['no_label'])) {
            $payload['isLabelRequired'] = 0;
            $appliedServices[] = ['app_service' => 'senza_etichetta', 'brt_field' => 'isLabelRequired', 'brt_value' => 0];
        }

        // Dimensioni colli individuali
        $parcelsWithDimensions = [];
        foreach ($order->packages as $package) {
            $l = (int) ($package->first_size ?? 0);
            $w = (int) ($package->second_size ?? 0);
            $h = (int) ($package->third_size ?? 0);
            if ($l > 0 && $w > 0 && $h > 0) {
                $qty = max(1, (int) ($package->quantity ?? 1));
                for ($i = 0; $i < $qty; $i++) {
                    $parcelsWithDimensions[] = [
                        'lengthInCm' => $l,
                        'heightInCm' => $h,
                        'widthInCm' => $w,
                        'weightInKg' => max(1, (int) ceil((float) preg_replace('/[^0-9.]/', '', $package->weight ?? '1'))),
                    ];
                }
            }
        }
        if (!empty($parcelsWithDimensions)) {
            $payload['createData']['pParcelID'] = $parcelsWithDimensions;
            $appliedServices[] = ['app_service' => 'dimensioni_colli', 'brt_field' => 'pParcelID', 'brt_value' => count($parcelsWithDimensions) . ' colli'];
        }

        if (!empty($appliedServices)) {
            Log::info('BRT services applied to shipment', [
                'order_id' => $order->id,
                'services' => $appliedServices,
            ]);
        }
    }

    /**
     * Costruisce le note per la spedizione BRT.
     */
    private function buildNotes(Order $order, array $options): string
    {
        if (!empty($options['notes'])) {
            return $options['notes'];
        }

        $notes = 'SpediamoFacile ordine #' . $order->id;

        $descriptions = $order->packages
            ->pluck('content_description')
            ->filter()
            ->unique()
            ->implode(', ');

        if ($descriptions) {
            $notes .= ' - Contenuto: ' . $descriptions;
        }

        return mb_substr($notes, 0, 50);
    }
}
