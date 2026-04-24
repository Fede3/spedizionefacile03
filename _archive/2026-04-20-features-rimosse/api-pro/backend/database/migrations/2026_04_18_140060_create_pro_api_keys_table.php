<?php

/**
 * MIGRATION: create_pro_api_keys_table
 *
 * SCOPO:
 *   Tabella per chiavi API dedicate agli utenti Partner Pro.
 *   Permette accesso programmatico a endpoint /api/v1/* via header X-Pro-Api-Key.
 *
 * SICUREZZA:
 *   - Il campo `key_hash` salva SHA-256 del plaintext (mai il plaintext in chiaro)
 *   - Il plaintext viene mostrato all'utente UNA SOLA VOLTA al momento della creazione
 *   - `last_four` permette di identificare la chiave nella UI senza esporre il segreto
 *   - `revoked_at` (soft-revoke): la chiave non viene cancellata fisicamente per audit
 *
 * SCOPES:
 *   Array JSON di permessi: shipments:read, shipments:write, tracking:read.
 *   Il middleware AuthenticateProApiKey verifica che l'endpoint richiesto rientri.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pro_api_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100); // Nome leggibile dato dall'utente (es. "Integrazione Magento")
            $table->string('key_hash', 64)->unique(); // SHA-256 del plaintext (sempre 64 caratteri hex)
            $table->string('last_four', 4); // Ultimi 4 caratteri del plaintext, mostrati nella UI
            $table->json('scopes'); // Array di scope (es. ["shipments:read", "shipments:write"])
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            // Indice per lookup rapido per utente + filtraggio attive
            $table->index(['user_id', 'revoked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pro_api_keys');
    }
};
