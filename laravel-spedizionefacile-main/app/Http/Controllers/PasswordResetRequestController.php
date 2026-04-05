<?php
/**
 * FILE: PasswordResetRequestController.php
 * SCOPO: Gestisce la prima fase del recupero password (invio email con token di reset).
 *
 * COSA ENTRA:
 *   - Request con email per sendEmail
 *
 * COSA ESCE:
 *   - JSON con success e message generico per sendEmail (HTTP 200)
 *   - La risposta resta uguale anche se email non esiste (anti-enumerazione)
 *
 * CHIAMATO DA:
 *   - routes/api.php — POST /api/reset-password
 *   - nuxt: pages/recupera-password.vue
 *
 * EFFETTI COLLATERALI:
 *   - Database: crea/aggiorna record in password_reset_tokens (email, token hashato, created_at)
 *   - Email: invia ResetPasswordEmail con token in chiaro e email all'utente
 *
 * VINCOLI:
 *   - Il token viene salvato nel DB hashato con Hash::make (per sicurezza)
 *   - Il token in chiaro viene inviato via email all'utente (64 caratteri, Str::random)
 *   - Se l'utente richiede un nuovo reset, il vecchio token viene sovrascritto
 *   - Non riveliamo se l'email esiste o meno nella risposta di errore (anti-enumerazione)
 *     Nota: attualmente restituisce 404 se non trovata — valutare se cambiare per sicurezza
 *
 * ERRORI TIPICI:
 *   - L'invio email puo' fallire se il server SMTP non e' configurato
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per cambiare la lunghezza del token: modificare Str::random(64) in createToken()
 *   - Per cambiare il template email: modificare app/Mail/ResetPasswordEmail.php
 *
 * COLLEGAMENTI:
 *   - ChangePasswordController.php — seconda fase: verifica token e cambia la password
 *   - app/Mail/ResetPasswordEmail.php — template dell'email con link di reset
 *   - pages/recupera-password.vue — pagina frontend di recupero password
 */

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\User;
use App\Mail\ResetPasswordEmail;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\Response;
class PasswordResetRequestController extends Controller
{
    // Funzione principale che riceve l'email dell'utente e avvia il processo di recupero password
    public function sendEmail(Request $request) {
        // Verifichiamo che l'email sia stata inserita e che sia un formato valido
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        // Anti-enumerazione: rispondiamo sempre allo stesso modo, ma inviamo
        // l'email solo se l'account esiste davvero.
        if ($this->validateEmail($request->email)) {
            $this->send($request->email);
        }

        return $this->successResponse();
    }

    // Genera il token e invia l'email di recupero password all'utente
    public function send($email) {
        // Creiamo un codice segreto (token) per questo reset
        $token = $this->createToken($email);

        // Inviamo l'email con il token all'utente
        Mail::to($email)->send(new ResetPasswordEmail($token, $email));
    }

    // Crea un nuovo token segreto per il reset della password
    // Se l'utente aveva gia' richiesto un reset prima, aggiorna il token esistente
    public function createToken($email) {
        // Controlliamo se esiste gia' un token per questa email
        $oldToken = DB::table('password_reset_tokens')->where('email', $email)->first();

        // Generiamo un codice casuale di 64 caratteri
        $token = Str::random(64);
        // Lo criptiamo prima di salvarlo nel database (per sicurezza)
        $hashedToken = Hash::make($token);

        if ($oldToken) {
            // Se c'era gia' un token, lo aggiorniamo con il nuovo
            $this->updateToken($hashedToken, $email);
        }
        else {
            // Se non c'era, ne creiamo uno nuovo
            $this->saveToken($hashedToken, $email);
        }

        // Restituiamo il token in chiaro (verra' inserito nel link dell'email)
        return $token;
    }


    // Salva un nuovo token nel database
    public function saveToken($token, $email) {
        DB::table('password_reset_tokens')->insert([
            'email' => $email,
            'token' => $token,
            'created_at' => Carbon::now()
        ]);
    }

    // Aggiorna un token esistente nel database con uno nuovo
    public function updateToken($token, $email) {
        DB::table('password_reset_tokens')
                ->where('email', $email)
                ->update([
                    'token' => $token,
                    'created_at' => Carbon::now()
                ]);
    }


    // Controlla se un'email e' registrata nel database degli utenti
    // Restituisce vero (true) se l'email esiste, falso (false) se non esiste
    public function validateEmail($email) {
        return User::where('email', $email)->exists();
    }

    // Risposta di successo quando l'email di recupero e' stata inviata correttamente
    // NOTA: la risposta e' volutamente generica per non rivelare se l'email esiste.
    public function successResponse() {
        return response()->json([
            'success' => true,
            'message' => 'Ti è stata inviata un\'email per il recupero della password. Controlla la tua casella di posta.',
        ], Response::HTTP_OK);
    }
}
