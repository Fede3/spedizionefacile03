<?php

/**
 * EMAIL: NOTIFICA ADMIN — NUOVO RECLAMO
 *
 * Inviata all'indirizzo admin configurato in settings (o mail.from)
 * quando un cliente apre un nuovo reclamo (F03). Include link diretto
 * al backoffice per la gestione.
 */

namespace App\Mail;

use App\Models\Claim;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClaimAdminNotificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Claim $claim;

    public function __construct(Claim $claim)
    {
        $this->claim = $claim;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Admin] Nuovo reclamo #'.$this->claim->id.' — ordine #'.$this->claim->order_id,
        );
    }

    public function content(): Content
    {
        $this->claim->loadMissing(['order', 'user', 'attachments']);

        return new Content(
            view: 'emails.claim-admin-notification',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
