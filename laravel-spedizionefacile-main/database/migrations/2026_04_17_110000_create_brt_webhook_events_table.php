<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SEC-NEW-BRT-IDEMPOTENCY: tabella brt_webhook_events per idempotenza webhook BRT.
 *
 * BRT non fornisce un event_id univoco per webhook come Stripe, ma la coppia
 * (parcelId, status, timestamp) identifica univocamente un evento di tracking.
 * Calcoliamo un fingerprint sha256(parcelId|status|timestamp) per deduplicare
 * eventi ricevuti piu' volte (retry di rete, duplicati server-side BRT).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brt_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('fingerprint', 64)->unique();
            $table->string('parcel_id', 100)->index();
            $table->string('status', 100);
            $table->string('event_timestamp', 50);
            $table->timestamp('processed_at')->useCurrent();
            $table->index('processed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brt_webhook_events');
    }
};
