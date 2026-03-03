<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PudoPoint extends Model
{
    protected $fillable = [
        'pudo_id',
        'name',
        'address',
        'city',
        'zip_code',
        'province',
        'country',
        'latitude',
        'longitude',
        'phone',
        'email',
        'opening_hours',
        'is_active',
    ];

    protected $casts = [
        'opening_hours' => 'array',
        'is_active' => 'boolean',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    /**
     * Cerca PUDO per città e CAP
     */
    public static function searchByLocation(string $city, string $zipCode, int $limit = 10): array
    {
        $points = self::where('is_active', true)
            ->where(function ($query) use ($city, $zipCode) {
                $query->where('city', 'LIKE', "%{$city}%")
                    ->orWhere('zip_code', $zipCode);
            })
            ->limit($limit)
            ->get();

        return $points->map(fn($p) => self::formatForApi($p))->toArray();
    }

    /**
     * Cerca PUDO per coordinate GPS (raggio ~10km)
     */
    public static function searchByCoordinates(float $lat, float $lng, int $limit = 10): array
    {
        // Formula Haversine semplificata per distanza approssimativa
        $points = self::where('is_active', true)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->selectRaw("
                *,
                (6371 * acos(
                    cos(radians(?)) * cos(radians(latitude)) *
                    cos(radians(longitude) - radians(?)) +
                    sin(radians(?)) * sin(radians(latitude))
                )) AS distance
            ", [$lat, $lng, $lat])
            ->having('distance', '<', 10)
            ->orderBy('distance')
            ->limit($limit)
            ->get();

        return $points->map(fn($p) => self::formatForApi($p))->toArray();
    }

    /**
     * Formatta il punto PUDO nel formato API BRT
     */
    private static function formatForApi($point): array
    {
        return [
            'id' => $point->pudo_id,
            'name' => $point->name,
            'address' => $point->address,
            'city' => $point->city,
            'zip_code' => $point->zip_code,
            'province' => $point->province,
            'country' => $point->country,
            'latitude' => $point->latitude ? (float) $point->latitude : null,
            'longitude' => $point->longitude ? (float) $point->longitude : null,
            'phone' => $point->phone,
            'email' => $point->email,
            'opening_hours' => $point->opening_hours,
            'distance' => isset($point->distance) ? round($point->distance, 2) : null,
        ];
    }
}
