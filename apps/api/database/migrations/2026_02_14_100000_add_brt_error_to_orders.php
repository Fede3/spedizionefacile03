<?php

/**
 * MIGRAZIONE: Aggiunge il campo brt_error alla tabella orders.
 *
 * Questo campo salva l'eventuale messaggio di errore quando la generazione
 * automatica dell'etichetta BRT fallisce dopo il pagamento. Serve per mostrare
 * all'utente l'errore specifico invece di lasciare il messaggio "Etichetta in generazione..."
 * all'infinito.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->text('brt_error')->nullable()->after('brt_pudo_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('brt_error');
        });
    }
};
