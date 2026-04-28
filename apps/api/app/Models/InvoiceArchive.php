<?php

/**
 * FILE: InvoiceArchive.php
 * SCOPO: Record di conservazione decennale dei documenti fiscali (XML SDI, PDF ricevute).
 *
 * REGOLA DI LEGGE:
 *   DM 17/06/2014: i documenti fiscali elettronici devono essere conservati
 *   per 10 anni. Questa tabella ne tiene l'inventario con hash di integrità,
 *   percorso storage e scadenza retention.
 *
 * DOVE SI USA:
 *   - SdiService::archive() crea un record al termine del ciclo SDI
 *   - Command invoices:archive (futuro) per migrare file fisici verso provider esterni
 *
 * CAMPI:
 *   - order_id: FK ordine (nullOnDelete per mantenere l'archivio se ordine cancellato)
 *   - document_type: fattura_sdi | ricevuta_cortesia | nota_credito
 *   - file_path: path relativo in disco "local" (storage/app/...)
 *   - sha256_hash: impronta per verifica integrità
 *   - invoice_number / invoice_date: chiavi di ricerca legali
 *   - archive_status: pending | archived | migrated
 *   - retain_until: data oltre la quale il doc può essere (eventualmente) purgato
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceArchive extends Model
{
    protected $table = 'invoice_archive';

    protected $fillable = [
        'order_id',
        'document_type',
        'file_path',
        'mime_type',
        'sha256_hash',
        'size_bytes',
        'invoice_number',
        'invoice_date',
        'archive_status',
        'provider',
        'provider_reference',
        'retain_until',
        'metadata',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'retain_until' => 'date',
        'size_bytes' => 'integer',
        'metadata' => 'array',
    ];

    public const TYPE_FATTURA_SDI = 'fattura_sdi';
    public const TYPE_RICEVUTA = 'ricevuta_cortesia';
    public const TYPE_NOTA_CREDITO = 'nota_credito';

    public const STATUS_PENDING = 'pending';
    public const STATUS_ARCHIVED = 'archived';
    public const STATUS_MIGRATED = 'migrated';

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
