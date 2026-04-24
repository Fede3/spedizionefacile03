<?php

/**
 * PROVIDER: TwilioSmsProvider (STUB)
 *
 * Skeleton per Twilio Programmable SMS. La chiamata API e' commentata in
 * attesa che vengano:
 *   1. Aggiunto il pacchetto: composer require twilio/sdk
 *   2. Configurate in .env le tre variabili:
 *        TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *        TWILIO_AUTH_TOKEN=your_auth_token_here
 *        TWILIO_FROM=+391112223333  (Sender ID o numero approvato)
 *   3. Verificato il sender (alphanumeric o numero comprato in console Twilio).
 *
 * Quando si abilita davvero, decommentare il blocco "@phpstan-ignore" e
 * importare la classe Twilio\Rest\Client.
 *
 * COMPORTAMENTO STUB:
 *   - Se sid/token/from mancano: restituisce SmsSendResult::failed().
 *   - Se presenti ma client non installato: restituisce SmsSendResult::skipped()
 *     con messaggio diagnostico (utile per integration test).
 */

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;
use Throwable;

class TwilioSmsProvider implements SmsProviderInterface
{
    public function __construct(
        private readonly ?string $accountSid,
        private readonly ?string $authToken,
        private readonly ?string $from,
    ) {}

    public function send(string $to, string $message): SmsSendResult
    {
        if (!$this->accountSid || !$this->authToken || !$this->from) {
            Log::warning('[SMS:twilio] credenziali mancanti', [
                'has_sid' => (bool) $this->accountSid,
                'has_token' => (bool) $this->authToken,
                'has_from' => (bool) $this->from,
            ]);
            return SmsSendResult::failed(
                'Configurazione Twilio incompleta (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM).',
                $this->name(),
            );
        }

        // STUB: il pacchetto twilio/sdk NON e' ancora installato.
        // Per attivare l'invio reale:
        //   composer require twilio/sdk
        // poi rimuovere il blocco "STUB" qui sotto e decommentare la sezione live.
        if (!class_exists('Twilio\\Rest\\Client')) {
            return SmsSendResult::skipped(
                'Pacchetto twilio/sdk non installato. Esegui: composer require twilio/sdk',
                $this->name(),
            );
        }

        try {
            // ---- BLOCCO LIVE (decommentare quando il pacchetto e' installato) ----
            // /** @var \Twilio\Rest\Client $client */
            // $client = new \Twilio\Rest\Client($this->accountSid, $this->authToken);
            // $created = $client->messages->create($to, [
            //     'from' => $this->from,
            //     'body' => $message,
            // ]);
            // return SmsSendResult::sent((string) $created->sid, $this->name());
            // ----------------------------------------------------------------------

            // Fallback temporaneo finche' il blocco LIVE non e' attivo:
            return SmsSendResult::skipped(
                'TwilioSmsProvider: chiamata API non ancora attivata. Vedi commenti nel file.',
                $this->name(),
            );
        } catch (Throwable $e) {
            Log::error('[SMS:twilio] errore invio', [
                'to' => $to,
                'error' => $e->getMessage(),
            ]);
            return SmsSendResult::failed(
                'Errore Twilio: ' . $e->getMessage(),
                $this->name(),
            );
        }
    }

    public function name(): string
    {
        return 'twilio';
    }
}
