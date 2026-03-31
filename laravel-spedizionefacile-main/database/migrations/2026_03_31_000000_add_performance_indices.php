<?php
/**
 * FILE: 2026_03_31_000000_add_performance_indices.php
 * SCOPO: Aggiunge indici di performance sulle tabelle piu' interrogate.
 *
 * SICUREZZA:
 *   - Usa try-catch per ogni indice per evitare fallimenti se l'indice esiste gia'
 *   - Verifica l'esistenza delle tabelle prima di aggiungere indici
 *   - Nomi indici espliciti per facilitare il rollback
 *
 * INDICI AGGIUNTI:
 *   - orders(user_id, status)  — query ordini utente filtrati per stato
 *   - orders(created_at)       — query ordini per data
 *   - orders(brt_parcel_id)    — lookup BRT tracking
 *   - wallet_movements(user_id, status, type) — query movimenti wallet
 *   - users(referral_code)     — lookup codice referral (gia' unique, ma safety check)
 *   - coupons(code)            — lookup coupon (gia' unique, ma safety check)
 *   - locations(place_name, postal_code) — ricerca localita' per nome e CAP
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Aggiunge un indice in modo sicuro, ignorando errori se l'indice esiste gia'.
     */
    private function safeAddIndex(string $table, string|array $columns, string $indexName): void
    {
        try {
            Schema::table($table, function (Blueprint $t) use ($columns, $indexName) {
                $t->index($columns, $indexName);
            });
        } catch (\Throwable $e) {
            // L'indice esiste gia' o la colonna non esiste — log e prosegui
            Log::info("Index {$indexName} on {$table}: skipped ({$e->getMessage()})");
        }
    }

    /**
     * Rimuove un indice in modo sicuro, ignorando errori se non esiste.
     */
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
        // ── orders table ──────────────────────────────────────────
        if (Schema::hasTable('orders')) {
            if (Schema::hasColumn('orders', 'user_id') && Schema::hasColumn('orders', 'status')) {
                $this->safeAddIndex('orders', ['user_id', 'status'], 'orders_user_status_idx');
            }

            if (Schema::hasColumn('orders', 'created_at')) {
                $this->safeAddIndex('orders', 'created_at', 'orders_created_at_idx');
            }

            if (Schema::hasColumn('orders', 'brt_parcel_id')) {
                $this->safeAddIndex('orders', 'brt_parcel_id', 'orders_brt_parcel_idx');
            }
        }

        // ── wallet_movements table ────────────────────────────────
        if (Schema::hasTable('wallet_movements')) {
            $hasAll = Schema::hasColumn('wallet_movements', 'user_id')
                   && Schema::hasColumn('wallet_movements', 'status')
                   && Schema::hasColumn('wallet_movements', 'type');

            if ($hasAll) {
                $this->safeAddIndex('wallet_movements', ['user_id', 'status', 'type'], 'wallet_user_status_type_idx');
            }
        }

        // ── users table ───────────────────────────────────────────
        // referral_code ha gia' un indice unique dalla migration originale,
        // ma aggiungiamo un indice regolare come fallback se mancasse
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'referral_code')) {
            $this->safeAddIndex('users', 'referral_code', 'users_referral_code_idx');
        }

        // ── coupons table ─────────────────────────────────────────
        // code ha gia' un indice unique dalla migration originale,
        // ma aggiungiamo un indice regolare come fallback se mancasse
        if (Schema::hasTable('coupons') && Schema::hasColumn('coupons', 'code')) {
            $this->safeAddIndex('coupons', 'code', 'coupons_code_idx');
        }

        // ── locations table ───────────────────────────────────────
        // La tabella locations usa 'place_name' (non 'city') e 'postal_code'
        if (Schema::hasTable('locations')) {
            if (Schema::hasColumn('locations', 'place_name') && Schema::hasColumn('locations', 'postal_code')) {
                $this->safeAddIndex('locations', ['place_name', 'postal_code'], 'locations_city_postal_idx');
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            $this->safeDropIndex('orders', 'orders_user_status_idx');
            $this->safeDropIndex('orders', 'orders_created_at_idx');
            $this->safeDropIndex('orders', 'orders_brt_parcel_idx');
        }

        if (Schema::hasTable('wallet_movements')) {
            $this->safeDropIndex('wallet_movements', 'wallet_user_status_type_idx');
        }

        if (Schema::hasTable('users')) {
            $this->safeDropIndex('users', 'users_referral_code_idx');
        }

        if (Schema::hasTable('coupons')) {
            $this->safeDropIndex('coupons', 'coupons_code_idx');
        }

        if (Schema::hasTable('locations')) {
            $this->safeDropIndex('locations', 'locations_city_postal_idx');
        }
    }
};
