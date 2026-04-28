<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Aggiunge soft deletes alla tabella users per supportare GDPR Art. 17.
 *
 * Quando un utente richiede la cancellazione del proprio account,
 * i dati personali vengono anonimizzati e il record viene soft-deleted.
 * Questo preserva l'integrita' referenziale con ordini/transazioni
 * necessari per obblighi fiscali (D.P.R. 633/72).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
