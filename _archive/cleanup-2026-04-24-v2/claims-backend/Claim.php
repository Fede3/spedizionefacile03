<?php

/**
 * FILE: Claim.php
 * SCOPO: Modello reclamo utente su un ordine (F03 — audit BRT 2026-04-18).
 *
 * DOVE SI USA:
 *   - ClaimController.php — CRUD utente (create, list, show)
 *   - Admin/AdminClaimController.php — gestione admin (index, update status)
 *   - ClaimOpenedMail.php / ClaimResolvedMail.php / ClaimAdminNotificationMail.php
 *
 * STATI:
 *   open → in_review → resolved | rejected
 *   `resolved_at` viene popolato quando status diventa resolved/rejected.
 *
 * TIPI RECLAMO:
 *   - damage: pacco danneggiato
 *   - loss: pacco smarrito
 *   - delay: consegna in forte ritardo
 *   - wrong_delivery: consegna a indirizzo errato
 *   - other: altro problema
 *
 * COLLEGAMENTI:
 *   - app/Models/ClaimAttachment.php — foto/PDF allegati
 *   - app/Models/Order.php — ordine oggetto del reclamo
 *   - app/Models/User.php — utente autore
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Claim extends Model
{
    use HasFactory;

    const STATUS_OPEN = 'open';
    const STATUS_IN_REVIEW = 'in_review';
    const STATUS_RESOLVED = 'resolved';
    const STATUS_REJECTED = 'rejected';

    const TYPE_DAMAGE = 'damage';
    const TYPE_LOSS = 'loss';
    const TYPE_DELAY = 'delay';
    const TYPE_WRONG_DELIVERY = 'wrong_delivery';
    const TYPE_OTHER = 'other';

    protected $fillable = [
        'user_id',
        'order_id',
        'claim_type',
        'status',
        'description',
        'resolution_notes',
        'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    public static function availableTypes(): array
    {
        return [
            self::TYPE_DAMAGE,
            self::TYPE_LOSS,
            self::TYPE_DELAY,
            self::TYPE_WRONG_DELIVERY,
            self::TYPE_OTHER,
        ];
    }

    public static function availableStatuses(): array
    {
        return [
            self::STATUS_OPEN,
            self::STATUS_IN_REVIEW,
            self::STATUS_RESOLVED,
            self::STATUS_REJECTED,
        ];
    }

    public function typeLabel(): string
    {
        return [
            self::TYPE_DAMAGE => 'Pacco danneggiato',
            self::TYPE_LOSS => 'Pacco smarrito',
            self::TYPE_DELAY => 'Consegna in ritardo',
            self::TYPE_WRONG_DELIVERY => 'Consegna errata',
            self::TYPE_OTHER => 'Altro',
        ][$this->claim_type] ?? $this->claim_type;
    }

    public function statusLabel(): string
    {
        return [
            self::STATUS_OPEN => 'Aperto',
            self::STATUS_IN_REVIEW => 'In verifica',
            self::STATUS_RESOLVED => 'Risolto',
            self::STATUS_REJECTED => 'Rifiutato',
        ][$this->status] ?? $this->status;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ClaimAttachment::class);
    }
}
