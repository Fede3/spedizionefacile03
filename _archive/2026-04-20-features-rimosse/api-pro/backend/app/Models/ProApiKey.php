<?php

/**
 * FILE: ProApiKey.php
 * SCOPO: Modello chiave API per utenti Partner Pro (accesso programmatico /api/v1/*).
 *
 * DOVE SI USA:
 *   - app/Http/Controllers/Pro/ProApiKeyController.php — CRUD chiavi
 *   - app/Http/Middleware/AuthenticateProApiKey.php — autenticazione richieste
 *
 * SICUREZZA:
 *   - key_hash: SHA-256 del plaintext, mai reversibile
 *   - last_four: solo per identificazione visiva
 *   - scopes: array JSON con permessi consentiti
 *   - revoked_at: soft revoke (mantiene record per audit)
 *
 * METODI:
 *   - generatePlaintext(): genera nuova chiave random "sf_pro_<32-hex>"
 *   - hash($plaintext): hash SHA-256 deterministico
 *   - hasScope($scope): verifica se la chiave ha un permesso
 *   - isActive(): true se non revocata
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ProApiKey extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'key_hash',
        'last_four',
        'scopes',
        'last_used_at',
        'revoked_at',
    ];

    protected $hidden = [
        'key_hash', // Non esporre mai l'hash nelle risposte JSON
    ];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Genera una nuova chiave API in plaintext.
     * Formato: "sf_pro_<32 caratteri esadecimali>"
     * Il plaintext deve essere mostrato all'utente UNA SOLA VOLTA.
     */
    public static function generatePlaintext(): string
    {
        return 'sf_pro_' . bin2hex(random_bytes(16));
    }

    /**
     * Hash deterministico SHA-256 del plaintext.
     * Usato sia in creazione (per salvare) che in lookup (per cercare).
     */
    public static function hash(string $plaintext): string
    {
        return hash('sha256', $plaintext);
    }

    public function hasScope(string $scope): bool
    {
        return in_array($scope, $this->scopes ?? [], true);
    }

    public function isActive(): bool
    {
        return is_null($this->revoked_at);
    }
}
