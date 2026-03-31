<?php
/**
 * FILE: ContactController.php
 * SCOPO: Gestisce i messaggi inviati dal modulo "Contattaci" (salvataggio e lettura admin).
 *
 * COSA ENTRA:
 *   - Request con name, surname, email, telephone_number, address, message per store
 *   - ID messaggio nella URL per markAsRead
 *
 * COSA ESCE:
 *   - JSON con messaggio salvato (HTTP 201) per store
 *   - JSON con lista messaggi per index (admin)
 *   - JSON con messaggio aggiornato per markAsRead (admin)
 *
 * CHIAMATO DA:
 *   - routes/api.php — POST /api/contact (pubblico), GET /api/admin/contact-messages (admin)
 *   - routes/api.php — PATCH /api/admin/contact-messages/{id}/read (admin)
 *   - nuxt: pages/contatti.vue, pannello admin
 *
 * EFFETTI COLLATERALI:
 *   - Database: crea record in contact_messages, aggiorna read_at
 *
 * VINCOLI:
 *   - Il messaggio ha un limite di 5000 caratteri
 *   - Il campo read_at e' null finche' l'admin non lo segna come letto
 *
 * ERRORI TIPICI:
 *   - 422: dati di validazione non corretti (nome, email, messaggio obbligatori)
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere campi al form contatti: aggiungerli in validate() di store()
 *   - Per inviare email di notifica all'admin: aggiungere logica dopo create() in store()
 *
 * COLLEGAMENTI:
 *   - app/Models/ContactMessage.php — modello messaggio di contatto
 *   - AdminController.php — dashboard admin con conteggio messaggi non letti
 *   - pages/contatti.vue — pagina frontend del form contatti
 */

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    // Salva un nuovo messaggio di contatto nel database
    // I dati vengono prima controllati (validati) per sicurezza
    public function store(Request $request)
    {
        // Verifichiamo che i dati inviati siano validi
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'surname' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'subject' => 'nullable|string|max:255',
            'telephone_number' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'message' => 'required|string|max:5000',
        ]);

        // Salviamo il messaggio nel database
        $contactMessage = ContactMessage::create($validated);

        return response()->json([
            'message' => 'Messaggio inviato con successo.',
            'data' => $contactMessage,
        ], 201);
    }

    // Salva una richiesta di supporto aperta da un utente autenticato nell'area account
    public function storeSupportTicket(Request $request)
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'required|string|max:5000',
        ]);

        $user = $request->user();

        $contactMessage = ContactMessage::create([
            'name' => $user->name,
            'surname' => $user->surname,
            'email' => $user->email,
            'subject' => $validated['subject'],
            'telephone_number' => $user->telephone_number,
            'address' => $user->address ?? null,
            'message' => $validated['message'],
        ]);

        return response()->json([
            'message' => 'Richiesta di assistenza inviata con successo.',
            'data' => $contactMessage,
        ], 201);
    }

    // Funzione per l'AMMINISTRATORE: mostra tutti i messaggi di contatto ricevuti
    // Ordinati dal piu' recente al piu' vecchio
    public function index(Request $request)
    {
        $messages = ContactMessage::orderByDesc('created_at')->get();

        return response()->json([
            'data' => $messages,
        ]);
    }

    // Funzione per l'AMMINISTRATORE: segna un messaggio come "letto"
    // Salva la data e ora in cui l'admin ha letto il messaggio
    public function markAsRead($id)
    {
        $contactMessage = ContactMessage::findOrFail($id);

        $contactMessage->update([
            'read_at' => now(),
        ]);

        return response()->json([
            'message' => 'Messaggio segnato come letto.',
            'data' => $contactMessage,
        ]);
    }
}
