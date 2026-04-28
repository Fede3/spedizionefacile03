<?php

/**
 * MIGRATION: create_claim_attachments_table
 * SCOPO: Allegati (foto/PDF) associati ai reclami (F03).
 *
 * VINCOLI:
 *   - path: salvato su disk "local" privato in storage/app/private/claims/{claim_id}/
 *   - Max 5 allegati per reclamo, max 5MB ciascuno (enforced in controller)
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('claim_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('claim_id')->constrained('claims')->cascadeOnDelete();
            $table->string('path', 512);
            $table->string('original_name', 255)->nullable();
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');
            $table->timestamps();

            $table->index('claim_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('claim_attachments');
    }
};
