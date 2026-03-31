<?php

/**
 * FILE: SendOrderConfirmation.php
 * SCOPO: Listener che invia l'email di conferma ordine all'utente dopo la creazione.
 *
 * DOVE SI USA:
 *   - EventServiceProvider — registrato come listener di OrderCreated
 *   - Scatenato quando un nuovo ordine viene creato e il pagamento e' ricevuto
 *
 * DATI IN INGRESSO:
 *   - OrderCreated event con order (l'ordine appena creato)
 *
 * DATI IN USCITA:
 *   - Nessun ritorno (void), invia email all'utente
 *
 * VINCOLI:
 *   - L'ordine deve avere un utente con email valida
 *   - L'email viene inviata in modo asincrono (queue) grazie a ShouldQueue sulla Mailable
 *
 * ERRORI TIPICI:
 *   - Email fallita: non blocca, l'errore viene solo loggato
 *
 * COLLEGAMENTI:
 *   - app/Events/OrderCreated.php — evento che scatena questo listener
 *   - app/Mail/OrderConfirmationMail.php — Mailable inviata
 *   - resources/views/emails/order-confirmation.blade.php — template HTML
 */

namespace App\Listeners;

use App\Events\OrderCreated;
use App\Mail\OrderConfirmationMail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendOrderConfirmation
{
    public function __construct()
    {
        //
    }

    /**
     * Gestisce l'evento: invia email di conferma ordine all'utente.
     *
     * Carica la relazione utente se non gia' presente e invia
     * l'email OrderConfirmationMail con i dettagli dell'ordine.
     */
    public function handle(OrderCreated $event): void
    {
        try {
            $event->order->loadMissing('user');

            if ($event->order->user && $event->order->user->email) {
                Mail::to($event->order->user->email)
                    ->send(new OrderConfirmationMail($event->order));

                Log::info('Order confirmation email sent', [
                    'order_id' => $event->order->id,
                    'user_email' => $event->order->user->email,
                ]);
            }
        } catch (\Exception $e) {
            // Se l'invio email fallisce, registra l'errore ma non blocca il flusso
            Log::error('Failed to send order confirmation email', [
                'order_id' => $event->order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
