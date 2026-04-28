<?php

/**
 * MIGRAZIONE: Aggiunge campi per il sistema di rimborso e annullamento ordini.
 *
 * Campi aggiunti:
 * - refund_status: stato del rimborso (pending, completed, failed, none)
 * - refund_amount: importo rimborsato in centesimi
 * - refund_method: metodo di rimborso (stripe, wallet)
 * - refund_reason: motivo del rimborso (testo libero)
 * - refunded_at: data e ora del rimborso
 * - cancellation_fee: commissione di annullamento in centesimi (default 200 = 2 EUR)
 * - payment_method: metodo di pagamento originale (stripe, wallet, bonifico)
 * - stripe_payment_intent_id: ID del PaymentIntent Stripe per i rimborsi
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Stato del rimborso
            $table->string('refund_status')->nullable()->after('status');
            // Importo rimborsato in centesimi
            $table->integer('refund_amount')->nullable()->after('refund_status');
            // Metodo usato per il rimborso (stripe, wallet)
            $table->string('refund_method')->nullable()->after('refund_amount');
            // Motivo del rimborso (testo libero dall'utente)
            $table->string('refund_reason')->nullable()->after('refund_method');
            // Data e ora del rimborso completato
            $table->timestamp('refunded_at')->nullable()->after('refund_reason');
            // Commissione di annullamento in centesimi (default 200 = 2 EUR)
            $table->integer('cancellation_fee')->nullable()->after('refunded_at');
            // Metodo di pagamento originale (stripe, wallet, bonifico)
            $table->string('payment_method')->nullable()->after('cancellation_fee');
            // ID del PaymentIntent Stripe (per poter fare il rimborso)
            $table->string('stripe_payment_intent_id')->nullable()->after('payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'refund_status',
                'refund_amount',
                'refund_method',
                'refund_reason',
                'refunded_at',
                'cancellation_fee',
                'payment_method',
                'stripe_payment_intent_id',
            ]);
        });
    }
};
