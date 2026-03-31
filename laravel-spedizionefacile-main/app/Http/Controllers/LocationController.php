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
    private const COUNTRY_NAMES = [
        'IT' => 'Italia',
        'AT' => 'Austria',
        'BE' => 'Belgio',
        'BG' => 'Bulgaria',
        'HR' => 'Croazia',
        'DK' => 'Danimarca',
        'EE' => 'Estonia',
        'FI' => 'Finlandia',
        'FR' => 'Francia',
        'DE' => 'Germania',
        'GR' => 'Grecia',
        'LU' => 'Lussemburgo',
        'NL' => 'Olanda',
        'PL' => 'Polonia',
        'PT' => 'Portogallo',
        'CZ' => 'Repubblica Ceca',
        'RO' => 'Romania',
        'SK' => 'Slovacchia',
        'SI' => 'Slovenia',
        'ES' => 'Spagna',
        'SE' => 'Svezia',
        'HU' => 'Ungheria',
        'LV' => 'Lettonia',
        'LT' => 'Lituania',
    ];

    private function normalizeCountryFilter(Request $request): ?string
    {
        $countryCode = strtoupper(trim((string) $request->input('country', '')));
        return strlen($countryCode) === 2 ? $countryCode : null;
    }

    private function applyCountryFilter($query, ?string $countryCode)
    {
        if (! $countryCode) {
            return $query;
        }

        if ($countryCode === 'IT') {
            return $query->where(function ($countryQuery) {
                $countryQuery->where('country_code', 'IT')->orWhereNull('country_code');
            });
        }

        return $query->where('country_code', $countryCode);
    }

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
            ->select('postal_code', 'place_name', 'province', 'country_code')
            ->first();

        return response()->json($result ? $this->withCountryMetadata($result) : null);
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
        $countryCode = $this->normalizeCountryFilter($request);

        // Se l'utente ha scritto meno di 2 caratteri, non cerchiamo nulla
        if (mb_strlen($query) < 2) {
            return response()->json([]);
        }

        // Ricerca CAP: prefisso numerico (es. 001 -> 00100, 00118, ...)
        if (preg_match('/^\d+$/', $query)) {
            $results = $this->applyCountryFilter(
                Location::where('postal_code', 'LIKE', $query . '%'),
                $countryCode
            )
                ->select('postal_code', 'place_name', 'province', 'country_code')
                ->orderBy('postal_code')
                ->orderBy('place_name')
                ->limit($limit)
                ->get();

            return response()->json($this->withCountryMetadata($results));
        }

        $queryLower = mb_strtolower($query);

        // Ricerca citta': priorita' a match esatto, poi inizio parola, poi prefisso.
        $results = $this->applyCountryFilter(Location::query(), $countryCode)
            ->select('postal_code', 'place_name', 'province', 'country_code')
            ->where(function ($q) use ($queryLower) {
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

        return response()->json($this->withCountryMetadata($results));
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
        $countryCode = $this->normalizeCountryFilter($request);

        if (empty($cap)) {
            return response()->json([]);
        }

        // Cerchiamo tutte le localita' con questo CAP esatto
        $results = $this->applyCountryFilter(
            Location::where('postal_code', $cap),
            $countryCode
        )
            ->select('postal_code', 'place_name', 'province', 'country_code')
            ->get();

        return response()->json($this->withCountryMetadata($results));
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
        $countryCode = $this->normalizeCountryFilter($request);

        if (mb_strlen($city) < 2) {
            return response()->json([]);
        }

        $cityLower = mb_strtolower($city);

        $exact = $this->applyCountryFilter(Location::query(), $countryCode)
            ->select('postal_code', 'place_name', 'province', 'country_code')
            ->whereRaw('LOWER(place_name) = ?', [$cityLower])
            ->distinct()
            ->orderBy('postal_code')
            ->get();

        if ($exact->isNotEmpty()) {
            return response()->json($this->withCountryMetadata($exact));
        }

        $prefix = $this->applyCountryFilter(Location::query(), $countryCode)
            ->select('postal_code', 'place_name', 'province', 'country_code')
            ->whereRaw('LOWER(place_name) LIKE ?', [$cityLower . '%'])
            ->distinct()
            ->orderBy('place_name')
            ->orderBy('postal_code')
            ->limit($limit)
            ->get();

        return response()->json($this->withCountryMetadata($prefix));
    }

    private function withCountryMetadata($results)
    {
        if ($results instanceof \Illuminate\Support\Collection) {
            return $results->map(fn ($location) => $this->withCountryMetadata($location))->values();
        }

        if (!$results) {
            return $results;
        }

        $countryCode = strtoupper(trim((string) ($results->country_code ?? 'IT')));
        $results->country_code = $countryCode;
        $results->country_name = self::COUNTRY_NAMES[$countryCode] ?? $countryCode;

        return $results;
    }
}
