<?php

/**
 * PROVIDER: NullSmsProvider
 *
 * Implementazione di default dell'SmsProviderInterface.
 *
 * NON effettua alcuna chiamata HTTP: il messaggio viene scritto solo nei log
 * applicativi (canale "sms") cosi' lo si puo' verificare in dev/staging
 * senza spese e senza credenziali esterne.
 *
 * USO CONSIGLIATO:
 *   - Sviluppo locale.
 *   - Staging/UAT prima del go-live.
 *   - Fallback in produzione se il driver remoto non e' configurato.
 */

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;

class NullSmsProvider implements SmsProviderInterface
{
    public function send(string $to, string $message): SmsSendResult
    {
        Log::channel(config('logging.default'))->info('[SMS:null] simulated send', [
            'to' => $to,
            'message' => $message,
            'length' => mb_strlen($message),
        ]);

        return SmsSendResult::skipped(
            'Provider SMS non configurato (driver=null). Messaggio loggato, nessun invio reale.',
            $this->name(),
        );
    }

    public function name(): string
    {
        return 'null';
    }
}
