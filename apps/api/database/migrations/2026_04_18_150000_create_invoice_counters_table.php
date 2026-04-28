<?php

/**
 * MIGRATION: crea la tabella invoice_counters per la numerazione progressiva
 * annuale delle fatture/ricevute PDF (M10 — InvoicePdfGenerator).
 *
 * Una riga per anno: prefix + year sono unique. Il counter parte da 0 e viene
 * incrementato atomicamente dentro una transazione DB per evitare buchi/doppi
 * numeri quando piu' fatture vengono generate in parallelo.
 *
 * Esempio:
 *   prefix=INV, year=2026, last_number=42  →  prossimo numero "INV-2026-00043"
 *
 * Reset annuale gestito a livello applicativo: a Capodanno il primo PDF di
 * un nuovo anno crea automaticamente la riga (year=YYYY, last_number=0)
 * e poi increment a 1.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_counters', function (Blueprint $table) {
            $table->id();

            // Prefisso fattura (es. "INV", "FT", "PROFORMA"). Configurabile in
            // config/billing.php — permette di tenere serie distinte (es. note di credito).
            $table->string('prefix', 16)->default('INV');

            // Anno fiscale a 4 cifre (es. 2026). La numerazione si resetta ogni anno.
            $table->unsignedSmallInteger('year');

            // Ultimo numero usato per la coppia (prefix, year). Inizia a 0,
            // diventa 1 dopo la prima fattura. Il prossimo numero sara' last_number + 1.
            $table->unsignedInteger('last_number')->default(0);

            $table->timestamps();

            // Una sola serie per coppia prefix+year. UNIQUE garantisce l'unicita'
            // a livello DB anche in caso di race condition applicativa.
            $table->unique(['prefix', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_counters');
    }
};
