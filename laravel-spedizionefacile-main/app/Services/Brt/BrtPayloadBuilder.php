<?php

namespace App\Services\Brt;

use App\Models\Order;
use Illuminate\Support\Facades\Log;

class BrtPayloadBuilder
{
    private const SERVICE_MAPPING = [
        'consegna al piano'       => ['field' => 'particularitiesDeliveryManagement', 'value' => 'CP'],
        'delivery al piano'       => ['field' => 'particularitiesDeliveryManagement', 'value' => 'CP'],
        'ritiro al piano'         => ['field' => 'particularitiesPickupManagement', 'value' => 'RP'],
        'pickup al piano'         => ['field' => 'particularitiesPickupManagement', 'value' => 'RP'],
        'sponda idraulica'        => ['field' => 'particularitiesDeliveryManagement', 'value' => 'SU'],
        'sponda idraulica ritiro' => ['field' => 'particularitiesPickupManagement', 'value' => 'SU'],
        'giacenza'                => ['field' => 'particularitiesDeliveryManagement', 'value' => 'GI'],
        'express'                 => ['field' => 'serviceType', 'value' => 'E'],
        'priority'                => ['field' => 'serviceType', 'value' => 'P'],
        '10:30'                   => ['field' => 'serviceType', 'value' => 'O'],
        'economy'                 => ['field' => 'serviceType', 'value' => 'N'],
    ];

    public function addServicesToPayload(array &$payload, Order $order, array $options): void
    {
        $appliedServices = [];

        foreach ($order->packages as $package) {
            if ($package->service && !empty($package->service->service_type)) {
                $serviceType = mb_strtolower(trim($package->service->service_type), 'UTF-8');

                if (isset(self::SERVICE_MAPPING[$serviceType])) {
                    $mapping = self::SERVICE_MAPPING[$serviceType];
                    if (!isset($payload['createData'][$mapping['field']])) {
                        $payload['createData'][$mapping['field']] = $mapping['value'];
                        $appliedServices[] = ['app_service' => $package->service->service_type, 'brt_field' => $mapping['field'], 'brt_value' => $mapping['value']];
                    }
                } else {
                    Log::info('BRT service not mapped', ['order_id' => $order->id, 'service_type' => $package->service->service_type]);
                }
            }
        }

        if (!empty($options['insurance_amount'])) {
            $payload['createData']['insuranceAmount'] = (float) ($options['insurance_amount'] / 100);
            $appliedServices[] = ['app_service' => 'assicurazione', 'brt_field' => 'insuranceAmount', 'brt_value' => $payload['createData']['insuranceAmount']];
        }

        if (!empty($options['delivery_appointment'])) {
            $payload['createData']['isAlertRequired'] = '1';
            $payload['createData']['particularitiesDeliveryManagement'] = $payload['createData']['particularitiesDeliveryManagement'] ?? 'AP';
            $appliedServices[] = ['app_service' => 'appuntamento_consegna', 'brt_field' => 'particularitiesDeliveryManagement', 'brt_value' => 'AP'];
        }

        if (!empty($options['no_label'])) {
            $payload['isLabelRequired'] = 0;
            $appliedServices[] = ['app_service' => 'senza_etichetta', 'brt_field' => 'isLabelRequired', 'brt_value' => 0];
        }

        $parcelsWithDimensions = [];
        foreach ($order->packages as $package) {
            $l = (int) ($package->first_size ?? 0);
            $w = (int) ($package->second_size ?? 0);
            $h = (int) ($package->third_size ?? 0);
            if ($l > 0 && $w > 0 && $h > 0) {
                $qty = max(1, (int) ($package->quantity ?? 1));
                for ($i = 0; $i < $qty; $i++) {
                    $parcelsWithDimensions[] = [
                        'lengthInCm' => $l, 'heightInCm' => $h, 'widthInCm' => $w,
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
            Log::info('BRT services applied to shipment', ['order_id' => $order->id, 'services' => $appliedServices]);
        }
    }

    public function buildNotes(Order $order, array $options): string
    {
        if (!empty($options['notes'])) return $options['notes'];

        $notes = 'SpediamoFacile ordine #' . $order->id;
        $descriptions = $order->packages->pluck('content_description')->filter()->unique()->implode(', ');
        if ($descriptions) $notes .= ' - Contenuto: ' . $descriptions;

        return mb_substr($notes, 0, 50);
    }

    public function buildTestPayload(BrtConfig $config, AddressNormalizer $normalizer, array $data): array
    {
        $numericSenderReference = (int) (time() % 1000000000);
        $testAddress = (object) [
            'city' => $data['consignee_city'] ?? '',
            'postal_code' => $data['consignee_zip'] ?? '',
            'province' => $data['consignee_province'] ?? '',
        ];
        $normalizedTest = $normalizer->normalizeAddressForBrt($testAddress);

        $senderZip = $data['sender_zip'] ?? '';
        $departureDepot = FilialeLookup::resolveFilialeByCap($senderZip)
            ?? $config->departureDepot;

        $createData = [
            'departureDepot' => $departureDepot,
            'senderCustomerCode' => (int) $config->clientId,
            'deliveryFreightTypeCode' => 'DAP',
            // Mittente (opzionale nei test, ma utile per validazione completa)
            'senderCompanyName' => $data['sender_name'] ?? '',
            'senderAddress' => $data['sender_address'] ?? '',
            'senderZIPCode' => $senderZip,
            'senderCity' => $data['sender_city'] ?? '',
            'senderProvinceAbbreviation' => $data['sender_province'] ?? '',
            'senderCountryAbbreviationISOAlpha2' => $data['sender_country'] ?? 'IT',
            // Destinatario
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
        ];

        // Rimuovi campi mittente vuoti per non interferire con i test
        foreach (['senderCompanyName', 'senderAddress', 'senderZIPCode', 'senderCity', 'senderProvinceAbbreviation'] as $field) {
            if (empty($createData[$field])) {
                unset($createData[$field]);
            }
        }

        return [
            'payload' => [
                'account' => $config->accountPayload(),
                'createData' => $createData,
                'isLabelRequired' => 1,
                'labelParameters' => self::defaultLabelParameters(),
            ],
            'numericSenderReference' => $numericSenderReference,
        ];
    }

    public static function defaultLabelParameters(): array
    {
        return [
            'outputType' => 'PDF', 'offsetX' => 0, 'offsetY' => 0,
            'isBorderRequired' => 0, 'isLogoRequired' => 1, 'isBarcodeControlRowRequired' => 1,
        ];
    }
}
