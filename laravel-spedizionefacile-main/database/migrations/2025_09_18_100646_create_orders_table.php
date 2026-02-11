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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('status')->default('pending');
            $table->integer('subtotal');

            $table->foreignId('user_id')->constrained();       // punta automaticamente alla tabella users
            /* $table->foreignId('user_address_id')->constrained();  */   // punta alla tabella addresses
            /* $table->foreignId('shipping_id')->constrained();  */

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
