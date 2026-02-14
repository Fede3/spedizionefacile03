<?php
/**
 * FILE: GoogleController.php
 * SCOPO: Gestisce login/registrazione tramite Google OAuth (Socialite).
 *
 * COSA ENTRA:
 *   - Query param "frontend" e "redirect" per redirectToGoogle (URL di ritorno)
 *   - Callback da Google con token OAuth in handleGoogleCallback
 *
 * COSA ESCE:
 *   - Redirect a Google per autenticazione (redirectToGoogle)
 *   - Redirect al frontend con sessione autenticata (handleGoogleCallback)
 *   - Redirect con ?error=google_failed se l'autenticazione fallisce
 *
 * CHIAMATO DA:
 *   - routes/web.php — GET /auth/google (redirect a Google)
 *   - routes/web.php — GET /auth/google/callback (callback da Google)
 *   - nuxt: pages/autenticazione.vue (bottone "Accedi con Google")
 *
 * EFFETTI COLLATERALI:
 *   - Rete: chiamate OAuth a Google tramite Socialite
 *   - Database: crea utente se non esiste (ruolo "User", password casuale, email verificata)
 *   - Sessione: crea sessione autenticata (Auth::login)
 *   - Cookie: salva frontend_redirect e frontend_redirect_path (durata 15 min)
 *
 * ERRORI TIPICI:
 *   - Redirect con error=google_failed se Google restituisce errore
 *   - L'utente gia' registrato con email viene collegato automaticamente
 *
 * DOCUMENTI CORRELATI:
 *   - config/services.php — google.client_id, google.client_secret, google.redirect
 *   - CustomLoginController.php — login alternativo con email/password
 */

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
class GoogleController extends Controller
{
    // Reindirizza l'utente alla pagina di accesso di Google
    // L'utente scegliera' quale account Google usare
    public function redirectToGoogle(Request $request)
    {
        // Recuperiamo l'URL del frontend (il sito che l'utente sta usando)
        // per sapere dove rimandarlo dopo l'accesso
        $frontend = trim((string) $request->query('frontend', ''));
        $fallbackFrontend = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        // Se l'URL del frontend non e' valido, usiamo quello predefinito
        if (!filter_var($frontend, FILTER_VALIDATE_URL)) {
            $frontend = $fallbackFrontend;
        }

        // Prepariamo il reindirizzamento verso Google
        $redirectUri = config('services.google.redirect');
        $response = Socialite::driver('google')
            ->stateless()
            ->redirectUrl($redirectUri)
            ->with(['prompt' => 'select_account consent']) // Chiede sempre di scegliere l'account
            ->redirect();

        // Salviamo l'URL del frontend e la pagina di redirect in cookie
        // per ricordare dove rimandare l'utente dopo che Google risponde
        $redirectPath = trim((string) $request->query('redirect', '/'));
        // Accettiamo solo percorsi relativi (iniziano con /) per sicurezza
        if (!str_starts_with($redirectPath, '/')) {
            $redirectPath = '/';
        }

        return $response
            ->withCookie(cookie('frontend_redirect', $frontend, 15, '/', null, false, false))
            ->withCookie(cookie('frontend_redirect_path', $redirectPath, 15, '/', null, false, false));
    }

    // Questa funzione viene chiamata quando Google rimanda l'utente al nostro sito
    // Riceve i dati dell'utente da Google e gestisce la registrazione/accesso
    public function handleGoogleCallback(Request $request)
    {
        // Recuperiamo l'URL del frontend dal cookie salvato prima
        $frontendUrl = rtrim((string) ($request->cookie('frontend_redirect') ?: config('app.frontend_url', config('app.url'))), '/');

        try {
            // Chiediamo a Google i dati dell'utente che ha fatto l'accesso
            $redirectUri = config('services.google.redirect');
            $googleUser = Socialite::driver('google')
                ->stateless()
                ->redirectUrl($redirectUri)
                ->user();
        } catch (\Exception $e) {
            // Se qualcosa va storto con Google, rimandiamo l'utente alla pagina di login con un errore
            return redirect($frontendUrl . '/autenticazione?error=google_failed')
                ->withoutCookie('frontend_redirect')
                ->withoutCookie('frontend_redirect_path');
        }

        // Cerchiamo se esiste gia' un utente con questa email nel nostro database
        $user = User::where('email', $googleUser->email)->first();

        if (!$user) {
            // Se l'utente non esiste, lo creiamo con i dati di Google
            $user = new User([
                'email' => $googleUser->email,
                'name' => $googleUser->user['given_name'] ?? $googleUser->getName(),
                'surname' => $googleUser->user['family_name'] ?? '',
                'telephone_number' => '0',
                'email_verified_at' => now(), // L'email e' automaticamente verificata (Google l'ha gia' controllata)
                'password' => Str::random(16), // Password casuale (l'utente usa Google per accedere)
            ]);
            // Il ruolo va impostato esplicitamente perche' non e' tra i campi $fillable
            // (per sicurezza: nessuno puo' auto-assegnarsi un ruolo tramite richiesta HTTP)
            $user->role = 'User';
            $user->save();
        }

        // Assicuriamoci che l'email sia segnata come verificata anche per utenti gia' esistenti
        if (!$user->email_verified_at) {
            $user->email_verified_at = now();
            $user->save();
        }

        // Facciamo il login automatico dell'utente nel sistema
        Auth::login($user);

        // Recuperiamo il percorso di redirect salvato nel cookie (default: homepage)
        $redirectPath = trim((string) ($request->cookie('frontend_redirect_path') ?: '/'));
        if (!str_starts_with($redirectPath, '/')) {
            $redirectPath = '/';
        }

        // Reindirizziamo l'utente alla pagina dove si trovava prima del login
        return redirect($frontendUrl . $redirectPath)
            ->withoutCookie('frontend_redirect')
            ->withoutCookie('frontend_redirect_path');
    }
}
