<?php

/**
 * EMAIL: RECLAMO RICEVUTO (M8)
 *
 * Inviata al cliente subito dopo l'apertura di un reclamo (F03).
 * Versione design-system M8: estende `emails.layouts.base`.
 *
 * Differenza vs ClaimOpenedMail (preesistente):
 *   - Layout aggiornato e palette ufficiale teal+arancione
 *   - Subject "Abbiamo ricevuto il tuo reclamo — #ID"
 *
 * DATI RICHIESTI:
 *   - Claim $claim   con relazioni order, user (caricate automaticamente)
 *
 * USO TIPICO:
 *   Mail::to($claim->user->email)->send(new ClaimReceivedMail($claim));
 *
 * TEMPLATE:
 *   resources/views/emails/claim-received.blade.php
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

class ClaimReceivedMail extends Mailable implements ShouldQueue
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
            subject: 'Abbiamo ricevuto il tuo reclamo — #' . $this->claim->id,
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
            view: 'emails.claim-received',
            with: [
                'claim' => $this->claim,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
