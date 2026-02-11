<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserAddress extends Model
{
    protected $fillable = [
        'type',
        'name',
        'additional_information',
        'address',
        'number_type',
        'address_number',
        'intercom_code',
        'country',
        'city',
        'postal_code',
        'province',
        'telephone_number',
        'email',
        'default',
        'user_id'
    ];

    
    public static function boot() {
        parent::boot();

        static::creating(function($address) {

            // Conta quanti indirizzi ha già l'utente
            $existingCount = $address->newQuery()
                ->where('user_id', $address->user_id)
                ->count();

            // Caso 1: Primo indirizzo dell'utente → deve diventare default
            if ($existingCount === 0) {
                $address->default = true;
            }

            // Caso 2: Questo indirizzo è default → azzera gli altri
            if ($address->default) {
                $address->newQuery()
                    ->where('user_id', $address->user_id)
                    ->update(['default' => false]);
            }
        });

        static::updating(function($address) {
            if ($address->default) {
                $address->newQuery()->where('user_id', $address->user->id)
                                    ->where('id', '!=', $address->id)
                                    ->update(['default' => false]);
            }
        });

        static::deleting(function ($address) {
            // Se l'indirizzo eliminato è il default
            if ($address->default) {
                // Trova un altro indirizzo dello stesso utente (es. il più vecchio o il più recente)
                $newDefault = $address->newQuery()
                    ->where('user_id', $address->user_id)
                    ->where('id', '!=', $address->id)
                    ->orderBy('id', 'asc') // qui decidi la logica: primo creato, ultimo creato, ecc.
                    ->first();

                if ($newDefault) {
                    $newDefault->update(['default' => true]);
                }
            }
        });
    }

    public function user() {
        return $this->belongsTo(User::class);
    }
}
