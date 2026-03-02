<?php

namespace App\Services;

use App\Models\Order;

class ShipmentExecutionService
{
    public function __construct(
        private readonly BrtService $brt,
        private readonly ShipmentDocumentDispatcher $documents,
    ) {}

    public function getExecutionPayload(Order $order): array
    {
        return [
            'shipment_status' => ! empty($order->brt_parcel_id) ? 'completed' : 'pending',
            'pickup_status' => $order->pickup_status,
            'pickup_requested_at' => $order->pickup_requested_at?->toIso8601String(),
            'carrier_pickup_ref' => $order->pickup_reference,
            'pickup_time_slot' => $order->pickup_time_slot,
            'pickup_notes' => $order->pickup_notes,
            'bordero_status' => $order->bordero_status,
            'carrier_bordero_ref' => $order->bordero_reference,
            'documents_status' => $order->documents_status,
            'documents_sent_customer_at' => $order->documents_sent_customer_at?->toIso8601String(),
            'documents_sent_admin_at' => $order->documents_sent_admin_at?->toIso8601String(),
            'last_error' => $order->execution_error,
        ];
    }

    public function requestPickup(Order $order, ?array $override = null): array
    {
        $pickupRequest = $override ?? $this->resolvePickupRequestFromOrder($order);

        $enabled = (bool) ($pickupRequest['enabled'] ?? false);
        if (! $enabled) {
            $order->pickup_status = 'not_requested';
            $order->pickup_reference = null;
            $order->pickup_requested_at = null;
            $order->save();

            return ['success' => true, 'status' => 'not_requested'];
        }

        $result = $this->brt->requestHomePickup($order, $pickupRequest);

        if (! ($result['success'] ?? false)) {
            $order->pickup_status = 'failed';
            $order->execution_error = $result['error'] ?? 'Errore richiesta ritiro';
            $order->save();

            return $result;
        }

        $order->pickup_status = $result['status'] ?? 'requested';
        $order->pickup_reference = $result['pickup_reference'] ?? null;
        $order->pickup_requested_at = now();
        $order->pickup_time_slot = $pickupRequest['time_slot'] ?? null;
        $order->pickup_notes = $pickupRequest['notes'] ?? null;
        $order->save();

        return $result;
    }

    public function createBordero(Order $order): array
    {
        $result = $this->brt->createBordero($order);

        if (! ($result['success'] ?? false)) {
            $order->bordero_status = 'failed';
            $order->execution_error = $result['error'] ?? 'Errore creazione bordero';
            $order->save();

            return $result;
        }

        $order->bordero_status = 'completed';
        $order->bordero_reference = $result['bordero_reference'] ?? null;
        $order->bordero_document_base64 = $result['document_base64'] ?? null;
        $order->bordero_document_mime = $result['document_mime'] ?? 'text/plain';
        $order->bordero_document_filename = $result['document_filename'] ?? null;
        $order->save();

        return $result;
    }

    public function sendDocuments(Order $order): array
    {
        return $this->documents->dispatchForOrder($order);
    }

    public function runAutomaticPostLabelFlow(Order $order): void
    {
        $this->requestPickup($order);
        $bordero = $this->createBordero($order);
        if (! ($bordero['success'] ?? false)) {
            $order->documents_status = 'skipped';
            $order->execution_error = trim(($order->execution_error ? $order->execution_error.' | ' : '').'Documenti non inviati: borderò non disponibile.');
            $order->save();

            return;
        }

        $this->sendDocuments($order);
    }

    private function resolvePickupRequestFromOrder(Order $order): array
    {
        $order->loadMissing(['packages.service']);
        $serviceData = $order->packages->first()?->service->service_data ?? [];

        return is_array($serviceData['pickup_request'] ?? null)
            ? $serviceData['pickup_request']
            : [];
    }
}
