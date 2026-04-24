<?php

/**
 * EMAIL: RISOLUZIONE RECLAMO (cliente)
 *
 * Inviata al cliente quando admin chiude un reclamo con status
 * resolved o rejected (F03). Include note di risoluzione scritte da admin.
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

class ClaimResolvedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Claim $claim;

    public function __construct(Claim $claim)
    {
        $this->claim = $claim;
    }

    public function envelope(): Envelope
    {
        $isResolved = $this->claim->status === Claim::STATUS_RESOLVED;
        $subject = $isResolved
            ? 'Reclamo #'.$this->claim->id.' risolto - SpediamoFacile'
            : 'Aggiornamento reclamo #'.$this->claim->id.' - SpediamoFacile';

        return new Envelope(subject: $subject);
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
            view: 'emails.claim-resolved',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
