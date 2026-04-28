<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Aggiunge users.phone_number (E.164) per notifiche SMS opt-in.
 * Distinto da `telephone_number` storico (input italiano libero):
 * - phone_number e' il numero verificato/normalizzato in E.164 usato dal SmsService
 * - telephone_number resta per compatibilita' con vecchi flussi (rubrica, profilo)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Numero in formato E.164 (es. +393331234567). Nullable: opt-in volontario.
            $table->string('phone_number', 20)->nullable()->after('telephone_number');
            // Timestamp di verifica OTP (per quando il flusso OTP sara' abilitato).
            $table->timestamp('phone_number_verified_at')->nullable()->after('phone_number');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone_number', 'phone_number_verified_at']);
        });
    }
};
