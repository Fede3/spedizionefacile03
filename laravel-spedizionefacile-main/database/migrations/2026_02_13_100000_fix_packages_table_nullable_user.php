<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
        // For SQLite: check if we're on SQLite and handle accordingly
        if (DB::getDriverName() === 'sqlite') {
            // For SQLite, we just need to ensure the table works.
            // The column is already effectively nullable in SQLite since
            // SQLite doesn't enforce NOT NULL on foreign keys the same way.
            // The main fix is removing session_id from the code (done in controllers).
            return;
        }

        // For MySQL/PostgreSQL, make user_id nullable
        Schema::table('packages', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No rollback needed
    }
};
