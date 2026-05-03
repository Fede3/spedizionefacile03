<?php

/**
 * RegisterController -- Registrazione, verifica codice email e reinvio.
 *
 * Thin controller: business logic in App\Services\Auth\RegisterService.
 */

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\ResendVerificationEmailRequest;
use App\Http\Requests\VerifyCodeRequest;
use App\Models\User;
use App\Services\Auth\RegisterService;
use App\Services\GuestCartMergeService;
use App\Support\AuthUiCookie;
use App\Support\CustomResponse;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RegisterController extends Controller
{
    private const REGISTER_OK_MSG = 'Registrazione completata! Inserisci il codice di verifica a 6 cifre inviato alla tua email.';

    public function __construct(
        private readonly GuestCartMergeService $guestCartMerge,
        private readonly RegisterService $registerService,
    ) {}

    /**
     * Registrazione anti-enumeration (Sprint 6.4 / OWASP Auth Cheatsheet):
     * email duplicata = stesso messaggio di successo, nessun utente creato.
     */
    public function register(RegisterRequest $request)
    {
        $data = $request->validated();

        if (User::where('email', $data['email'])->exists()) {
            Log::info('Tentativo di registrazione con email duplicata.', [
                'email' => $data['email'], 'ip' => $request->ip(),
            ]);

            return CustomResponse::setSuccessResponse(self::REGISTER_OK_MSG, Response::HTTP_CREATED);
        }

        try {
            $this->registerService->createUserAndSendCode($data);

            return CustomResponse::setSuccessResponse(self::REGISTER_OK_MSG, Response::HTTP_CREATED);
        } catch (\Throwable $e) {
            Log::error('Errore registrazione.', ['error' => $e->getMessage()]);

            return CustomResponse::setFailResponse('Registrazione non completata. Riprova tra qualche minuto.', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Verifica codice 6 cifre, attiva l'account ed effettua login.
     */
    public function verifyCode(VerifyCodeRequest $request)
    {
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return CustomResponse::setFailResponse('Credenziali non corrette.', Response::HTTP_UNAUTHORIZED);
        }
        if ($user->email_verified_at) {
            return CustomResponse::setSuccessResponse('Account già verificato. Puoi accedere.', Response::HTTP_OK);
        }

        $attempts = $this->registerService->attempts($user);
        if ($attempts >= RegisterService::MAX_ATTEMPTS) {
            $this->registerService->invalidateCode($user);

            return CustomResponse::setFailResponse('Troppi tentativi errati. Il codice è stato invalidato. Richiedi un nuovo codice.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        if ($user->verification_code !== $request->code) {
            $this->registerService->recordFailedAttempt($user, $attempts);
            $remaining = max(0, (RegisterService::MAX_ATTEMPTS - 1) - $attempts);

            return CustomResponse::setFailResponse('Codice di verifica non valido. Tentativi rimasti: '.$remaining.'.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->registerService->clearAttempts($user);

        $expiresAt = $user->verification_code_expires_at ? Carbon::parse($user->verification_code_expires_at) : null;
        if ($expiresAt && $expiresAt->isPast()) {
            $this->registerService->regenerateCode($user);

            return CustomResponse::setFailResponse('Codice scaduto. Un nuovo codice di verifica è stato inviato alla tua email.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->registerService->markVerified($user);

        return $this->loginAfterVerification($request, $user);
    }

    /**
     * Reinvia codice di verifica. Risposta generica anti-enumeration se l'email non esiste.
     */
    public function resendVerificationEmail(ResendVerificationEmailRequest $request)
    {
        $user = User::where('email', $request->email)->first();
        if (! $user) {
            return CustomResponse::setSuccessResponse('Se l\'account esiste, abbiamo inviato un nuovo codice.', Response::HTTP_OK);
        }
        if ($user->email_verified_at) {
            return CustomResponse::setFailResponse('Questa email risulta già verificata. Puoi accedere normalmente.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->registerService->regenerateCode($user);

        return CustomResponse::setSuccessResponse('Nuovo codice di verifica inviato alla tua email.', Response::HTTP_OK);
    }

    /**
     * Post-verifica: login, regenerate session, merge guest cart, cookie UI.
     */
    private function loginAfterVerification(Request $request, User $user)
    {
        $remember = (bool) $request->boolean('remember');
        $guestCart = $request->hasSession() ? $request->session()->get('cart', []) : [];

        Auth::login($user, $remember);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        try {
            $this->guestCartMerge->merge($guestCart, $user);
            if ($request->hasSession()) {
                $request->session()->forget('cart');
            }
        } catch (\Exception $e) {
            Log::warning('Guest cart merge failed after verification', ['user_id' => $user->id, 'error' => $e->getMessage()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Account verificato con successo!',
            'user' => $user,
        ])->cookie(AuthUiCookie::issueForUser($user, $remember));
    }
}
