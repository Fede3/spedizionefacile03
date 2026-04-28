<?php

/**
 * Indici di performance per query frequenti:
 *   - cart_user(user_id, package_id): composite usato da CartController per verifiche e lookup
 *   - orders(status): standalone per filtri admin per stato
 *   - orders(brt_tracking_number): lookup tracking BRT per numero collo
 *   - wallet_movements(user_id, created_at): query movimenti utente ordinati per data
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function safeAddIndex(string $table, string|array $columns, string $indexName): void
    {
        try {
            Schema::table($table, function (Blueprint $t) use ($columns, $indexName) {
                $t->index($columns, $indexName);
            });
        } catch (\Throwable $e) {
            Log::info("Index {$indexName} on {$table}: skipped ({$e->getMessage()})");
        }
    }

    private function safeDropIndex(string $table, string $indexName): void
    {
        try {
            Schema::table($table, function (Blueprint $t) use ($indexName) {
                $t->dropIndex($indexName);
            });
        } catch (\Throwable $e) {
            Log::info("Drop index {$indexName}: skipped ({$e->getMessage()})");
        }
    }

    public function up(): void
    {
        // cart_user: ricerca frequente per (user_id, package_id) in CartController
        if (Schema::hasTable('cart_user')) {
            if (Schema::hasColumn('cart_user', 'user_id') && Schema::hasColumn('cart_user', 'package_id')) {
                $this->safeAddIndex('cart_user', ['user_id', 'package_id'], 'cart_user_user_package_idx');
            }
        }

        // orders: filtro per stato nella dashboard admin
        if (Schema::hasTable('orders')) {
            if (Schema::hasColumn('orders', 'status')) {
                $this->safeAddIndex('orders', 'status', 'orders_status_idx');
            }

            if (Schema::hasColumn('orders', 'brt_tracking_number')) {
                $this->safeAddIndex('orders', 'brt_tracking_number', 'orders_brt_tracking_number_idx');
            }
        }

        // wallet_movements: query movimenti utente ordinati per data
        if (Schema::hasTable('wallet_movements')) {
            if (Schema::hasColumn('wallet_movements', 'user_id') && Schema::hasColumn('wallet_movements', 'created_at')) {
                $this->safeAddIndex('wallet_movements', ['user_id', 'created_at'], 'wallet_movements_user_created_idx');
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('cart_user')) {
            $this->safeDropIndex('cart_user', 'cart_user_user_package_idx');
        }

        if (Schema::hasTable('orders')) {
            $this->safeDropIndex('orders', 'orders_status_idx');
            $this->safeDropIndex('orders', 'orders_brt_tracking_number_idx');
        }

        if (Schema::hasTable('wallet_movements')) {
            $this->safeDropIndex('wallet_movements', 'wallet_movements_user_created_idx');
        }
    }
};
