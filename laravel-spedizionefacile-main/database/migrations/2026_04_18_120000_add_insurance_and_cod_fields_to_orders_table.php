<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Audit BRT F01/F02 — Campi spedizione acquistabili dal cliente.
 *
 * Aggiunge:
 *  - insurance_amount_cents: valore dichiarato dell'assicurazione (centesimi)
 *  - cod_incasso_type: modalita' di incasso (contanti/assegno) lato destinatario
 *    (utile come istruzione operativa al corriere; diverso da cod_payment_type
 *    che mappa BM/CC/AS — modalita' con cui il mittente riceve il rimborso da BRT)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'insurance_amount_cents')) {
                $table->integer('insurance_amount_cents')->nullable()->after('cod_payment_type')
                    ->comment('Valore dichiarato assicurazione in centesimi (feature F02)');
            }

            if (! Schema::hasColumn('orders', 'cod_incasso_type')) {
                $table->string('cod_incasso_type', 16)->nullable()->after('cod_payment_type')
                    ->comment('Modalita incasso destinatario: contanti|assegno (istruzione corriere)');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'insurance_amount_cents')) {
                $table->dropColumn('insurance_amount_cents');
            }
            if (Schema::hasColumn('orders', 'cod_incasso_type')) {
                $table->dropColumn('cod_incasso_type');
            }
        });
    }
};
