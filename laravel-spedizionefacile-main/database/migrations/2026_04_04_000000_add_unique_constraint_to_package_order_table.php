<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aggiunge un vincolo UNIQUE sulla coppia (order_id, package_id)
     * per prevenire l'inserimento di pacchi duplicati nello stesso ordine.
     */
    public function up(): void
    {
        Schema::table('package_order', function (Blueprint $table) {
            $table->unique(['order_id', 'package_id'], 'package_order_unique');
        });
    }

    public function down(): void
    {
        Schema::table('package_order', function (Blueprint $table) {
            $table->dropUnique('package_order_unique');
        });
    }
};
