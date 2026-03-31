<?php

/**
 * FILE: CustomLoginController.php
 * SCOPO: Gestisce login con email/password, verifica codice 6 cifre e trasferimento carrello ospite.
 *
 * COSA ENTRA:
 *   - Request con email, password, remember per login
 *   - Request con email, code, password per verifyCode
 *   - Request con email per resendVerificationEmail
 *
 * COSA ESCE:
 *   - JSON con dati utente dopo login riuscito
 *   - JSON con requires_verification=true se serve il codice a 6 cifre (HTTP 403)
 *   - CustomResponse success/fail per verifyCode e resendVerificationEmail
 *
 * CHIAMATO DA:
 *   - routes/api.php — POST /api/login, POST /api/verify-code, POST /api/resend-verification
 *   - nuxt: pages/autenticazione.vue (form login e verifica codice)
 *
 * EFFETTI COLLATERALI:
 *   - Sessione: crea sessione autenticata (Auth::login)
 *   - Database: aggiorna email_verified_at, verification_code su users
 *   - Database: trasferisce pacchi dalla sessione (cart) a packages + cart_user
 *   - Email: invia codice di verifica a 6 cifre (SendVerificationEmailJob)
 *
 * VINCOLI:
 *   - Il codice di verifica dura 30 minuti (verification_code_expires_at)
 *   - La sessione viene rigenerata dopo il login (prevenzione session fixation)
 *   - hasSession() e' necessario perche' con tunnel Cloudflare la sessione potrebbe non esserci
 *   - Il trasferimento carrello ospite NON blocca il login se fallisce
 *   - Il campo "role" NON e' tra i $fillable del modello User (sicurezza)
 *
 * ERRORI TIPICI:
 *   - 422: credenziali non corrette (ValidationException)
 *   - 403: account non verificato (richiede inserimento codice)
 *   - 422: codice di verifica errato o scaduto (durata 30 minuti)
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per cambiare la durata del codice: modificare "addMinutes(30)" nelle varie funzioni
 *   - Per cambiare la lunghezza del codice: modificare il blocco random_int e 'size:6'
 *   - Per disabilitare il trasferimento carrello: rimuovere il blocco try/catch dopo Auth::login()
 *
 * COLLEGAMENTI:
 *   - CustomRegisterController.php — registrazione nuovi utenti
 *   - GoogleController.php — login con Google OAuth
 *   - GuestCartController.php — carrello ospite (sessione) trasferito dopo login
 *   - pages/autenticazione.vue — pagina frontend login/registrazione
 */

namespace App\Http\Controllers;

