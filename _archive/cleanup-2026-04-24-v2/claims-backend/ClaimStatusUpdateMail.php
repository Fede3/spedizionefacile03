<?php

/**
 * EMAIL: RISPOSTA ADMIN A RECLAMO (F03 workflow esteso)
 *
 * Inviata al cliente quando un admin usa POST /api/admin/claims/{claim}/reply
 * per mandare una risposta testuale. A differenza di ClaimResolvedMail non
 * implica la chiusura del reclamo: e' pensata per la fase in_review.
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

class ClaimStatusUpdateMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Claim $claim;
    public string $replyMessage;

    public function __construct(Claim $claim, string $replyMessage)
    {
        $this->claim = $claim;
        $this->replyMessage = $replyMessage;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Aggiornamento reclamo #' . $this->claim->id . ' - SpediamoFacile',
        );
    }

    public function headers(): Headers
    {
        $unsubscribeUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/')
            . '/account/notifiche?unsubscribe=1';

        return new Headers(
            text: [
                'List-Unsubscribe' => '<' . $unsubscribeUrl . '>',
                'List-Unsubscribe-Post' => 'List-Unsubscribe=One-Click',
            ],
        );
    }

    public function content(): Content
    {
        $this->claim->loadMissing(['order', 'user']);

        return new Content(
            view: 'emails.claim-status-update',
            with: [
                'claim'        => $this->claim,
                'replyMessage' => $this->replyMessage,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
