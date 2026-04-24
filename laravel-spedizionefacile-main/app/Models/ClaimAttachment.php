<?php

/**
 * FILE: ClaimAttachment.php
 * SCOPO: Allegato (foto/PDF) a un reclamo (F03).
 *
 * VINCOLI:
 *   - File salvati su disk 'local' in storage/app/private/claims/{claim_id}/
 *   - Accessibili solo al proprietario del reclamo o admin (controller streaming)
 *   - max 5 MB per file, max 5 file per reclamo, MIME image/*|application/pdf
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClaimAttachment extends Model
{
    protected $fillable = [
        'claim_id',
        'path',
        'original_name',
        'mime_type',
        'size_bytes',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
    ];

    public function claim(): BelongsTo
    {
        return $this->belongsTo(Claim::class);
    }

    public function isImage(): bool
    {
        return str_starts_with((string) $this->mime_type, 'image/');
    }
}
