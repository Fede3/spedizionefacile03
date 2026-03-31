<?php
/**
 * FILE: Brt/BrtConfig.php
 * SCOPO: Configurazione centralizzata e factory HTTP client per le API BRT.
 *
 * Tutti i servizi Brt/* usano questa classe per ottenere credenziali, URL e client HTTP.
 */

namespace App\Services\Brt;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\PendingRequest;

class BrtConfig
{
    public readonly string $apiUrl;
    public readonly string $pudoApiUrl;
    public readonly string $clientId;
    public readonly string $password;
    public readonly string $pudoToken;
    public readonly int $departureDepot;
    public readonly bool $verifySsl;

    public function __construct()
    {
        $this->apiUrl = config('services.brt.api_url', 'https://api.brt.it/rest/v1/shipments');
        $this->pudoApiUrl = config('services.brt.pudo_api_url', 'https://api.brt.it');
        $this->clientId = config('services.brt.client_id', '');
        $this->password = config('services.brt.password', '');
        $this->pudoToken = config('services.brt.pudo_token', '');
        $this->departureDepot = (int) config('services.brt.departure_depot', 0);
        $this->verifySsl = (bool) config('services.brt.verify_ssl', true);
    }

    /**
     * Client HTTP per le API spedizioni BRT (con SSL configurabile e timeout 30s).
     */
    public function shipmentClient(): PendingRequest
    {
        return Http::withOptions(['verify' => $this->verifySsl])
            ->timeout(30)
            ->withHeaders(['Content-Type' => 'application/json']);
    }

    /**
     * Client HTTP per le API PUDO BRT (senza verifica SSL, timeout 15s).
     */
    public function pudoClient(): PendingRequest
    {
        $headers = ['Accept' => 'application/json'];
        if (!empty($this->pudoToken)) {
            $headers['X-API-Auth'] = $this->pudoToken;
        }

        return Http::timeout(15)
            ->withoutVerifying()
            ->withHeaders($headers);
    }

    /**
     * Array credenziali account per i payload BRT.
     */
    public function accountPayload(): array
    {
        return [
            'userID' => $this->clientId,
            'password' => $this->password,
        ];
    }
}
