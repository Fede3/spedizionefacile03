<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Aggiunge indici DB per query frequenti che oggi fanno SCAN completo.
 *
 * Query target ottimizzate:
 *   - Order::where('status', X)->count() → 8 chiamate per dashboard admin
 *   - Order::whereNotNull('brt_parcel_id') → list spedizioni con etichetta
 *   - Order::orderByDesc('created_at') → list ordini paginati
 *   - WalletMovement::where('user_id', $id)->where('status', 'confirmed') → wallet balance
 *   - ContactMessage::orderByDesc('created_at') → admin messaggi
 *
 * Pattern Postgres/MySQL: l'indice su una colonna spesso filtrata accelera count
 * e where da O(n) a O(log n). user_id e brt_parcel_id hanno già foreign key index.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // status: filtrato in dashboard admin + lista ordini admin/utente
            if (! $this->indexExists('orders', 'orders_status_index')) {
                $table->index('status');
            }
            // created_at: orderByDesc per paginazione ordini recenti
            if (! $this->indexExists('orders', 'orders_created_at_index')) {
                $table->index('created_at');
            }
        });

        Schema::table('wallet_movements', function (Blueprint $table) {
            // status confirmed/pending: filtrato per wallet balance
            if (! $this->indexExists('wallet_movements', 'wallet_movements_status_index')) {
                $table->index('status');
            }
        });

        Schema::table('contact_messages', function (Blueprint $table) {
            if (! $this->indexExists('contact_messages', 'contact_messages_created_at_index')) {
                $table->index('created_at');
            }
            // read_at IS NULL filter per badge notifiche admin
            if (! $this->indexExists('contact_messages', 'contact_messages_read_at_index')) {
                $table->index('read_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('wallet_movements', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });

        Schema::table('contact_messages', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
            $table->dropIndex(['read_at']);
        });
    }

    /** Helper per evitare errore se l'indice è già stato aggiunto manualmente in DB. */
    private function indexExists(string $table, string $indexName): bool
    {
        $connection = Schema::getConnection();
        $driver = $connection->getDriverName();

        if ($driver === 'pgsql') {
            $result = $connection->select(
                "SELECT 1 FROM pg_indexes WHERE tablename = ? AND indexname = ?",
                [$table, $indexName]
            );
            return ! empty($result);
        }

        if ($driver === 'mysql' || $driver === 'mariadb') {
            $result = $connection->select(
                "SHOW INDEX FROM `{$table}` WHERE Key_name = ?",
                [$indexName]
            );
            return ! empty($result);
        }

        if ($driver === 'sqlite') {
            $result = $connection->select(
                "SELECT name FROM sqlite_master WHERE type='index' AND name = ?",
                [$indexName]
            );
            return ! empty($result);
        }

        return false;
    }
};