use App\Jobs\SendVerificationEmailJob;
use App\Models\Package;
use App\Models\PackageAddress;
use App\Models\Service;
use App\Models\User;
use App\Support\AuthUiCookie;
use App\Utils\CustomResponse;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class CustomLoginController extends Controller
{
    private function resolveUserFromEmail(string $email): ?User
    {
        $normalized = trim(mb_strtolower($email));
        $user = User::where('email', $normalized)->first();

        if ($user) {
            return $user;
        }

        $candidate = preg_replace('/@spedizionefacile\.it$/i', '@spediamofacile.it', $normalized);

        if (! $candidate || $candidate === $normalized) {
            return null;
        }

        return User::where('email', $candidate)->first();
    }

    /**
     * login — Verifica credenziali, gestisce verifica email e trasferisce carrello ospite.
     *
     * PERCHE': Oltre al login standard, gestisce la verifica email a 6 cifre e il trasferimento
     *   dei pacchi dal carrello sessione (ospite) al carrello database (utente autenticato).
     * COME LEGGERLO: 1) Valida credenziali  2) Se email non verificata: genera/invia codice, return 403
     *   3) Auth::login  4) Rigenera sessione  5) Trasferisce pacchi da sessione a DB
     * COME MODIFICARLO: Per aggiungere controlli post-login, inserirli dopo Auth::login().
     * COSA EVITARE: Non rimuovere session()->regenerate() — previene session fixation.
     */
    public function login(Request $request)
    {
        // Controlliamo che email e password siano stati inseriti
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'remember' => 'boolean',
        ]);

        // Cerchiamo l'utente nel database per email
        $user = $this->resolveUserFromEmail((string) $request->email);

        // Verifichiamo che l'utente esista e che la password sia corretta
        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Le credenziali non sono corrette.'],
                'password' => ['Le credenziali non sono corrette.'],
            ]);
        }

        // Se l'account non ha ancora l'email verificata, richiediamo il codice di verifica
        if (! $user->email_verified_at) {
            $verificationExpiresAt = $user->verification_code_expires_at
                ? Carbon::parse($user->verification_code_expires_at)
                : null;

            // Se il codice e' scaduto o non esiste, ne generiamo uno nuovo e lo inviamo via email
            if (! $user->verification_code || ($verificationExpiresAt && $verificationExpiresAt->isPast())) {
                $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
                $user->update([
                    'verification_code' => $code,
                    'verification_code_expires_at' => now()->addMinutes(30),
                ]);

                // Inviamo l'email con il nuovo codice
                try {
                    SendVerificationEmailJob::dispatchSync($user);
                } catch (\Throwable $e) {
                    Log::warning('Invio email codice verifica fallito durante login.', [
                        'email' => $user->email,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Rispondiamo dicendo che serve la verifica (il frontend mostrera' il modulo per il codice)
            return response()->json([
                'success' => false,
                'requires_verification' => true,
                'message' => 'Account non verificato. Inserisci il codice di verifica a 6 cifre inviato alla tua email.',
            ], 403);
        }

        // Se le credenziali sono corrette e l'email e' verificata, facciamo il login
        // Il parametro "remember" permette di rimanere collegati anche dopo aver chiuso il browser
        Auth::login($user, (bool) $request->remember);

        // Rigeneriamo l'ID della sessione per prevenire attacchi di session fixation
        // e garantire che il cookie di sessione sia aggiornato per le richieste successive.
        // hasSession() controlla se la sessione e' disponibile (potrebbe non esserlo
        // quando la richiesta arriva da un dominio non riconosciuto come "stateful" da Sanctum,
        // ad esempio tramite tunnel Cloudflare con dominio dinamico).
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        // Trasferiamo i pacchi dal carrello ospite (sessione) al carrello utente (database)
        // Questo permette all'utente di non perdere i pacchi aggiunti prima di fare il login
        try {
            if ($request->hasSession()) {
                $packages = session()->get('cart', []);
                if (! empty($packages)) {
                    // Creiamo i pacchi nel database
                    $dbPackages = $this->createPackage($packages);
                    // Li colleghiamo al carrello dell'utente
                    foreach ($dbPackages as $package) {
                        DB::table('cart_user')->insert([
                            'user_id' => $user->id,
                            'package_id' => $package->id,
                            'created_at' => now(),
                        ]);
                    }
                    // Svuotiamo il carrello della sessione perche' ora i dati sono nel database
                    session()->forget('cart');
                }
            }
        } catch (\Exception $e) {
            // Se il trasferimento del carrello fallisce, non blocchiamo il login
            // (il carrello non e' critico, l'importante e' che l'utente entri)
        }

        return response()->json($user)->cookie(AuthUiCookie::issueForUser($user, (bool) $request->boolean('remember')));
    }

    /**
     * Verifica il codice a 6 cifre e attiva l'account.
     * Questa funzione viene chiamata quando l'utente inserisce il codice ricevuto via email.
     */
    public function verifyCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6',
            'password' => 'required',
            'remember' => 'nullable|boolean',
        ]);

        // Verifichiamo nuovamente le credenziali (per sicurezza)
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return CustomResponse::setFailResponse('Credenziali non corrette.', Response::HTTP_UNAUTHORIZED);
        }

        // Se l'account e' gia' verificato, non serve fare nulla
        if ($user->email_verified_at) {
            return CustomResponse::setSuccessResponse('Account già verificato. Puoi accedere.', Response::HTTP_OK);
        }

        // Controlliamo che il codice inserito sia quello giusto
        if ($user->verification_code !== $request->code) {
            return CustomResponse::setFailResponse('Codice di verifica non valido.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Controlliamo che il codice non sia scaduto (dura 30 minuti)
        $verificationExpiresAt = $user->verification_code_expires_at
            ? Carbon::parse($user->verification_code_expires_at)
            : null;

        if ($verificationExpiresAt && $verificationExpiresAt->isPast()) {
            // Se il codice e' scaduto, ne generiamo uno nuovo e lo inviamo via email
            $newCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $user->update([
                'verification_code' => $newCode,
                'verification_code_expires_at' => now()->addMinutes(30),
            ]);

            try {
                SendVerificationEmailJob::dispatchSync($user);
            } catch (\Throwable $e) {
                Log::warning('Invio email nuovo codice fallito.', ['email' => $user->email, 'error' => $e->getMessage()]);
            }

            return CustomResponse::setFailResponse('Codice scaduto. Un nuovo codice di verifica è stato inviato alla tua email.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Tutto ok: verifichiamo l'account e cancelliamo il codice
        $user->update([
            'email_verified_at' => now(),
            'verification_code' => null,
            'verification_code_expires_at' => null,
        ]);

        // Facciamo il login automatico
        Auth::login($user, (bool) $request->boolean('remember'));

        // Rigeneriamo l'ID della sessione per prevenire attacchi di session fixation.
        // Controlliamo che la sessione sia disponibile (vedi commento nel metodo login()).
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json([
            'success' => true,
            'message' => 'Account verificato con successo!',
            'user' => $user,
        ])->cookie(AuthUiCookie::issueForUser($user, (bool) $request->boolean('remember')));
    }

    public function confirmPassword(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        $user = $request->user();

        if (! $user?->isAdmin()) {
            abort(Response::HTTP_FORBIDDEN, 'Solo un amministratore può confermare l’accesso fuori flusso.');
        }

        if (! $user || ! Hash::check((string) $request->password, (string) $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['La password inserita non è corretta.'],
            ]);
        }

        if ($request->hasSession()) {
            $request->session()->put('auth.password_confirmed_at', now()->timestamp);
        }

        return response()->json([
            'success' => true,
            'confirmed_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Reinvia il codice di verifica via email.
     * Usato quando l'utente non ha ricevuto il codice o quando e' scaduto.
     */
    public function resendVerificationEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        // Per sicurezza, non riveliamo se l'email esiste o meno nel database
        if (! $user) {
            return CustomResponse::setSuccessResponse('Se l\'account esiste, abbiamo inviato un nuovo codice.', Response::HTTP_OK);
        }

        if ($user->email_verified_at) {
            return CustomResponse::setFailResponse('Questa email risulta già verificata. Puoi accedere normalmente.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Generiamo un nuovo codice a 6 cifre con scadenza di 30 minuti
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->update([
            'verification_code' => $code,
            'verification_code_expires_at' => now()->addMinutes(30),
        ]);

        // Inviamo l'email con il nuovo codice
        try {
            SendVerificationEmailJob::dispatchSync($user);
        } catch (\Throwable $e) {
            Log::warning('Invio email fallito.', ['email' => $user->email, 'error' => $e->getMessage()]);
        }

        return CustomResponse::setSuccessResponse('Nuovo codice di verifica inviato alla tua email.', Response::HTTP_OK);
    }

    // Funzione di supporto: crea i pacchi nel database a partire dai dati del carrello sessione
    // Usata durante il login per trasferire i pacchi dal carrello ospite al database
    public function createPackage($packages)
    {
        $createdPackages = [];

        // Per ogni pacco nel carrello sessione, creiamo i record necessari nel database
        foreach ($packages as $package) {
            // Creiamo l'indirizzo di partenza
            $origin = PackageAddress::create($package['origin_address']);
            // Creiamo l'indirizzo di destinazione
            $destination = PackageAddress::create($package['destination_address']);
            // Creiamo i servizi aggiuntivi
            $services = Service::create($package['services']);

            // Creiamo il pacco vero e proprio collegandolo a indirizzi, servizi e utente
            $createdPackages[] = Package::create([
                'package_type' => $package['package_type'],
                'quantity' => $package['quantity'],
                'weight' => $package['weight'],
                'first_size' => $package['first_size'],
                'second_size' => $package['second_size'],
                'third_size' => $package['third_size'],
                'weight_price' => $package['weight_price'] ?? null,
                'volume_price' => $package['volume_price'] ?? null,
                'single_price' => $package['single_price'] ?? null,
                'origin_address_id' => $origin->id,
                'destination_address_id' => $destination->id,
                'service_id' => $services->id,
                'user_id' => auth()->id(),
            ]);
        }

        return $createdPackages;
    }
}
