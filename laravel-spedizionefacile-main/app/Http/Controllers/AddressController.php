<?php
/**
 * FILE: AddressController.php
 * SCOPO: Controller segnaposto per indirizzi generici (tutte le funzioni restituiscono risposte vuote).
 *
 * COSA ENTRA:
 *   - Request standard per store/update
 *   - ID nella URL per show/update/destroy
 *
 * COSA ESCE:
 *   - JSON vuoto con codici HTTP appropriati (200, 201, 204, 404)
 *
 * CHIAMATO DA:
 *   - Attualmente non utilizzato attivamente nelle route
 *
 * EFFETTI COLLATERALI:
 *   - Nessuno (tutte le funzioni sono segnaposto)
 *
 * ERRORI TIPICI:
 *   - Nessuno
 *
 * DOCUMENTI CORRELATI:
 *   - UserAddressController.php — gestione reale degli indirizzi utente
 *   - BillingAddressController.php — gestione indirizzi di fatturazione
 */

namespace App\Http\Controllers;

use Illuminate\Http\Request;
class AddressController extends Controller
{
    // Restituisce la lista di tutti gli indirizzi (al momento ritorna una lista vuota)
    public function index()
    {
        return response()->json([]);
    }

    // Salva un nuovo indirizzo (al momento non fa nulla, ritorna solo una risposta vuota con codice 201 = "creato")
    public function store(Request $request)
    {
        return response()->json([], 201);
    }

    // Mostra un singolo indirizzo cercandolo per il suo identificativo
    // Al momento ritorna sempre "non trovato" (codice 404)
    public function show($id)
    {
        return response()->json(null, 404);
    }

    // Aggiorna un indirizzo esistente (al momento non fa nulla)
    public function update(Request $request, $id)
    {
        return response()->json([], 200);
    }

    // Elimina un indirizzo (al momento non fa nulla, ritorna codice 204 = "eliminato senza contenuto")
    public function destroy($id)
    {
        return response()->json([], 204);
    }
}
