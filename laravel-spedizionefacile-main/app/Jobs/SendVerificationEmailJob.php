<?php

namespace App\Jobs;

use App\Mail\VerificationEmail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

class SendVerificationEmailJob
{
    protected $user;

    /**
     * Create a new job instance.
     */
    public function __construct($user)
    {
        $this->user = $user;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $this->user->id]
        );

        Mail::to($this->user->email)->send(
            new VerificationEmail($url)
        );
    }

    public static function dispatchSync($user): void
    {
        (new self($user))->handle();
    }
}
