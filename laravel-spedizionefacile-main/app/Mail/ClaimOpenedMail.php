<?php

/**
 * EMAIL: CONFERMA APERTURA RECLAMO (cliente)
 *
 * Inviata al cliente che ha aperto un reclamo su un ordine (F03).
 * Contiene riferimento reclamo, ordine, tipologia, sintesi descrizione,
 * tempi indicativi di gestione.
 */

namespace App\Mail;

use App\Models\Claim;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;

class ClaimOpenedMail extends Mailable implements ShouldQueue
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
            subject: 'Reclamo #'.$this->claim->id.' ricevuto - SpediamoFacile',
        );
    }

    public function headers(): Headers
    {
        $unsubscribeUrl = config('app.frontend_url').'/account/notifiche?unsubscribe=1';

        return new Headers(
            text: [
                'List-Unsubscribe' => '<'.$unsubscribeUrl.'>',
                'List-Unsubscribe-Post' => 'List-Unsubscribe=One-Click',
            ],
        );
    }

    public function content(): Content
    {
        $this->claim->loadMissing(['order', 'user']);

        return new Content(
            view: 'emails.claim-opened',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
