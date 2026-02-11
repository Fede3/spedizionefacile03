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
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('stripe_connected_account_id');
            /* $table->decimal('discount_percentage', 5, 2);
            $table->decimal('pro_commission_percentage', 5, 2); */
            $table->decimal('percentage', 5, 2);
           /*  $table->boolean('active')->default(true); */
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};
