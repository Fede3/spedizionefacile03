<?php

namespace App\Services\Catalog;

use App\Models\Location;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Logica condivisa per ricerca localita' (autocomplete + lookup deterministico):
 * - normalizzazione filtro paese (?country=)
 * - traduzione alias italiani citta' estere ("Parigi" → "Paris")
 * - fuzzy match Levenshtein per typo tolerance
 * - arricchimento metadata paese (country_name)
 * - applicazione filtro country a query Eloquent
 */
class LocationLookupService
{
    public const ALLOWED_COUNTRIES = PhotonLocationFallback::ALLOWED_COUNTRIES;

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

    /**
     * Alias italiani delle citta' estere piu' cercate.
     * Il DB contiene i nomi originali (Paris, London, Athens...) ma
     * gli utenti italiani cercano in italiano (Parigi, Londra, Atene...).
     */
    private const CITY_ALIASES_IT = [
        'parigi' => 'Paris',
        'londra' => 'London',
        'atene' => 'Athens',
        'bruxelles' => 'Bruxelles',
        'vienna' => 'Wien',
        'monaco di baviera' => 'München',
        'monaco' => 'München',
        'berlino' => 'Berlin',
        'francoforte' => 'Frankfurt am Main',
        'amburgo' => 'Hamburg',
        'colonia' => 'Köln',
        'stoccarda' => 'Stuttgart',
        'dusseldorf' => 'Düsseldorf',
        'norimberga' => 'Nürnberg',
        'barcellona' => 'Barcelona',
        'madrid' => 'Madrid',
        'siviglia' => 'Sevilla',
        'valencia' => 'Valencia',
        'saragozza' => 'Zaragoza',
        'malaga' => 'Málaga',
        'lisbona' => 'Lisboa',
        'porto' => 'Porto',
        'varsavia' => 'Warszawa',
        'cracovia' => 'Kraków',
        'danzica' => 'Gdańsk',
        'breslavia' => 'Wrocław',
        'poznan' => 'Poznań',
        'praga' => 'Praha',
        'brno' => 'Brno',
        'budapest' => 'Budapest',
        'bucarest' => 'București',
        'zagabria' => 'Zagreb',
        'lubiana' => 'Ljubljana',
        'amsterdam' => 'Amsterdam',
        'rotterdam' => 'Rotterdam',
        'aja' => 'Den Haag',
        'utrecht' => 'Utrecht',
        'anversa' => 'Antwerpen',
        'gand' => 'Gent',
        'bruges' => 'Brugge',
        'liegi' => 'Liège',
        'salisburgo' => 'Salzburg',
        'graz' => 'Graz',
        'innsbruck' => 'Innsbruck',
        'edimburgo' => 'Edinburgh',
        'glasgow' => 'Glasgow',
        'manchester' => 'Manchester',
        'liverpool' => 'Liverpool',
        'birmingham' => 'Birmingham',
        'copenaghen' => 'København',
        'aarhus' => 'Aarhus',
        'stoccolma' => 'Stockholm',
        'goteborg' => 'Göteborg',
        'helsinki' => 'Helsinki',
        'tampere' => 'Tampere',
        'riga' => 'Riga',
        'vilnius' => 'Vilnius',
        'tallinn' => 'Tallinn',
        'lussemburgo' => 'Luxembourg',
        'zurigo' => 'Zürich',
        'ginevra' => 'Genève',
        'basilea' => 'Basel',
        'berna' => 'Bern',
        'losanna' => 'Lausanne',
        'bratislava' => 'Bratislava',
        'sofia' => 'Sofia',
        'plovdiv' => 'Plovdiv',
        'salonicco' => 'Thessaloniki',
    ];

    public function normalizeCountryFilter(?string $country): ?string
    {
        $countryCode = strtoupper(trim((string) $country));

        return strlen($countryCode) === 2 ? $countryCode : null;
    }

    public function applyCountryFilter(Builder $query, ?string $countryCode): Builder
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

