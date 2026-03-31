<?php
/**
 * FILE: Brt/PudoService.php
 * SCOPO: Ricerca punti PUDO (Pick Up Drop Off) tramite API BRT e fallback database locale.
 *
 * DOVE SI USA:
 *   - BrtController.php — endpoint HTTP per ricerca PUDO per indirizzo e coordinate
 */

namespace App\Services\Brt;

use App\Models\Location;
use App\Models\PudoPoint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PudoService
{
    public function __construct(
        private readonly BrtConfig $config,
    ) {}

    /**
     * Cerca punti PUDO per indirizzo con strategia multi-pass e fallback DB locale.
     */
    public function getPudoByAddress(string $address, string $zipCode, string $city, string $countryCode = 'ITA', int $maxResults = 50): array
    {
        $address = trim($address);
        $zipCode = preg_replace('/\D/', '', (string) $zipCode);
        $city = trim($city);
        $maxResults = max(1, min($maxResults, 50));
        $coverageKm = 80;

        $strategyUsed = [];
        $combinedPoints = [];
        $fallbackUsed = false;
        $geocodedSeed = null;

        $mergePoints = function (array $points) use (&$combinedPoints, $maxResults): void {
            if (empty($points)) return;
            $combinedPoints = $this->mergePudoPoints($combinedPoints, $points, $maxResults);
        };

        // Pass 1: citta + CAP
        if ($city !== '' && $zipCode !== '') {
            $strategyUsed[] = 'city_zip';
            $primaryResult = $this->queryPudoByAddressNoFallback($address, $zipCode, $city, $countryCode, $maxResults);
            if (!empty($primaryResult['pudo'])) {
                $mergePoints($primaryResult['pudo']);
            }
        }

        // Pass 2: citta con CAP alternativi
        if (count($combinedPoints) < $maxResults && $city !== '') {
            $alternativeZips = $this->resolveAlternativeZipsForCity($city, $zipCode);
            if (!empty($alternativeZips)) {
                $strategyUsed[] = 'city_alt_zip';
                foreach ($alternativeZips as $alternativeZip) {
                    if (count($combinedPoints) >= $maxResults) break;
                    $altResult = $this->queryPudoByAddressNoFallback($address, $alternativeZip, $city, $countryCode, $maxResults);
                    if (!empty($altResult['pudo'])) {
                        $mergePoints($altResult['pudo']);
                    }
                }
            }
        }

        // Pass 2b: solo citta
        if (count($combinedPoints) < $maxResults && $city !== '') {
            $strategyUsed[] = 'city_only';
            $cityOnlyResult = $this->queryPudoByAddressNoFallback($address, '', $city, $countryCode, $maxResults);
            if (!empty($cityOnlyResult['pudo'])) {
                $mergePoints($cityOnlyResult['pudo']);
            }
        }

        // Pass 3: solo CAP
        if (count($combinedPoints) < $maxResults && $zipCode !== '') {
            $strategyUsed[] = 'zip_only';
            $zipOnlyResult = $this->queryPudoByAddressNoFallback($address, $zipCode, '', $countryCode, $maxResults);
            if (!empty($zipOnlyResult['pudo'])) {
                $mergePoints($zipOnlyResult['pudo']);
            }
        }

        // Pass 4: nearby da coordinate geocodificate
        if (count($combinedPoints) < $maxResults) {
            $geocodedSeed = $this->geocodeInputToCoordinates($address, $city, $zipCode);
            if ($geocodedSeed) {
                $strategyUsed[] = 'nearby_geo_input';
                $nearbyResult = $this->getPudoByCoordinates(
                    (float) $geocodedSeed['latitude'],
                    (float) $geocodedSeed['longitude'],
                    $maxResults
                );
                if (!empty($nearbyResult['pudo'])) {
                    $mergePoints($nearbyResult['pudo']);
                    if (!empty($nearbyResult['fallback'])) {
                        $fallbackUsed = true;
                    }
                }
            }
        }

        // Pass 5: griglia geografica attorno al seed
        if (
            count($combinedPoints) < min($maxResults, 30) &&
            is_array($geocodedSeed) &&
            isset($geocodedSeed['latitude'], $geocodedSeed['longitude'])
        ) {
            $strategyUsed[] = 'nearby_geo_grid';
            $gridPoints = $this->buildGeoGridSearchPoints((float) $geocodedSeed['latitude'], (float) $geocodedSeed['longitude']);
            $gridBatchResults = min($maxResults, 30);

            foreach ($gridPoints as $gridPoint) {
                if (count($combinedPoints) >= $maxResults) {
                    break;
                }

                $gridNearbyResult = $this->getPudoByCoordinates(
                    (float) $gridPoint['latitude'],
                    (float) $gridPoint['longitude'],
                    $gridBatchResults
                );

                if (!empty($gridNearbyResult['pudo'])) {
                    $mergePoints($gridNearbyResult['pudo']);
                    if (!empty($gridNearbyResult['fallback'])) {
                        $fallbackUsed = true;
                    }
                }
            }
        }

        // Fallback finale database locale
        if (empty($combinedPoints)) {
            $fallbackResult = $this->getPudoFromDatabase($city, $zipCode, $maxResults);
            if (!empty($fallbackResult['pudo'])) {
                $mergePoints($fallbackResult['pudo']);
                $fallbackUsed = true;
                $strategyUsed[] = 'fallback_db';
            }
        }

        $combinedPoints = array_values(array_filter($combinedPoints, function ($point) {
            $provider = strtoupper(trim((string) ($point['provider'] ?? 'BRT')));
            return $provider === '' || $provider === 'BRT';
        }));
        $combinedPoints = array_map(function ($point) {
            $point['provider'] = 'BRT';
            return $point;
        }, $combinedPoints);

        $combinedPoints = $this->sortPudoByDistance($combinedPoints);
        if (count($combinedPoints) > $maxResults) {
            $combinedPoints = array_slice($combinedPoints, 0, $maxResults);
        }

        $meta = [
            'strategy_used' => array_values(array_unique($strategyUsed)),
            'search_passes' => count(array_unique($strategyUsed)),
            'coverage_km' => $coverageKm,
            'returned_count' => count($combinedPoints),
            'requested_count' => $maxResults,
            'fallback' => $fallbackUsed,
            'provider' => 'BRT',
        ];

        if (empty($combinedPoints)) {
            return [
                'success' => false,
                'error' => 'Nessun punto PUDO trovato per i dati inseriti.',
                'pudo' => [],
                'fallback' => $fallbackUsed,
                'meta' => $meta,
            ];
        }

        return [
            'success' => true,
            'pudo' => $combinedPoints,
            'fallback' => $fallbackUsed,
            'meta' => $meta,
        ];
    }

    /**
     * Cerca punti PUDO per coordinate GPS.
     * FALLBACK: Se l'API BRT fallisce, usa il database locale.
     */
    public function getPudoByCoordinates(float $latitude, float $longitude, int $maxResults = 50): array
    {
        $maxResults = max(1, min($maxResults, 50));

        try {
            $response = $this->config->pudoClient()
                ->get($this->config->pudoApiUrl . '/pudo/v1/open/pickup/get-pudo-by-lat-lng', [
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'max_pudo_number' => $maxResults,
                    'maxDistanceSearch' => 50000,
                ]);

            $body = $response->json();

            if (!$response->successful()) {
                Log::warning('BRT PUDO coordinates API error - using fallback', [
                    'status' => $response->status(),
                    'lat' => $latitude,
                    'lng' => $longitude,
                ]);
                return $this->getPudoFromDatabaseByCoordinates($latitude, $longitude, $maxResults);
            }

            $pudoList = $body['pudo'] ?? [];

            if (empty($pudoList)) {
                Log::info('BRT PUDO coordinates API returned no results - using fallback', ['lat' => $latitude, 'lng' => $longitude]);
                return $this->getPudoFromDatabaseByCoordinates($latitude, $longitude, $maxResults);
            }

            return [
                'success' => true,
                'pudo' => array_map(fn($p) => $this->mapBrtPudoPoint($p), $pudoList),
                'fallback' => false,
                'meta' => [
                    'strategy_used' => ['nearby_geo'],
                    'returned_count' => count($pudoList),
                    'requested_count' => $maxResults,
                    'fallback' => false,
                    'provider' => 'BRT',
                ],
            ];
        } catch (\Exception $e) {
            Log::error('BRT PUDO coordinates exception - using fallback', ['error' => $e->getMessage(), 'lat' => $latitude, 'lng' => $longitude]);
            return $this->getPudoFromDatabaseByCoordinates($latitude, $longitude, $maxResults);
        }
    }

    /**
     * Dettagli di un punto PUDO specifico.
     */
    public function getPudoDetails(string $pudoId): array
    {
        try {
            $response = $this->config->pudoClient()
                ->get($this->config->pudoApiUrl . '/pudo/v1/open/pickup/get-pudo-details', [
                    'pudoId' => $pudoId,
                ]);

            $body = $response->json();

            if (!$response->successful()) {
                return ['success' => false, 'error' => 'Errore PUDO details API'];
            }

            return ['success' => true, 'pudo' => $body];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ---- Metodi privati ----

    private function queryPudoByAddressNoFallback(string $address, string $zipCode, string $city, string $countryCode, int $maxResults): array
    {
        try {
            $response = $this->config->pudoClient()
                ->get($this->config->pudoApiUrl . '/pudo/v1/open/pickup/get-pudo-by-address', [
                    'address' => $address,
                    'zipCode' => $zipCode,
                    'city' => $city,
                    'countryCode' => $countryCode,
                    'max_pudo_number' => max(1, min($maxResults, 50)),
                    'maxDistanceSearch' => 80000,
                ]);

            if (!$response->successful()) {
                Log::warning('BRT PUDO API error (no fallback pass)', [
                    'status' => $response->status(),
                    'city' => $city,
                    'zip' => $zipCode,
                ]);
                return ['success' => false, 'pudo' => []];
            }

            $body = $response->json();
            $pudoList = $body['pudo'] ?? [];
            if (empty($pudoList)) {
                return ['success' => true, 'pudo' => []];
            }

            return [
                'success' => true,
                'pudo' => array_map(fn($item) => $this->mapBrtPudoPoint($item), $pudoList),
            ];
        } catch (\Exception $e) {
            Log::warning('BRT PUDO API exception (no fallback pass)', [
                'error' => $e->getMessage(),
                'city' => $city,
                'zip' => $zipCode,
            ]);
            return ['success' => false, 'pudo' => []];
        }
    }

    private function mapBrtPudoPoint(array $point): array
    {
        return [
            'pudo_id' => $point['pudoId'] ?? '',
            'carrier_pudo_id' => $point['carrierPudoId'] ?? '',
            'name' => $point['pointName'] ?? '',
            'address' => $point['fullAddress'] ?? trim(($point['street'] ?? '') . ' ' . ($point['streetNumber'] ?? '')),
            'city' => $point['town'] ?? '',
            'zip_code' => $point['zipCode'] ?? '',
            'province' => $point['state'] ?? '',
            'country' => $point['country'] ?? 'ITA',
            'latitude' => $point['latitude'] ?? null,
            'longitude' => $point['longitude'] ?? null,
            'distance_meters' => isset($point['distanceFromPoint']) ? (int) round((float) $point['distanceFromPoint']) : null,
            'enabled' => $point['enabled'] ?? true,
            'opening_hours' => $point['hours'] ?? [],
            'localization_hint' => $point['localizationHint'] ?? '',
            'provider' => 'BRT',
        ];
    }

    private function geocodeInputToCoordinates(string $address, string $city, string $zipCode): ?array
    {
        try {
            $parts = array_values(array_filter([
                trim($address),
                preg_replace('/\D/', '', (string) $zipCode),
                trim($city),
                'Italia',
            ], fn($value) => (string) $value !== ''));

            if (empty($parts)) {
                return null;
            }

            $response = Http::timeout(8)
                ->acceptJson()
                ->withHeaders([
                    'User-Agent' => 'SpediamoFacile/1.0 (PUDO geocode)',
                ])
                ->get('https://nominatim.openstreetmap.org/search', [
                    'format' => 'jsonv2',
                    'limit' => 1,
                    'q' => implode(', ', $parts),
                ]);

            if (!$response->successful()) {
                return null;
            }

            $payload = $response->json();
            $first = is_array($payload) ? ($payload[0] ?? null) : null;
            if (!$first) {
                return null;
            }

            if (!isset($first['lat'], $first['lon']) || !is_numeric($first['lat']) || !is_numeric($first['lon'])) {
                return null;
            }

            return [
                'latitude' => (float) $first['lat'],
                'longitude' => (float) $first['lon'],
            ];
        } catch (\Exception $e) {
            Log::debug('PUDO geocode input failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function resolveAlternativeZipsForCity(string $city, string $currentZip = ''): array
    {
        try {
            $normalizedCity = mb_strtoupper(trim($city), 'UTF-8');
            if ($normalizedCity === '') return [];

            $exact = Location::query()
                ->whereRaw('UPPER(place_name) = ?', [$normalizedCity])
                ->pluck('postal_code')
                ->map(fn($zip) => preg_replace('/\D/', '', (string) $zip))
                ->filter()
                ->unique()
                ->values()
                ->toArray();

            $zips = $exact;
            if (empty($zips)) {
                $zips = Location::query()
                    ->whereRaw('UPPER(place_name) LIKE ?', [$normalizedCity . '%'])
                    ->limit(100)
                    ->pluck('postal_code')
                    ->map(fn($zip) => preg_replace('/\D/', '', (string) $zip))
                    ->filter()
                    ->unique()
                    ->values()
                    ->toArray();
            }

            $currentZip = preg_replace('/\D/', '', (string) $currentZip);
            if ($currentZip !== '') {
                $zips = array_values(array_filter($zips, fn($zip) => $zip !== $currentZip));
            }

            return array_slice($zips, 0, 8);
        } catch (\Exception $e) {
            Log::warning('PUDO alternative ZIP resolution failed', [
                'city' => $city,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    private function mergePudoPoints(array $base, array $incoming, int $maxResults): array
    {
        $combined = array_merge($base, $incoming);
        $deduped = $this->dedupePudoPoints($combined);
        $sorted = $this->sortPudoByDistance($deduped);
        return array_slice($sorted, 0, max(1, min($maxResults, 50)));
    }

    private function dedupePudoPoints(array $points): array
    {
        $map = [];
        foreach ($points as $point) {
            $key = (string) ($point['pudo_id'] ?? '');
            if ($key === '') {
                $lat = isset($point['latitude']) && is_numeric($point['latitude']) ? number_format((float) $point['latitude'], 6, '.', '') : 'na';
                $lng = isset($point['longitude']) && is_numeric($point['longitude']) ? number_format((float) $point['longitude'], 6, '.', '') : 'na';
                $key = sprintf(
                    '%s|%s|%s|%s|%s|%s',
                    strtolower((string) ($point['name'] ?? '')),
                    strtolower((string) ($point['address'] ?? '')),
                    strtolower((string) ($point['zip_code'] ?? '')),
                    strtolower((string) ($point['city'] ?? '')),
                    $lat,
                    $lng
                );
            }

            if (!isset($map[$key])) {
                $map[$key] = $point;
                continue;
            }

            $currentDistance = isset($map[$key]['distance_meters']) && is_numeric($map[$key]['distance_meters'])
                ? (float) $map[$key]['distance_meters']
                : INF;
            $nextDistance = isset($point['distance_meters']) && is_numeric($point['distance_meters'])
                ? (float) $point['distance_meters']
                : INF;

            if ($nextDistance < $currentDistance) {
                $map[$key] = $point;
            }
        }

        return array_values($map);
    }

    private function sortPudoByDistance(array $points): array
    {
        usort($points, function ($a, $b) {
            $aDistance = isset($a['distance_meters']) && is_numeric($a['distance_meters']) ? (float) $a['distance_meters'] : INF;
            $bDistance = isset($b['distance_meters']) && is_numeric($b['distance_meters']) ? (float) $b['distance_meters'] : INF;

            if ($aDistance === $bDistance) {
                return strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
            }
            return $aDistance <=> $bDistance;
        });

        return $points;
    }

    private function buildGeoGridSearchPoints(float $latitude, float $longitude): array
    {
        $latKmFactor = 110.574;
        $lngKmFactor = max(111.320 * cos(deg2rad($latitude)), 30.0);

        $distancesKm = [40, 75];
        $directions = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1],
        ];

        $points = [];
        foreach ($distancesKm as $distanceKm) {
            foreach ($directions as [$latDirection, $lngDirection]) {
                if ($distanceKm >= 75 && abs($latDirection) + abs($lngDirection) === 2) {
                    continue;
                }

                $latDelta = ($distanceKm / $latKmFactor) * $latDirection;
                $lngDelta = ($distanceKm / $lngKmFactor) * $lngDirection;
                $candidateLat = $latitude + $latDelta;
                $candidateLng = $longitude + $lngDelta;
                $key = sprintf('%.5f|%.5f', $candidateLat, $candidateLng);
                $points[$key] = [
                    'latitude' => $candidateLat,
                    'longitude' => $candidateLng,
                ];
            }
        }

        return array_values($points);
    }

    private function getPudoFromDatabase(string $city, string $zipCode, int $maxResults): array
    {
        try {
            $points = PudoPoint::searchByLocation($city, $zipCode, $maxResults);

            Log::info('PUDO fallback database search', [
                'city' => $city,
                'zip' => $zipCode,
                'results' => count($points),
            ]);

            return [
                'success' => true,
                'pudo' => array_map(fn($p) => [
                    'pudo_id' => $p['id'],
                    'carrier_pudo_id' => $p['id'],
                    'name' => $p['name'],
                    'address' => $p['address'],
                    'city' => $p['city'],
                    'zip_code' => $p['zip_code'],
                    'province' => $p['province'],
                    'country' => $p['country'],
                    'latitude' => $p['latitude'],
                    'longitude' => $p['longitude'],
                    'distance_meters' => $p['distance'] ? (int)($p['distance'] * 1000) : null,
                    'enabled' => true,
                    'opening_hours' => $p['opening_hours'] ?? [],
                    'localization_hint' => '',
                    'provider' => 'BRT',
                ], $points),
                'fallback' => true,
                'meta' => [
                    'strategy_used' => ['fallback_db'],
                    'returned_count' => count($points),
                    'requested_count' => $maxResults,
                    'fallback' => true,
                    'provider' => 'BRT',
                ],
            ];
        } catch (\Exception $e) {
            Log::error('PUDO fallback database error', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Nessun punto PUDO disponibile al momento.', 'pudo' => []];
        }
    }

    private function getPudoFromDatabaseByCoordinates(float $latitude, float $longitude, int $maxResults): array
    {
        try {
            $points = PudoPoint::searchByCoordinates($latitude, $longitude, $maxResults);

            Log::info('PUDO fallback database search by coordinates', [
                'lat' => $latitude,
                'lng' => $longitude,
                'results' => count($points),
            ]);

            return [
                'success' => true,
                'pudo' => array_map(fn($p) => [
                    'pudo_id' => $p['id'],
                    'carrier_pudo_id' => $p['id'],
                    'name' => $p['name'],
                    'address' => $p['address'],
                    'city' => $p['city'],
                    'zip_code' => $p['zip_code'],
                    'province' => $p['province'],
                    'country' => $p['country'],
                    'latitude' => $p['latitude'],
                    'longitude' => $p['longitude'],
                    'distance_meters' => $p['distance'] ? (int)($p['distance'] * 1000) : null,
                    'enabled' => true,
                    'opening_hours' => $p['opening_hours'] ?? [],
                    'localization_hint' => '',
                    'provider' => 'BRT',
                ], $points),
                'fallback' => true,
                'meta' => [
                    'strategy_used' => ['fallback_db_coordinates'],
                    'returned_count' => count($points),
                    'requested_count' => $maxResults,
                    'fallback' => true,
                    'provider' => 'BRT',
                ],
            ];
        } catch (\Exception $e) {
            Log::error('PUDO fallback database error (coordinates)', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Nessun punto PUDO disponibile al momento.', 'pudo' => []];
        }
    }
}
