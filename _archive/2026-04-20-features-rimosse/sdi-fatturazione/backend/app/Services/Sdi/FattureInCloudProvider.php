<?php

/**
 * PROVIDER: FattureInCloudProvider (STUB)
 *
 * Scaffolding per integrazione futura con Fatture in Cloud (API v2).
 * L'implementazione attuale è uno stub: restituisce "pending" finché non
 * vengono configurate le credenziali (config/services.php -> fic).
 *
 * QUANDO ABILITARE:
 *   - Impostare FIC_API_TOKEN + FIC_COMPANY_ID in .env
 *   - Aggiornare config('services.fic') e cambiare il binding in AppServiceProvider
 *
 * ENDPOINT DA IMPLEMENTARE (doc: https://developers.fattureincloud.it):
 *   POST /c/{company_id}/issued_documents/e_invoice   → invio XML
 *   GET  /c/{company_id}/issued_documents/{id}        → stato
 */

namespace App\Services\Sdi;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FattureInCloudProvider implements SdiProviderInterface
{
    public function __construct(
        private readonly ?string $apiToken,
        private readonly ?string $companyId,
        private readonly string $baseUrl = 'https://api-v2.fattureincloud.it',
    ) {}

    public function transmit(Order $order, string $xmlContents, array $metadata = []): SdiTransmissionResult
    {
        if (! $this->isConfigured()) {
            Log::info('FattureInCloudProvider: credenziali mancanti, fallback pending', [
                'order_id' => $order->id,
            ]);

            return SdiTransmissionResult::pending(
                'Fatture in Cloud non configurato (manca FIC_API_TOKEN / FIC_COMPANY_ID).'
            );
        }

        // STUB: in produzione sostituire con chiamata reale all'API FIC.
        // Esempio (commentato) a titolo di documentazione:
        /*
        $response = Http::withToken($this->apiToken)
            ->acceptJson()
            ->post("{$this->baseUrl}/c/{$this->companyId}/issued_documents/e_invoice", [
                'data' => [
                    'xml' => base64_encode($xmlContents),
                    'external_id' => 'SF-'.$order->id,
                ],
            ]);

        if ($response->failed()) {
            return SdiTransmissionResult::rejected(
                null,
                $response->body(),
                $this->name(),
            );
        }

        $transmissionId = (string) ($response->json('data.id') ?? '');
        return SdiTransmissionResult::sent($transmissionId, $this->name());
        */

        return SdiTransmissionResult::pending(
            'Stub FattureInCloudProvider: integrazione non ancora implementata.'
        );
    }

    public function checkStatus(string $transmissionId): SdiTransmissionResult
    {
        if (! $this->isConfigured()) {
            return SdiTransmissionResult::pending('Fatture in Cloud non configurato.');
        }

        return SdiTransmissionResult::pending('Stub FattureInCloudProvider: checkStatus non implementato.');
    }

    public function name(): string
    {
        return 'fatture-in-cloud';
    }

    private function isConfigured(): bool
    {
        return ! empty($this->apiToken) && ! empty($this->companyId);
    }
}
