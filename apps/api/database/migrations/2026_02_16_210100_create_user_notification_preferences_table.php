<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('referral_site_enabled')->default(true);
            $table->boolean('referral_email_enabled')->default(false);
            $table->boolean('referral_sms_enabled')->default(false);
            $table->timestamp('email_opt_in_at')->nullable();
            $table->timestamp('sms_opt_in_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_notification_preferences');
    }
};
