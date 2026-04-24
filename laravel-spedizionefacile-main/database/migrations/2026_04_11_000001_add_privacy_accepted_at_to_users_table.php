<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Aggiunge la colonna privacy_accepted_at alla tabella users.
 *
 * Registra il timestamp esatto in cui l'utente ha accettato
 * l'informativa sulla privacy durante la registrazione (GDPR compliance).
 * Nullable perche' gli utenti gia' registrati non hanno questo dato.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('privacy_accepted_at')->nullable()->after('email_verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('privacy_accepted_at');
        });
    }
};
