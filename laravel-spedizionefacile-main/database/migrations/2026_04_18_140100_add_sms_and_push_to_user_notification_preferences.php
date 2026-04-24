<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Estende user_notification_preferences con i canali SMS spedizione + Push.
 *
 * Default tutti FALSE per rispettare GDPR (opt-in esplicito).
 * I timestamp `*_opt_in_at` registrano il momento di consenso utente.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_notification_preferences', function (Blueprint $table) {
            // SMS transazionali su cambio stato spedizione (pickup, transit, delivered).
            $table->boolean('sms_order_updates')->default(false)->after('referral_sms_enabled');
            // SMS marketing/promo (es. coupon dedicati). Default OFF.
            $table->boolean('sms_marketing')->default(false)->after('sms_order_updates');
            // Push web (PWA) per cambio stato ordine.
            $table->boolean('push_order_updates')->default(false)->after('sms_marketing');
            // Push marketing.
            $table->boolean('push_marketing')->default(false)->after('push_order_updates');
            // Timestamp opt-in push (per audit GDPR).
            $table->timestamp('push_opt_in_at')->nullable()->after('sms_opt_in_at');
        });
    }

    public function down(): void
    {
        Schema::table('user_notification_preferences', function (Blueprint $table) {
            $table->dropColumn([
                'sms_order_updates',
                'sms_marketing',
                'push_order_updates',
                'push_marketing',
                'push_opt_in_at',
            ]);
        });
    }
};
