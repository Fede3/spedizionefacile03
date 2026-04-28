<?php

/**
 * EMAIL: CONFERMA ORDINE
 *
 * Questa classe rappresenta l'email di conferma ordine inviata
 * all'utente immediatamente dopo il pagamento riuscito.
 *
 * L'email contiene:
 * - Numero ordine e data
 * - Importo totale pagato
 * - Lista pacchi con peso e dimensioni
 * - Indirizzi mittente e destinatario
 * - Link tracking BRT (se gia' disponibile)
 * - Footer con info contatto
 *
 * DOVE SI USA:
 *   - MarkOrderProcessing.php — inviata subito dopo che l'ordine passa a "processing"
 *
 * COLLEGAMENTI:
 *   - app/Listeners/MarkOrderProcessing.php — listener che scatena l'invio
 *   - app/Models/Order.php — dati ordine
 *   - resources/views/emails/order-confirmation.blade.php — template HTML
 */

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderConfirmationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Order $order;

    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    /**
     * Configura l'oggetto dell'email.
     * Include il numero ordine per facile identificazione.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Conferma ordine #' . $this->order->id . ' - SpediamoFacile',
        );
    }

    /**
     * Aggiunge header List-Unsubscribe per conformita' GDPR.
     */
    public function headers(): \Illuminate\Mail\Mailables\Headers
    {
        $unsubscribeUrl = config('app.frontend_url') . '/account/notifiche?unsubscribe=1';

        return new \Illuminate\Mail\Mailables\Headers(
            text: [
                'List-Unsubscribe' => '<' . $unsubscribeUrl . '>',
                'List-Unsubscribe-Post' => 'List-Unsubscribe=One-Click',
            ],
        );
    }

    /**
     * Definisce il contenuto dell'email usando il template "order-confirmation".
     */
    public function content(): Content
    {
        // Carica le relazioni necessarie per il template
        $this->order->loadMissing([
            'packages.originAddress',
            'packages.destinationAddress',
            'user',
        ]);

        return new Content(
            view: 'emails.order-confirmation',
        );
    }

    /**
     * Nessun allegato per l'email di conferma ordine.
     * L'etichetta BRT viene inviata separatamente da ShipmentLabelMail.
     */
    public function attachments(): array
    {
        return [];
    }
}
