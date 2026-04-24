<?php

/**
 * PROVIDER: NullSdiProvider
 *
 * Implementazione di default dell'SdiProviderInterface.
 *
 * Non effettua alcuna chiamata HTTP: l'XML è solo generato e salvato in locale.
 * Lo stato restituito è SEMPRE "pending": l'admin può scaricare l'XML e
 * trasmetterlo manualmente (o tramite un provider configurato in seguito).
 *
 * USO CONSIGLIATO:
 *   - Ambiente di sviluppo/staging senza credenziali provider
 *   - Fase iniziale di rollout in cui la trasmissione SDI avviene fuori dal sistema
 *     (es. caricamento manuale sul portale del commercialista).
 */

namespace App\Services\Sdi;

use App\Models\Order;

class NullSdiProvider implements SdiProviderInterface
{
    public function transmit(Order $order, string $xmlContents, array $metadata = []): SdiTransmissionResult
    {
        // Nessun invio reale: segnaliamo "pending" per chiarezza.
        return SdiTransmissionResult::pending(
            'Provider SDI non configurato. XML salvato in locale (scaricabile da admin).'
        );
    }

    public function checkStatus(string $transmissionId): SdiTransmissionResult
    {
        // Senza provider non possiamo tracciare nulla
        return SdiTransmissionResult::pending('Provider SDI non configurato.');
    }

    public function name(): string
    {
        return 'null';
    }
}
