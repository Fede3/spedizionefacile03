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
            SendVerificationEmailJob::dispatchSync($user);

            DB::commit();

            return CustomResponse::setSuccessResponse('Ti abbiamo inviato un\'email con le istruzioni per completare la registrazione. Se non hai ricevuto la nostra email, controlla nella cartella SPAM.', Response::HTTP_CREATED);
        } catch (\Throwable $exception) {
            DB::rollBack();

            Log::error('Errore registrazione o invio email di verifica.', [
                'email' => $request->email,
                'error' => $exception->getMessage(),
            ]);

            return CustomResponse::setFailResponse('Registrazione non completata: impossibile inviare l\'email di verifica. Riprova tra qualche minuto.', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
