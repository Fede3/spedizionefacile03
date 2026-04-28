<?php
/**
 * FILE: VerificationController.php
 * SCOPO: Gestisce la verifica dell'indirizzo email tramite link firmato inviato dopo la registrazione.
 *
 * COSA ENTRA:
 *   - ID utente nella URL (route param) per verify
 *
 * COSA ESCE:
 *   - Redirect al frontend con ?status=verified (successo)
 *   - Redirect al frontend con ?status=already_verified (email gia' verificata)
 *
 * CHIAMATO DA:
 *   - routes/web.php — GET /email/verify/{id}/{hash} (link firmato nell'email)
 *   - L'utente clicca il link ricevuto via email dopo la registrazione
 *
 * EFFETTI COLLATERALI:
 *   - Database: aggiorna email_verified_at con timestamp corrente
 *
 * ERRORI TIPICI:
 *   - 404: ID utente non trovato (findOrFail)
 *   - Redirect con status=already_verified se email gia' confermata
 *
 * DOCUMENTI CORRELATI:
 *   - CustomRegisterController.php — registrazione che invia l'email di verifica
 *   - CustomLoginController.php — verifica alternativa tramite codice a 6 cifre
 *   - app/Mail/VerificationEmail.php — template dell'email di verifica
 */

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\User;
use Illuminate\Http\Request;
use App\Utils\CustomResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class VerificationController extends Controller
{
    // Questa funzione viene chiamata quando l'utente clicca sul link di verifica nell'email
    // Il parametro $id e' l'identificativo dell'utente da verificare
    public function verify(Request $request, $id) {
        // La firma del link e' gia' stata controllata automaticamente dal sistema
        // (un controllo di sicurezza che verifica che il link non sia stato modificato)

        // Cerchiamo l'utente nel database usando il suo identificativo
        $user = User::findOrFail($id);

        /* if (!$request->hasValidSignature()) {
            return redirect(config('app.frontend_url') . '/verifica-email?status=invalid_signature');
        } */

        // Controlliamo se l'email e' gia' stata verificata in precedenza
        if ($user->email_verified_at) {
            // Se si', reindirizziamo l'utente alla pagina del sito con un messaggio "gia' verificata"
            return redirect(config('app.frontend_url') . '/verifica-email?status=already_verified');
        }

        // Segniamo l'email come verificata salvando la data e ora attuale
        $user->update([
            'email_verified_at' => now(),
        ]);

        // Reindirizziamo l'utente alla pagina del sito con un messaggio di successo
        return redirect(config('app.frontend_url') . '/verifica-email?status=verified');
    }

}
