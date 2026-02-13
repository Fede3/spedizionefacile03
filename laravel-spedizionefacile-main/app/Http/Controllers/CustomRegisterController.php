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

        // Validate and store referral code if provided
        if (!empty($data['referred_by'])) {
            $referralCode = strtoupper($data['referred_by']);
            $proUser = User::where('referral_code', $referralCode)
                ->where('role', 'Partner Pro')
                ->first();
            $data['referred_by'] = $proUser ? $referralCode : null;
        }

        try {
            DB::beginTransaction();

            // Generate 6-digit verification code
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            $user = User::create($data);
            $user->update([
                'verification_code' => $code,
                'verification_code_expires_at' => now()->addMinutes(30),
            ]);

            // Try to send verification email with code
            try {
                SendVerificationEmailJob::dispatchSync($user);
            } catch (\Throwable $mailException) {
                Log::warning('Email di verifica non inviata.', [
                    'email' => $user->email,
                    'error' => $mailException->getMessage(),
                ]);
            }

            DB::commit();

            return CustomResponse::setSuccessResponse(
                'Registrazione completata! Inserisci il codice di verifica a 6 cifre inviato alla tua email.',
                Response::HTTP_CREATED
            );
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
