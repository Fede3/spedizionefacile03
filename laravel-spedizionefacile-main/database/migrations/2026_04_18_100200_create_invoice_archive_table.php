<?php

/**
 * MIGRATION: crea la tabella invoice_archive per la conservazione sostitutiva
 * decennale dei documenti fiscali (normativa DM 17/06/2014).
 *
 * La tabella contiene un record per ogni XML SDI archiviato con hash di integrità,
 * path, stato e scadenza retention. I documenti NON vengono mai fisicamente
 * eliminati prima dei 10 anni di legge.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_archive', function (Blueprint $table) {
            $table->id();

            // Riferimento all'ordine (null se cancellato ma dobbiamo conservare il doc)
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();

            // Tipo documento: fattura_sdi | ricevuta_cortesia | nota_credito
            $table->string('document_type', 32);

            // Percorso nel filesystem privato
            $table->string('file_path');

            // Tipo MIME
            $table->string('mime_type', 64)->default('application/xml');

            // Hash SHA-256 del contenuto per verifica integrità
            $table->string('sha256_hash', 64);

            // Dimensione in byte
            $table->unsignedBigInteger('size_bytes')->default(0);

            // Numero progressivo fattura
            $table->string('invoice_number', 64)->nullable()->index();

            // Data fattura (ai fini conservazione decennale)
            $table->date('invoice_date')->nullable()->index();

            // Stato conservazione: pending | archived | migrated
            $table->string('archive_status', 32)->default('pending')->index();

            // Provider conservazione (null = locale, altrimenti "fic", "aruba", ...)
            $table->string('provider', 32)->nullable();

            // Riferimento esterno del provider di conservazione
            $table->string('provider_reference')->nullable();

            // Data fino alla quale il documento deve essere conservato (10 anni)
            $table->date('retain_until')->index();

            // Metadati JSON (partite IVA, codice SDI, totali, ecc.)
            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->index(['document_type', 'archive_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_archive');
    }
};
