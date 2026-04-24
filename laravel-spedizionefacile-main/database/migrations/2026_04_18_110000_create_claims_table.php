<?php

/**
 * MIGRATION: create_claims_table
 * SCOPO: Tabella reclami cliente per spedizioni con problemi (F03).
 *
 * CAMPI CHIAVE:
 *   - claim_type: tipologia reclamo (damage/loss/delay/wrong_delivery/other)
 *   - status: open → in_review → resolved|rejected
 *   - resolution_notes: testo di risoluzione scritto da admin
 *
 * COLLEGAMENTI:
 *   - app/Models/Claim.php
 *   - app/Http/Controllers/Api/ClaimController.php
 *   - app/Http/Controllers/Api/Admin/AdminClaimController.php
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->enum('claim_type', ['damage', 'loss', 'delay', 'wrong_delivery', 'other'])
                ->default('other');
            $table->enum('status', ['open', 'in_review', 'resolved', 'rejected'])
                ->default('open');
            $table->text('description');
            $table->text('resolution_notes')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['order_id']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('claims');
    }
};
