<?php

/**
 * EMAIL: AGGIORNAMENTO STATO SPEDIZIONE
 *
 * Questa classe rappresenta l'email inviata all'utente quando lo stato
 * della sua spedizione cambia (es. in_transit, delivered, in_giacenza, completed).
 *
 * L'email contiene:
 * - Numero ordine e nuovo stato tradotto in italiano
 * - Stato precedente per contesto
 * - Link tracking BRT (se disponibile)
 * - Footer con info contatto
 *
 * DOVE SI USA:
 *   - SendShipmentStatusEmail.php — listener dell'evento ShipmentStatusChanged
 *
 * COLLEGAMENTI:
 *   - app/Events/ShipmentStatusChanged.php — evento che scatena l'invio
 *   - app/Listeners/SendShipmentStatusEmail.php — listener che invia l'email
 *   - resources/views/emails/shipment-status.blade.php — template HTML
 */

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ShipmentStatusUpdateMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Order $order;
    public string $oldStatus;
    public string $newStatus;

    public function __construct(Order $order, string $oldStatus, string $newStatus)
    {
        $this->order = $order;
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
    }

    /**
     * Configura l'oggetto dell'email.
     * Include il numero ordine per facile identificazione.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Aggiornamento spedizione #' . $this->order->id . ' - SpediamoFacile',
        );
    }

    /**
     * Definisce il contenuto dell'email usando il template "shipment-status".
     * Passa le traduzioni degli stati in italiano alla vista.
     */
    public function content(): Content
    {
        $this->order->loadMissing([
            'packages.originAddress',
            'packages.destinationAddress',
            'user',
        ]);

        $statusLabels = [
            'pending' => 'In attesa',
            'processing' => 'In lavorazione',
            'completed' => 'Completato',
            'payment_failed' => 'Pagamento fallito',
            'payed' => 'Pagato',
            'cancelled' => 'Annullato',
            'refunded' => 'Rimborsato',
            'in_transit' => 'In transito',
            'delivered' => 'Consegnato',
            'in_giacenza' => 'In giacenza',
        ];

        return new Content(
            view: 'emails.shipment-status',
            with: [
                'oldStatusLabel' => $statusLabels[$this->oldStatus] ?? $this->oldStatus,
                'newStatusLabel' => $statusLabels[$this->newStatus] ?? $this->newStatus,
            ],
        );
    }

    /**
     * Nessun allegato per l'email di aggiornamento stato.
     */
    public function attachments(): array
    {
        return [];
    }
}
