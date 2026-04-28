<?php

/**
 * MIGRATION: aggiunge campi fiscali alla tabella billing_addresses.
 *
 * Campi aggiunti:
 *   - vat_number (P.IVA, 11 cifre, nullable)
 *   - fiscal_code (codice fiscale, 16 char, nullable)
 *   - sdi_code (codice destinatario SDI, 7 char, default "0000000")
 *   - pec_email (PEC, nullable)
 *   - is_business (bool) — true se azienda, false se privato
 *   - company_name (ragione sociale, nullable — richiesto se is_business=true)
 *   - country (default "IT" — ISO-3166-1 alfa-2)
 *
 * NOTE:
 *   - Nessuno dei nuovi campi è hard-required: la validazione applicativa
 *     (BillingAddressStoreRequest) gestisce i casi privato/azienda.
 *   - sdi_code default "0000000" = codice SDI placeholder usato per privati o quando
 *     fattura emessa senza canale preferenziale (B2C).
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('billing_addresses', function (Blueprint $table) {
            // Se è azienda o privato ai fini fiscali
            $table->boolean('is_business')->default(false)->after('name');

            // Ragione sociale (solo per aziende). "name" resta il referente/persona.
            $table->string('company_name')->nullable()->after('is_business');

            // Codice fiscale (16 caratteri alfanumerici per persone fisiche,
            // 11 cifre per enti. Pattern standard italiano.)
            $table->string('fiscal_code', 16)->nullable()->after('company_name');

            // Partita IVA (11 cifre numeriche)
            $table->string('vat_number', 16)->nullable()->after('fiscal_code');

            // Codice destinatario SDI (7 char alfanumerici).
            // "0000000" = default placeholder (privati/senza canale)
            $table->string('sdi_code', 7)->default('0000000')->after('vat_number');

            // PEC (casella pec istituzionale) — alternativa a sdi_code per ricezione
            $table->string('pec_email')->nullable()->after('sdi_code');

            // Paese ISO (default IT)
            $table->string('country', 2)->default('IT')->after('province_name');
        });
    }

    public function down(): void
    {
        Schema::table('billing_addresses', function (Blueprint $table) {
            $table->dropColumn([
                'is_business',
                'company_name',
                'fiscal_code',
                'vat_number',
                'sdi_code',
                'pec_email',
                'country',
            ]);
        });
    }
};
