<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Utils\CustomResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * CONTROLLER UTENTE
 *
 * Questo controller gestisce le operazioni legate al profilo dell'utente.
 * Permette di: modificare i propri dati personali (nome, email, telefono, password),
 * caricare immagini (usate dall'amministratore), e recuperare l'immagine caricata.
 */
class UserController extends Controller
{
    // Questa funzione permette all'utente di aggiornare i propri dati personali
    // Controlla che l'utente stia modificando SOLO il proprio profilo (non quello di un altro)
    public function update(Request $request, User $user)
    {

        // Controllo di sicurezza: solo l'utente stesso puo' modificare i propri dati
        if ($user->id !== auth()->user()->id) {
            abort(403, 'Non sei autorizzato a modificare questo utente.');
        }

        // Prepariamo le regole di validazione solo per i campi che l'utente vuole modificare
        // Questo approccio permette di aggiornare anche solo un campo alla volta
        $rules = [];

        // Se l'utente vuole cambiare il nome, verifichiamo che sia una stringa valida
        if ($request->name) {
            $rules['name'] = 'nullable|string';
        }

        // Se l'utente vuole cambiare l'email, verifichiamo che sia un'email valida
        // e che non sia gia' usata da un altro utente (unique)
        if ($request->email) {
            $rules['email'] = 'required|string|email|unique:users,email,' . $user->id;
        }

        // Se l'utente vuole cambiare il numero di telefono (e il nuovo e' diverso dal vecchio)
        if ($request->telephone_number && $request->telephone_number !== $user->telephone_number) {
            $rules['telephone_number'] = 'nullable|string';
        }

        // Se l'utente vuole cambiare la password, deve essere lunga almeno 8 caratteri
        // e deve essere confermata (cioe' scritta due volte uguale)
        if ($request->password) {
            $rules['password'] = [
                'string',
                'min:8',
                'confirmed',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
                'regex:/[^a-zA-Z0-9\s]/',
            ];
        }

        // Controlliamo che i dati inviati rispettino le regole che abbiamo definito sopra
        $validated = $request->validate($rules);

        // Se la password e' stata cambiata, la criptiamo prima di salvarla
        // (le password non si salvano MAI in chiaro nel database per motivi di sicurezza)
        if (!empty($validated['password'])) {
            $validated['password'] = bcrypt($validated['password']);
        }

        // Aggiorniamo i dati dell'utente nel database
        $user->update($validated);

        return CustomResponse::setSuccessResponse('Modifica effettuata con successo', Response::HTTP_OK);

    }

    /**
     * Elimina l'account dell'utente autenticato (GDPR Art. 17 — Diritto all'oblio).
     *
     * COSA FA:
     *   1. Verifica che l'utente stia cancellando il PROPRIO account (non quello di un altro)
     *   2. Anonimizza gli ordini (non li cancella: servono per la contabilita' e gli obblighi fiscali)
     *   3. Revoca tutti i token Sanctum (logout da tutti i dispositivi)
     *   4. Cancella i dati personali dell'utente (GDPR soft delete)
     *   5. Invia email di conferma all'indirizzo registrato
     *
     * PERCHE' NON CANCELLIAMO GLI ORDINI:
     *   Gli ordini contengono dati fiscali (importi, date, riferimenti BRT) necessari per
     *   legge (D.P.R. 633/72 — IVA: conservazione 10 anni). Li anonimizziamo invece di eliminarli.
     */
    public function destroy(Request $request, User $user)
    {
        // Controllo di sicurezza: solo l'utente stesso puo' cancellare il proprio account
        if ($user->id !== auth()->user()->id) {
            abort(403, 'Non sei autorizzato a eliminare questo account.');
        }

        $userEmail = $user->email;
        $userName  = $user->name;

        DB::transaction(function () use ($user) {
            // 1. Anonimizza gli ordini collegati all'utente.
            //    Scolleghiamo l'user_id invece di cancellare l'ordine per preservare
            //    i dati contabili/fiscali richiesti dalla legge italiana.
            Order::query()
                ->where('user_id', $user->id)
                ->update(['user_id' => null]);

            // 2. Revoca tutti i token Sanctum (logout da tutti i dispositivi)
            $user->tokens()->delete();

            // 3. Cancella i dati personali dell'utente.
            //    Sovrascriviamo i campi con valori anonimi prima del soft delete,
            //    cosi' i dati non sono recuperabili nemmeno dalla tabella deleted.
            $anonymizedId = 'deleted_' . $user->id;
            $user->update([
                'name'                       => 'Utente eliminato',
                'surname'                    => '',
                'email'                      => $anonymizedId . '@eliminato.local',
                'telephone_number'           => null,
                'password'                   => bcrypt(\Illuminate\Support\Str::random(64)),
                'verification_code'          => null,
                'verification_code_expires_at' => null,
                'google_id'                  => null,
                'facebook_id'                => null,
                'apple_id'                   => null,
                'avatar'                     => null,
                'customer_id'                => null,
                'stripe_account_id'          => null,
                'referral_code'              => null,
                'referred_by'                => null,
            ]);

            // 4. Soft delete dell'utente (segna come eliminato nel DB)
            $user->delete();
        });

        // 5. Invia email di conferma all'indirizzo originale (fuori dalla transazione)
        try {
            Mail::raw(
                "Gentile {$userName},\n\n" .
                "Il tuo account SpedizioneFacile e' stato eliminato con successo.\n" .
                "I tuoi dati personali sono stati rimossi dai nostri sistemi.\n\n" .
                "Se non hai richiesto tu questa eliminazione, contatta immediatamente " .
                "il nostro supporto all'indirizzo info@spedizionefacile.it\n\n" .
                "SpedizioneFacile",
                function ($message) use ($userEmail, $userName) {
                    $message->to($userEmail, $userName)
                            ->subject('Account eliminato — SpedizioneFacile');
                }
            );
        } catch (\Exception $e) {
            // L'email di conferma e' best-effort: non blocchiamo l'eliminazione se fallisce
            Log::warning('Account deletion confirmation email failed', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);
        }

        Log::info('User account deleted (GDPR Art. 17)', ['user_id' => $user->id]);

        return response()->json([
            'success' => true,
            'message' => 'Account eliminato con successo. Riceverai una email di conferma.',
        ]);
    }

    // Questa funzione permette di caricare un'immagine (usata per l'immagine dell'admin)
    // Accetta solo file immagine (jpg, jpeg, png, webp) con dimensione massima 2MB
    public function uploadFile(Request $request)  {
        // Verifichiamo che il file sia un'immagine valida e non troppo grande
        $request->validate([
            'admin_image' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048'
        ]);

        // Controlliamo che il file sia stato effettivamente inviato nella richiesta
        if ($request->hasFile('admin_image')) {

            // Generiamo un nome unico per il file (per evitare che due file abbiano lo stesso nome)
            $fileName = uniqid() . '.' . $request->file('admin_image')->extension();

            // Salviamo il file nella cartella "attach" del disco pubblico
            // (accessibile da chiunque visiti il sito)
            $path = $request->file('admin_image')->storeAs('attach', $fileName, 'public');

            return response()->json([
                'success' => true,
                'message' => 'File caricato con successo',
                'admin_image' => $path
            ]);
        }

        // Se arriviamo qui, significa che non c'era nessun file nella richiesta
        return response()->json([
            'success' => false,
            'message' => 'Nessun file trovato'
        ], 400);
    }

    // Questa funzione recupera l'ultima immagine caricata dall'admin
    // Cerca nella cartella "attach" e restituisce l'URL dell'ultimo file trovato
    public function getAdminImage() {
        // Prima controlla se l'admin ha impostato un'immagine dalle impostazioni
        $settingUrl = \App\Models\Setting::get('homepage_image_url', '');
        if ($settingUrl) {
            return response()->json(['image_url' => $settingUrl]);
        }

        // Fallback: leggiamo tutti i file presenti nella cartella "attach"
        $files = Storage::disk('public')->files('attach');

        // Se non ci sono file, restituiamo una stringa vuota
        if (empty($files)) {
            return response()->json(['image_url' => '']);
        }

        // Prendiamo l'ultimo file caricato dalla lista
        $lastFile = collect($files)->last();

        // Costruiamo l'indirizzo web (URL) per accedere all'immagine
        $url = asset('storage/' . $lastFile);

        return response()->json(['image_url' => $url]);
    }


}
