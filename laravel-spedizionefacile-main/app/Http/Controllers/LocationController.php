<?php
/**
 * FILE: LocationController.php
 * SCOPO: Gestisce la ricerca delle localita' italiane (citta', CAP, province) per l'autocompletamento indirizzi.
 *
 * COSA ENTRA:
 *   - Request con city per postLocation (salva citta' in sessione)
 *   - Request con q (min 2 caratteri) per search (ricerca per nome o CAP)
 *   - Request con cap (codice postale esatto) per byCap
 *
 * COSA ESCE:
 *   - JSON con postal_code, place_name, province per getLocations (singolo risultato)
 *   - JSON array di {postal_code, place_name, province} per search (max 20 risultati)
 *   - JSON array per byCap (tutte le citta' con quel CAP)
 *
 * CHIAMATO DA:
 *   - routes/api.php — POST /api/post-location, GET /api/get-locations
 *   - routes/api.php — GET /api/locations/search, GET /api/locations/by-cap
 *   - nuxt: components/Homepage/PreventivoRapido.vue, pages/la-tua-spedizione/[step].vue
 *
 * EFFETTI COLLATERALI:
 *   - Sessione: salva city in sessione (postLocation)
 *
 * ERRORI TIPICI:
 *   - Nessun errore HTTP specifico (restituisce array vuoto se nessun risultato)
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/Location.php — modello localita' con postal_code, place_name, province
 *   - SessionController.php — usa la sessione per i dati del preventivo rapido
 */

namespace App\Http\Controllers;

use App\Models\Location;
use Illuminate\Http\Request;
use App\Utils\CustomResponse;
use Illuminate\Support\Facades\Session;
use App\Http\Resources\LocationResource;
use Symfony\Component\HttpFoundation\Response;

class LocationController extends Controller
{
    // Salva la citta' selezionata dall'utente nella sessione
    // La "sessione" e' una memoria temporanea che dura finche' l'utente naviga sul sito
    public function postLocation(Request $request) {

        Session::put('city', $request->city);

        return CustomResponse::setSuccessResponse('Tutto ok', Response::HTTP_OK);
    }

    // Recupera i dati della citta' salvata in sessione
    // Cerca nel database il CAP, il nome della citta' e la provincia corrispondenti
    public function getLocations() {

        $city = Session::get('city');

        $result = Location::where('place_name', $city)
            ->select('postal_code', 'place_name', 'province')
            ->first();

        return response()->json($result);
    }

    /**
     * Cerca localita' per nome della citta' o per codice postale (CAP).
     * L'utente inizia a scrivere e questa funzione restituisce i suggerimenti.
     * Richiede almeno 2 caratteri per iniziare la ricerca (per evitare troppe risposte).
     * Restituisce massimo 20 risultati.
     */
    public function search(Request $request)
    {
        $query = $request->input('q', '');

        // Se l'utente ha scritto meno di 2 caratteri, non cerchiamo nulla
        if (strlen($query) < 2) {
            return response()->json([]);
        }

        // Cerchiamo nel database tutte le citta' o i CAP che contengono il testo cercato
        // Il simbolo "%" prima e dopo il testo significa "qualsiasi cosa prima e dopo"
        $results = Location::where('place_name', 'LIKE', '%' . $query . '%')
            ->orWhere('postal_code', 'LIKE', '%' . $query . '%')
            ->select('postal_code', 'place_name', 'province')
            ->limit(20)
            ->get();

        return response()->json($results);
    }

    /**
     * Cerca localita' per codice postale (CAP) esatto.
     * A differenza della funzione "search", questa cerca una corrispondenza esatta del CAP.
     * Utile quando si conosce gia' il CAP e si vogliono trovare le citta' corrispondenti
     * (un CAP puo' corrispondere a piu' citta').
     */
    public function byCap(Request $request)
    {
        $cap = $request->input('cap', '');

        if (empty($cap)) {
            return response()->json([]);
        }

        // Cerchiamo tutte le localita' con questo CAP esatto
        $results = Location::where('postal_code', $cap)
            ->select('postal_code', 'place_name', 'province')
            ->get();

        return response()->json($results);
    }
}
