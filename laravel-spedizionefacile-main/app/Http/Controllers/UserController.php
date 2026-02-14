<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
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
            $rules['password'] = 'string|min:8|confirmed';
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
