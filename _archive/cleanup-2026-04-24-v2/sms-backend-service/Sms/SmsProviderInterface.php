<?php

/**
 * INTERFACE: SmsProviderInterface
 *
 * Astrazione per provider SMS (Twilio, MessageBird, Vonage, Skebby, ...).
 * Permette di sostituire l'implementazione (default: NullSmsProvider) senza
 * modificare il codice applicativo che invia messaggi.
 *
 * CICLO DI VITA:
 *   1. SmsService riceve un messaggio da inviare via $service->send($to, $body).
 *   2. Internamente normalizza il numero (formato E.164, default +39 IT) e
 *      delega al provider iniettato tramite container.
 *   3. Il provider esegue la chiamata API (o no-op) e restituisce SmsSendResult.
 *
 * IMPLEMENTAZIONI:
 *   - NullSmsProvider (default): logga e restituisce risultato simulato.
 *   - TwilioSmsProvider (stub): pronto per Twilio Programmable SMS, client da
 *     attivare quando saranno disponibili credenziali (TWILIO_ACCOUNT_SID,
 *     TWILIO_AUTH_TOKEN, TWILIO_FROM in .env).
 */

namespace App\Services\Sms;

interface SmsProviderInterface
{
    /**
     * Invia un SMS al destinatario.
     *
     * @param string $to     Numero in formato E.164 (es. +393331234567)
     * @param string $message Testo del messaggio (max 160 char per singola SMS GSM-7).
     * @return SmsSendResult
     */
    public function send(string $to, string $message): SmsSendResult;

    /**
     * Etichetta leggibile del provider (es. "null", "twilio").
     */
    public function name(): string;
}
