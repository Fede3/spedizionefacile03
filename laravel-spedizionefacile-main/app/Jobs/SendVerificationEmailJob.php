<?php

/**
 * FILE: SendVerificationEmailJob.php
 * SCOPO: Job che invia l'email con il codice di verifica a 6 cifre all'utente.
 *
 * DOVE SI USA:
 *   - CustomLoginController.php — dopo login con email non verificata
 *   - CustomRegisterController.php — dopo la registrazione di un nuovo utente
 *   - CustomLoginController.php — resendVerificationEmail per reinvio
 *
 * DATI IN INGRESSO:
 *   - Oggetto User con verification_code gia' generato e salvato nel database
 *   Esempio: SendVerificationEmailJob::dispatchSync($user)
 *
 * DATI IN USCITA:
 *   - Nessun ritorno (void), invia l'email all'utente
 *
 * VINCOLI:
 *   - Il campo verification_code dell'utente deve essere gia' popolato prima del dispatch
 *   - Usa dispatchSync (sincrono): l'email viene inviata immediatamente, non in coda
 *   - Se il codice e' null, logga un warning e non invia nulla
 *
 * ERRORI TIPICI:
 *   - Chiamare il job senza aver prima generato verification_code: l'email non viene inviata
 *   - Errori SMTP: il job non gestisce retry automatici, l'eccezione viene propagata
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per rendere il job asincrono: implementare ShouldQueue e usare dispatch() invece di dispatchSync()
 *   - Per cambiare il template email: modificare app/Mail/VerificationEmail.php
 *
 * COLLEGAMENTI:
 *   - app/Mail/VerificationEmail.php — template dell'email con il codice
 *   - app/Http/Controllers/CustomLoginController.php — genera il codice e chiama questo job
 *   - app/Http/Controllers/CustomRegisterController.php — registrazione con verifica email
 */

namespace App\Jobs;

use App\Mail\VerificationEmail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendVerificationEmailJob
{
    protected $user;

    /**
     * Crea il job con l'utente a cui inviare l'email.
     */
    public function __construct($user)
    {
        $this->user = $user;
    }

    /**
     * Esegue il job: invia l'email con il codice di verifica a 6 cifre.
     */
    public function handle(): void
    {
        $code = $this->user->verification_code;

        if (!$code) {
            Log::warning('Tentativo di invio email di verifica senza codice.', [
                'user_id' => $this->user->id,
                'email' => $this->user->email,
            ]);
            return;
        }

        Mail::to($this->user->email)->send(
            new VerificationEmail($code)
        );
    }

    public static function dispatchSync($user): void
    {
        (new self($user))->handle();
    }
}
