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

            // Auto-verify the email so the user can log in immediately
            $data['email_verified_at'] = now();

            $user = User::create($data);

            // Try to send verification email, but don't block registration if it fails
            try {
                SendVerificationEmailJob::dispatchSync($user);
            } catch (\Throwable $emailException) {
                Log::warning('Email di verifica non inviata, ma account creato e auto-verificato.', [
                    'email' => $request->email,
                    'error' => $emailException->getMessage(),
                ]);
            }

            DB::commit();

            return CustomResponse::setSuccessResponse('Registrazione completata con successo! Ora puoi accedere con le tue credenziali.', Response::HTTP_CREATED);
        } catch (\Throwable $exception) {
            DB::rollBack();

            Log::error('Errore registrazione.', [
                'email' => $request->email,
                'error' => $exception->getMessage(),
            ]);

            return CustomResponse::setFailResponse('Registrazione non completata. Riprova tra qualche minuto.', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
