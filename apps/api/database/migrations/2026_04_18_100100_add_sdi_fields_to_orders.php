<?php

/**
 * MIGRATION: aggiunge i campi SDI (Sistema di Interscambio) alla tabella orders.
 *
 * Campi aggiunti:
 *   - sdi_status: stato ciclo vita fattura SDI
 *       null → non ancora generata
 *       pending → XML generato, non ancora inviato
 *       sent → inviato al provider, in attesa ricevuta SDI
 *       accepted → consegnata con successo al destinatario (RC o MC)
 *       rejected → scartata (NS) o mancata consegna (MT)
 *       archived → spostata in conservazione sostitutiva
 *   - sdi_xml_path: percorso relativo storage privato dell'XML FatturaPA
 *   - sdi_transmission_id: id univoco generato dal provider (IdTrasmittente)
 *   - sdi_invoice_number: numero progressivo fattura assegnato
 *   - sdi_sent_at / sdi_accepted_at / sdi_rejected_at: timeline
 *   - sdi_last_error: ultimo errore SDI (es. messaggio di scarto)
 *
 * NOTE:
 *   - Campi indipendenti dai campi fiscali su billing_addresses (che sono master)
 *     ma riflettono sempre lo snapshot `billing_data` dell'ordine.
 *   - NON tocchiamo altri campi (altri agent lavorano su COD/insurance/post-vendita).
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Ciclo di vita della fattura elettronica
            $table->string('sdi_status', 32)->nullable()->after('billing_data');

            // Percorso dell'XML nel filesystem privato ("local")
            $table->string('sdi_xml_path')->nullable()->after('sdi_status');

            // ID trasmissione provider
            $table->string('sdi_transmission_id')->nullable()->after('sdi_xml_path');

            // Numero progressivo (es. "2026/00012")
            $table->string('sdi_invoice_number', 32)->nullable()->after('sdi_transmission_id');

            // Timestamp stati
            $table->timestamp('sdi_sent_at')->nullable()->after('sdi_invoice_number');
            $table->timestamp('sdi_accepted_at')->nullable()->after('sdi_sent_at');
            $table->timestamp('sdi_rejected_at')->nullable()->after('sdi_accepted_at');

            // Ultimo errore in caso di scarto/rifiuto
            $table->text('sdi_last_error')->nullable()->after('sdi_rejected_at');

            // Indici utili
            $table->index('sdi_status');
            $table->index('sdi_transmission_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['sdi_status']);
            $table->dropIndex(['sdi_transmission_id']);
            $table->dropColumn([
                'sdi_status',
                'sdi_xml_path',
                'sdi_transmission_id',
                'sdi_invoice_number',
                'sdi_sent_at',
                'sdi_accepted_at',
                'sdi_rejected_at',
                'sdi_last_error',
            ]);
        });
    }
};
