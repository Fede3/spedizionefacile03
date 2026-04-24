<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabella push_subscriptions: registra le subscription Web Push (VAPID) per
 * utente loggato. Una stessa utenza puo' avere piu' device (mobile + desktop).
 *
 * SCHEMA:
 *   - endpoint:  URL univoco del push service del browser (FCM/Apple/Mozilla)
 *   - p256dh:    chiave pubblica ECDH del browser per cifrare il payload
 *   - auth:      secret di autenticazione client (16 byte b64)
 *   - user_agent: stringa UA salvata per UX ("Chrome su MacBook")
 *
 * GDPR: salvataggio solo dopo opt-in esplicito (push_order_updates=true).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // L'endpoint puo' essere lungo (URL FCM > 200 char): TEXT garantito.
            $table->text('endpoint');
            $table->string('p256dh', 200);
            $table->string('auth', 100);
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
            // Endpoint univoco per evitare duplicati device (lo stesso browser
            // puo' rinegoziare ma manteniamo idempotenza dell'upsert).
            // MySQL non permette UNIQUE su TEXT senza length: usiamo hash.
            $table->string('endpoint_hash', 64)->unique();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