    /**
     * Risolve la query input in nome canonico DB tramite alias/prefisso/fuzzy match.
     */
    public function resolveCityAlias(string $query): string
    {
        $queryNormalized = mb_strtolower(trim($query));

        if (isset(self::CITY_ALIASES_IT[$queryNormalized])) {
            return self::CITY_ALIASES_IT[$queryNormalized];
        }

        if (mb_strlen($queryNormalized) >= 3) {
            foreach (self::CITY_ALIASES_IT as $italianName => $originalName) {
                if (str_starts_with($italianName, $queryNormalized)) {
                    return $originalName;
                }
            }
        }

        if (mb_strlen($queryNormalized) >= 4) {
            $bestMatch = null;
            $bestDistance = PHP_INT_MAX;
            foreach (self::CITY_ALIASES_IT as $italianName => $originalName) {
                $lenDiff = abs(mb_strlen($italianName) - mb_strlen($queryNormalized));
                if ($lenDiff > 2) {
                    continue;
                }
                $distance = levenshtein($queryNormalized, $italianName);
                if ($distance <= 2 && $distance < $bestDistance) {
                    $bestDistance = $distance;
                    $bestMatch = $originalName;
                }
            }
            if ($bestMatch) {
                return $bestMatch;
            }
        }

        return $query;
    }

    /**
     * Aggiunge metadata (country_name) al risultato singolo o collection.
     */
    public function withCountryMetadata($results)
    {
        if ($results instanceof Collection) {
            return $results->map(fn ($location) => $this->withCountryMetadata($location))->values();
        }

        if (! $results) {
            return $results;
        }

        $countryCode = strtoupper(trim((string) ($results->country_code ?? 'IT')));
        $results->country_code = $countryCode;
        $results->country_name = self::COUNTRY_NAMES[$countryCode] ?? $countryCode;

        return $results;
    }

    /**
     * Esegue ricerca per CAP (prefisso numerico).
     */
    public function searchByPostalPrefix(string $query, ?string $countryCode, int $limit): Collection
    {
        return $this->applyCountryFilter(
            Location::where('postal_code', 'LIKE', $query.'%'),
            $countryCode
        )
            ->select('postal_code', 'place_name', 'province', 'country_code')
            ->orderBy('postal_code')
            ->orderBy('place_name')
            ->limit($limit)
            ->get();
    }

    /**
     * Esegue ricerca per nome citta' con priorita' match (esatto > inizio parola > prefisso).
     */
    public function searchByCityName(string $query, ?string $countryCode, int $limit): Collection
    {
        $queryLower = mb_strtolower($query);

        return $this->applyCountryFilter(Location::query(), $countryCode)
            ->select('postal_code', 'place_name', 'province', 'country_code')
            ->where(function ($q) use ($queryLower) {
                $q->whereRaw('LOWER(place_name) = ?', [$queryLower])
                    ->orWhereRaw('LOWER(place_name) LIKE ?', [$queryLower.' %'])
                    ->orWhereRaw('LOWER(place_name) LIKE ?', ['% '.$queryLower.' %'])
                    ->orWhereRaw('LOWER(place_name) LIKE ?', [$queryLower.'%']);
            })
            ->orderByRaw(
                'CASE
                    WHEN LOWER(place_name) = ? THEN 0
                    WHEN LOWER(place_name) LIKE ? THEN 1
                    WHEN LOWER(place_name) LIKE ? THEN 2
                    ELSE 3
                END',
                [$queryLower, $queryLower.' %', $queryLower.'%']
            )
            ->orderBy('place_name')
            ->orderBy('postal_code')
            ->limit($limit)
            ->get();
    }

    /**
     * Lookup deterministico per CAP esatto (un CAP puo' mappare a piu' citta').
     */
    public function lookupByPostalCode(string $cap, ?string $countryCode): Collection
    {
        return $this->applyCountryFilter(
            Location::where('postal_code', $cap),
            $countryCode
        )
            ->select('postal_code', 'place_name', 'province', 'country_code')
            ->get();
    }

    /**
     * Lookup deterministico per nome citta' (priorita' match esatto, fallback prefisso).
     */
    public function lookupByCityName(string $city, ?string $countryCode, int $limit): Collection
    {
        $cityLower = mb_strtolower($city);

        $exact = $this->applyCountryFilter(Location::query(), $countryCode)
            ->select('postal_code', 'place_name', 'province', 'country_code')
            ->whereRaw('LOWER(place_name) = ?', [$cityLower])
            ->distinct()
            ->orderBy('postal_code')
            ->get();

        if ($exact->isNotEmpty()) {
            return $exact;
        }

        return $this->applyCountryFilter(Location::query(), $countryCode)
            ->select('postal_code', 'place_name', 'province', 'country_code')
            ->whereRaw('LOWER(place_name) LIKE ?', [$cityLower.'%'])
            ->distinct()
            ->orderBy('place_name')
            ->orderBy('postal_code')
            ->limit($limit)
            ->get();
    }
}
