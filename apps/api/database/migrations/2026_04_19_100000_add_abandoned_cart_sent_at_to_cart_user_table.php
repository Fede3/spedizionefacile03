<?php

/**
 * F15 — Email abbandono carrello.
 *
 * Aggiunge un timestamp `abandoned_cart_sent_at` sulla pivot cart_user per
 * ricordare quando l'email di reminder e' stata inviata all'utente.
 * Serve a non rispedire la stessa email piu' volte e a re-ingaggiare
 * solo chi non ha ancora chiuso l'ordine.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('cart_user')) {
            return;
        }

        Schema::table('cart_user', function (Blueprint $table) {
            if (! Schema::hasColumn('cart_user', 'abandoned_cart_sent_at')) {
                $table->timestamp('abandoned_cart_sent_at')->nullable()->after('updated_at');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('cart_user')) {
            return;
        }

        Schema::table('cart_user', function (Blueprint $table) {
            if (Schema::hasColumn('cart_user', 'abandoned_cart_sent_at')) {
                $table->dropColumn('abandoned_cart_sent_at');
            }
        });
    }
};
