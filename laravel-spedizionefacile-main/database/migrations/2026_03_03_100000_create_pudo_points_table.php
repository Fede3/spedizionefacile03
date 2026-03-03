<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pudo_points', function (Blueprint $table) {
            $table->id();
            $table->string('pudo_id')->unique()->comment('ID univoco BRT del punto PUDO');
            $table->string('name')->comment('Nome del punto di ritiro');
            $table->string('address')->comment('Indirizzo completo');
            $table->string('city')->index()->comment('Città');
            $table->string('zip_code', 10)->index()->comment('CAP');
            $table->string('province', 2)->comment('Sigla provincia');
            $table->string('country', 3)->default('ITA')->comment('Codice paese ISO');
            $table->decimal('latitude', 10, 7)->nullable()->comment('Latitudine GPS');
            $table->decimal('longitude', 10, 7)->nullable()->comment('Longitudine GPS');
            $table->string('phone', 20)->nullable()->comment('Telefono');
            $table->string('email')->nullable()->comment('Email');
            $table->json('opening_hours')->nullable()->comment('Orari di apertura');
            $table->boolean('is_active')->default(true)->index()->comment('Punto attivo');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pudo_points');
    }
};
