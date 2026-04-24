<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SEC-NEW-SESSION-DRIVER: tabella sessions per driver database.
 *
 * SpediamoFacile usa SESSION_DRIVER=database (config/session.php) per evitare
 * la perdita delle sessioni sul filesystem effimero di Render/Heroku e per
 * supportare scaling orizzontale. Questa migrazione crea la tabella standard
 * Laravel `sessions` se non esiste gia'.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('sessions')) {
            return;
        }

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
    }
};
