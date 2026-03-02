<?php

namespace App\Mail;

use App\Models\ReferralUsage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReferralUsedMail extends Mailable
{
    use Queueable, SerializesModels;

    public ReferralUsage $usage;

    public function __construct(ReferralUsage $usage)
    {
        $this->usage = $usage;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Nuovo utilizzo del tuo codice referral',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.referral-used',
        );
    }
}
