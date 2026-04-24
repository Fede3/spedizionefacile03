<?php

/**
 * INTERFACE: SdiProviderInterface
 *
 * Astrazione per i provider di trasmissione al Sistema di Interscambio (SDI).
 * Permette di avere implementazioni diverse (Fatture in Cloud, Aruba, Agyo, ...)
 * mantenendo invariato il codice che genera l'XML e aggiorna lo stato dell'ordine.
 *
 * CICLO DI VITA:
 *   1. SdiService genera XML FatturaPA v1.2.2 e lo salva localmente.
 *   2. Chiama $provider->transmit($order, $xmlContents, $metadata).
 *   3. Il provider risponde con un SdiTransmissionResult (id trasmissione, stato, messaggio).
 *   4. Se provider remoto configurato → status=sent. Se null provider → status=pending (solo archiviazione).
 *   5. Webhook / polling successivo aggiorna status a accepted/rejected.
 *
 * IMPLEMENTAZIONI DISPONIBILI:
 *   - NullSdiProvider (default, no-op): salva XML localmente, nessun invio esterno.
 *   - FattureInCloudProvider (stub): pronto per integrazione futura con Fatture in Cloud API.
 */

namespace App\Services\Sdi;

use App\Models\Order;

interface SdiProviderInterface
{
    /**
     * Trasmette l'XML al provider.
     *
     * @param Order $order Ordine di riferimento
     * @param string $xmlContents Contenuto completo dell'XML FatturaPA
     * @param array $metadata Metadati (numero fattura, hash, totali) utili al provider
     * @return SdiTransmissionResult
     */
    public function transmit(Order $order, string $xmlContents, array $metadata = []): SdiTransmissionResult;

    /**
     * Richiede al provider lo stato corrente di una trasmissione.
     * (Usato dal command invoices:sdi-sync per polling periodico.)
     *
     * @param string $transmissionId ID ricevuto da transmit()
     * @return SdiTransmissionResult
     */
    public function checkStatus(string $transmissionId): SdiTransmissionResult;

    /**
     * Etichetta leggibile del provider (es. "null", "fatture-in-cloud").
     */
    public function name(): string;
}
