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
 * VINCOLI:
 *   - La ricerca richiede almeno 2 caratteri per evitare risposte troppo grandi
 *   - Massimo 20 risultati per ricerca (LIMIT 20)
 *   - La tabella locations contiene tutti i CAP e le citta' italiane
 *   - Un CAP puo' corrispondere a piu' citta' (es. 00100 -> Roma, Citta' del Vaticano)
 *
 * ERRORI TIPICI:
 *   - Nessun errore HTTP specifico (restituisce array vuoto se nessun risultato)
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per cambiare il minimo caratteri: modificare "strlen($query) < 2" in search()
 *   - Per cambiare il limite risultati: modificare "limit(20)" in search()
 *
 * COLLEGAMENTI:
 *   - app/Models/Location.php — modello localita' con postal_code, place_name, province
 *   - SessionController.php — usa la sessione per i dati del preventivo rapido
 *   - components/Homepage/PreventivoRapido.vue — autocompletamento citta'
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
        $query = trim((string) $request->input('q', ''));
        $limit = (int) $request->input('limit', 120);
        $limit = max(20, min($limit, 500));

        // Se l'utente ha scritto meno di 2 caratteri, non cerchiamo nulla
        if (mb_strlen($query) < 2) {
            return response()->json([]);
        }

        // Ricerca CAP: prefisso numerico (es. 001 -> 00100, 00118, ...)
        if (preg_match('/^\d+$/', $query)) {
            $results = Location::where('postal_code', 'LIKE', $query . '%')
                ->select('postal_code', 'place_name', 'province')
                ->orderBy('postal_code')
                ->orderBy('place_name')
                ->limit($limit)
                ->get();

            return response()->json($results);
        }

        $queryLower = mb_strtolower($query);

        // Ricerca citta': priorita' a match esatto, poi inizio parola, poi prefisso.
        $results = Location::query()
            ->select('postal_code', 'place_name', 'province')
            ->where(function ($q) use ($query, $queryLower) {
                $q->whereRaw('LOWER(place_name) = ?', [$queryLower])
                    ->orWhereRaw('LOWER(place_name) LIKE ?', [$queryLower . ' %'])
                    ->orWhereRaw('LOWER(place_name) LIKE ?', ['% ' . $queryLower . ' %'])
                    ->orWhereRaw('LOWER(place_name) LIKE ?', [$queryLower . '%']);
            })
            ->orderByRaw(
                "CASE
                    WHEN LOWER(place_name) = ? THEN 0
                    WHEN LOWER(place_name) LIKE ? THEN 1
                    WHEN LOWER(place_name) LIKE ? THEN 2
                    ELSE 3
                END",
                [$queryLower, $queryLower . ' %', $queryLower . '%']
            )
            ->orderBy('place_name')
            ->orderBy('postal_code')
            ->limit($limit)
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
        $cap = trim((string) $request->input('cap', ''));

        if (empty($cap)) {
            return response()->json([]);
        }

        // Cerchiamo tutte le localita' con questo CAP esatto
        $results = Location::where('postal_code', $cap)
            ->select('postal_code', 'place_name', 'province')
            ->get();

        return response()->json($results);
    }

    /**
     * Cerca localita' per nome citta' (priorita' match esatto).
     * Se trova la citta' esatta, restituisce tutti i CAP di quella citta'.
     * Se non trova match esatto, usa fallback per prefisso (city%).
     */
    public function byCity(Request $request)
    {
        $city = trim((string) $request->input('city', ''));
        $limit = (int) $request->input('limit', 500);
        $limit = max(20, min($limit, 1000));

        if (mb_strlen($city) < 2) {
            return response()->json([]);
        }

        $cityLower = mb_strtolower($city);

        $exact = Location::query()
            ->select('postal_code', 'place_name', 'province')
            ->whereRaw('LOWER(place_name) = ?', [$cityLower])
            ->distinct()
            ->orderBy('postal_code')
            ->get();

        if ($exact->isNotEmpty()) {
            return response()->json($exact);
        }

        $prefix = Location::query()
            ->select('postal_code', 'place_name', 'province')
            ->whereRaw('LOWER(place_name) LIKE ?', [$cityLower . '%'])
            ->distinct()
            ->orderBy('place_name')
            ->orderBy('postal_code')
            ->limit($limit)
            ->get();

        return response()->json($prefix);
    }
}
