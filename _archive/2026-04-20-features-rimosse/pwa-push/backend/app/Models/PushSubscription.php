<?php

/**
 * MODEL: PushSubscription
 *
 * Subscription Web Push (VAPID) registrata da un device del browser
 * dell'utente. Vedi PushNotificationService per l'invio.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushSubscription extends Model
{
    protected $fillable = [
        'user_id',
        'endpoint',
        'endpoint_hash',
        'p256dh',
        'auth',
        'user_agent',
        'last_used_at',
    ];

    protected $casts = [
        'last_used_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Calcola hash sha256 dell'endpoint (usato come chiave UNIQUE).
     */
    public static function hashEndpoint(string $endpoint): string
    {
        return hash('sha256', $endpoint);
    }

    /**
     * Restituisce la subscription nel formato accettato da minishlink/web-push:
     *   ['endpoint' => ..., 'keys' => ['p256dh' => ..., 'auth' => ...]]
     */
    public function toWebPushArray(): array
    {
        return [
            'endpoint' => $this->endpoint,
            'keys' => [
                'p256dh' => $this->p256dh,
                'auth' => $this->auth,
            ],
        ];
    }
}
