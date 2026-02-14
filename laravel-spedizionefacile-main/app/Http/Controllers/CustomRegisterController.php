<?php
/**
 * FILE: CustomRegisterController.php
 * SCOPO: Gestisce la registrazione di nuovi utenti con verifica email via codice a 6 cifre.
 *
 * COSA ENTRA:
 *   - RegisterRequest con name, surname, email, password, telephone_number, prefix, referred_by
 *
 * COSA ESCE:
 *   - CustomResponse success (HTTP 201) con messaggio di inserire il codice di verifica
 *   - CustomResponse fail (HTTP 500) se la registrazione fallisce
 *
 * CHIAMATO DA:
 *   - routes/api.php — POST /api/register
 *   - nuxt: pages/autenticazione.vue (tab registrazione)
 *
 * EFFETTI COLLATERALI:
 *   - Database: crea record in users con ruolo "User", verification_code, scadenza 30 min
 *   - Email: invia codice di verifica a 6 cifre (SendVerificationEmailJob)
 *   - Referral: se referred_by presente, valida il codice e lo salva nel profilo utente
 *
 * ERRORI TIPICI:
 *   - 422: email gia' registrata, password troppo corta (RegisterRequest)
 *   - 500: errore generico di registrazione (rollback transazione DB)
 *   - L'invio email puo' fallire senza bloccare la registrazione (warning nel log)
 *
 * DOCUMENTI CORRELATI:
 *   - CustomLoginController.php — login e verifica codice dopo registrazione
 *   - app/Http/Requests/RegisterRequest.php — regole di validazione registrazione
 */

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
    // Registra un nuovo utente nel sistema
    public function register(RegisterRequest $request)
    {
        // Prendiamo i dati validati dal modulo di registrazione
        $data = $request->validated();

        // Uniamo il prefisso telefonico al numero di telefono (es. "+39 3331234567")
        $data['telephone_number'] = $data['prefix'] . ' ' . $data['telephone_number'];
        unset($data['prefix']); // Rimuoviamo il prefisso separato perche' ora e' nel numero

        // Se l'utente si e' registrato tramite un link referral, verifichiamo il codice
        if (!empty($data['referred_by'])) {
            $referralCode = strtoupper($data['referred_by']);
            // Controlliamo che il codice appartenga a un Partner Pro valido
            $proUser = User::where('referral_code', $referralCode)
                ->where('role', 'Partner Pro')
                ->first();
            // Se il codice e' valido lo salviamo, altrimenti lo ignoriamo
            $data['referred_by'] = $proUser ? $referralCode : null;
        }

        try {
            // Usiamo una "transazione" del database: se qualcosa va storto,
            // tutto viene annullato (l'utente NON viene creato a meta')
            DB::beginTransaction();

            // Generiamo un codice di verifica casuale a 6 cifre (es. "042891")
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            // Per sicurezza, forziamo il ruolo a "User" (non permettiamo di sceglierlo)
            unset($data['role']);
            // Rimuoviamo campi di conferma che non sono colonne nel database
            unset($data['email_confirmation']);
            unset($data['password_confirmation']);

            // Creiamo l'utente nel database
            $user = new User($data);
            $user->role = 'User'; // Il ruolo e' sempre "User" per i nuovi registrati
            $user->verification_code = $code;
            $user->verification_code_expires_at = now()->addMinutes(30); // Il codice scade dopo 30 minuti
            $user->save();

            // Proviamo a inviare l'email con il codice di verifica
            // Se l'invio fallisce, non blocchiamo la registrazione
            try {
                SendVerificationEmailJob::dispatchSync($user);
            } catch (\Throwable $mailException) {
                Log::warning('Email di verifica non inviata.', [
                    'email' => $user->email,
                    'error' => $mailException->getMessage(),
                ]);
            }

            // Confermiamo la transazione: tutto e' andato bene, salviamo tutto nel database
            DB::commit();

            return CustomResponse::setSuccessResponse(
                'Registrazione completata! Inserisci il codice di verifica a 6 cifre inviato alla tua email.',
                Response::HTTP_CREATED
            );
        } catch (\Throwable $exception) {
            // Se qualcosa va storto, annulliamo tutto (rollback)
            DB::rollBack();

            Log::error('Errore registrazione.', [
                'email' => $request->email,
                'error' => $exception->getMessage(),
            ]);

            return CustomResponse::setFailResponse('Registrazione non completata. Riprova tra qualche minuto.', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
