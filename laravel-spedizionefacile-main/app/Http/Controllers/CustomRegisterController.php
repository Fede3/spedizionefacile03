<?php

namespace App\Http\Controllers;

use App\Http\Requests\RegisterRequest;
use App\Jobs\SendVerificationEmailJob;
use App\Models\User;
use App\Utils\CustomResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class CustomRegisterController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $data = $request->validated();
        $data['telephone_number'] = $data['prefix'] . ' ' . $data['telephone_number'];
        unset($data['prefix']);

        try {
            DB::beginTransaction();

            $user = User::create($data);

            // Try to send verification email
            try {
                SendVerificationEmailJob::dispatchSync($user);
            } catch (\Throwable $mailException) {
                Log::warning('Email di verifica non inviata (mailer potrebbe essere in modalità log).', [
                    'email' => $user->email,
                    'error' => $mailException->getMessage(),
                ]);
            }

            // In local/dev: auto-verify so user can login immediately
            // In production with real SMTP: user will receive the email
            if (app()->environment('local', 'testing') && config('mail.default') === 'log') {
                $user->update(['email_verified_at' => now()]);
            }

            DB::commit();

            $message = $user->email_verified_at
                ? 'Registrazione completata! Puoi accedere al tuo account.'
                : 'Ti abbiamo inviato un\'email con le istruzioni per completare la registrazione. Se non hai ricevuto la nostra email, controlla nella cartella SPAM.';

            return CustomResponse::setSuccessResponse($message, Response::HTTP_CREATED);
        } catch (\Throwable $exception) {
            DB::rollBack();

            Log::error('Errore registrazione o invio email di verifica.', [
                'email' => $request->email,
                'error' => $exception->getMessage(),
            ]);

            return CustomResponse::setFailResponse('Registrazione non completata. Riprova tra qualche minuto.', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
