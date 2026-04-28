<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('price_bands', function (Blueprint $table) {
            $table->boolean('show_discount')->default(true)->after('discount_price');
        });
    }

    public function down(): void
    {
        Schema::table('price_bands', function (Blueprint $table) {
            $table->dropColumn('show_discount');
        });
    }
};
