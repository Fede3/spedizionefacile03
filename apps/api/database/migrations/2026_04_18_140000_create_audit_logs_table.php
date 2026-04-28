<?php

/**
 * MIGRATION: create_audit_logs_table
 *
 * F14 (audit BRT 2026-04-18) — Audit log centralizzato.
 *
 * Requisito GDPR Art. 32 (sicurezza del trattamento) + buon security posture
 * per sito di intermediazione BRT: dobbiamo poter ricostruire chi ha fatto
 * cosa, quando, da dove, su quale entita'.
 *
 * SCHEMA:
 *   - user_id (nullable)        — autore dell'azione, null se anonimo/system
 *   - actor_type                — 'user' | 'admin' | 'system' | 'guest'
 *   - action                    — slug dell'azione (es. 'auth.login', 'order.refund')
 *   - target_type (nullable)    — FQCN o alias del modello target (es. 'Order')
 *   - target_id (nullable)      — id del target
 *   - ip                        — indirizzo IP (anche IPv6) della richiesta
 *   - user_agent (nullable)     — UA browser, troncato a 512 char
 *   - context (json, nullable)  — payload aggiuntivo (campi modificati, vecchi/nuovi valori)
 *   - created_at                — solo created_at (no updates: log immutabile)
 *
 * INDEXES:
 *   - user_id    — query "tutta l'attivita' di X"
 *   - action     — query "tutti i login falliti"
 *   - created_at — ordinamento + retention/cleanup
 *   - composite (target_type, target_id) — "tutta la storia dell'ordine 123"
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->bigIncrements('id');

            // Attore — nullable: per eventi system/cron o login falliti senza user
            $table->foreignId('user_id')->nullable()->index()
                ->constrained('users')->nullOnDelete();

            // 'user' | 'admin' | 'system' | 'guest'
            $table->string('actor_type', 20)->default('user');

            // Slug azione (es. 'auth.login', 'order.refund', '2fa.enable')
            $table->string('action', 80)->index();

            // Target opzionale (FQCN o alias breve, es. 'App\\Models\\Order' o 'Order')
            $table->string('target_type', 120)->nullable();
            $table->unsignedBigInteger('target_id')->nullable();

            // Network forensics
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 512)->nullable();

            // Payload extra: prima/dopo, ragione, errore
            $table->json('context')->nullable();

            // Audit immutabile: solo created_at
            $table->timestamp('created_at')->nullable()->index();

            $table->index(['target_type', 'target_id'], 'audit_logs_target_idx');
            $table->index(['action', 'created_at'], 'audit_logs_action_time_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
