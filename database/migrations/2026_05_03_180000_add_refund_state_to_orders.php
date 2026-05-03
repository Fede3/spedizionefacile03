<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Aggiunge la colonna refund_state a orders per tracciare il ciclo di vita
 * della cancellazione/rimborso (Saga pattern).
 *
 * Stati possibili:
 *  - none                  : default, nessun rimborso in corso
 *  - requested             : richiesta cancellazione ricevuta, BRT non ancora chiamato
 *  - external_cancelled    : BRT cancellato con successo, Stripe non ancora chiamato
 *  - refunded              : Stripe/wallet refund completato con successo
 *  - failed                : BRT cancel fallito, Stripe NON chiamato (sicuro)
 *  - compensation_needed   : BRT cancellato ma Stripe refund fallito (intervento manuale)
 *
 * Backward compatible: ordini esistenti restano 'none'. Affianca refund_status
 * (legacy: 'completed'/'none') che continua a funzionare per UI/API esistenti.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Usiamo string + check applicativo (compat SQLite/Postgres senza enum dedicato).
            $table->string('refund_state', 32)
                ->default('none')
                ->after('status');

            $table->index('refund_state', 'orders_refund_state_idx');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_refund_state_idx');
            $table->dropColumn('refund_state');
        });
    }
};
