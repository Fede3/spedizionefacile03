<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('order_id')->constrained(); // crea unsignedBigInteger + foreign key verso orders

            $table->string('ext_id')->nullable();
            $table->string('type')->nullable();
            $table->string('status')->nullable();
            $table->string('provider_status')->nullable();
            $table->string('failure_code')->nullable();
            $table->string('failure_message')->nullable();

            $table->integer('total');

            $table->timestamps();

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
