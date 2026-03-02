<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('referral_usages', function (Blueprint $table) {
            // Previene race condition: un ordine puo' avere al massimo un referral
            $table->unique('order_id');
        });
    }

    public function down(): void
    {
        Schema::table('referral_usages', function (Blueprint $table) {
            $table->dropUnique(['order_id']);
        });
    }
};
