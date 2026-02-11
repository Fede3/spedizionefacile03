<?php

namespace App\Jobs;

use Carbon\Carbon;
use Illuminate\Support\Str;
use App\Mail\VerificationEmail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendVerificationEmailJob implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

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

        /* $verificationToken = Str::random(64);

        DB::table('email_verification')->updateOrInsert(
            [
                'identifier' => $this->user->identifier
            ],
            [
                'token' => Hash::make($verificationToken),
                'created_at' => now()
            ]
        ); */

        /* Mail::to($this->user->email)->queue(
            new VerificationEmail($verificationToken, $this->user->identifier)
        ); */

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $this->user->id]
        );

        /* $frontendUrl = str_replace(config('app.url'), 'http://localhost:8000', $url); */

        Mail::to($this->user->email)->queue(
            new VerificationEmail($url)
        );


    }
}
