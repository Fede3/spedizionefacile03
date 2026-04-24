<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SEC-NEW-07: Coupon anti-abuse
 *
 * Aggiunge campi per limiti di utilizzo globali e per-utente,
 * tabella pivot coupon_user per tracciare chi ha usato quale coupon,
 * e campo coupon_code sugli ordini per linkare coupon usato + prevenire stacking.
 */
return new class extends Migration
{
    public function up(): void
    {
        // --- 1. Campi anti-abuse sulla tabella coupons ---
        Schema::table('coupons', function (Blueprint $table) {
            // Limite globale di utilizzi (null = illimitato)
            $table->unsignedInteger('max_uses')->nullable()->after('expires_at');
            // Limite di utilizzi per singolo utente (null = illimitato)
            $table->unsignedInteger('max_uses_per_user')->nullable()->after('max_uses');
            // Contatore globale di utilizzi effettuati
            $table->unsignedInteger('uses_count')->default(0)->after('max_uses_per_user');
        });

        // --- 2. Tabella pivot coupon_user: traccia ogni utilizzo ---
        Schema::create('coupon_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('used_at')->useCurrent();

            // Indice per query rapide: "quante volte user X ha usato coupon Y?"
            $table->index(['coupon_id', 'user_id']);
        });

        // --- 3. Campo coupon_code sulla tabella orders ---
        // Registra quale coupon e' stato usato nell'ordine (null = nessun coupon).
        // Previene stacking: se l'ordine ha gia' un coupon, non se ne puo' applicare un altro.
        Schema::table('orders', function (Blueprint $table) {
            $table->string('coupon_code', 50)->nullable()->after('subtotal');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('coupon_code');
        });

        Schema::dropIfExists('coupon_user');

        Schema::table('coupons', function (Blueprint $table) {
            $table->dropColumn(['max_uses', 'max_uses_per_user', 'uses_count']);
        });
    }
};
