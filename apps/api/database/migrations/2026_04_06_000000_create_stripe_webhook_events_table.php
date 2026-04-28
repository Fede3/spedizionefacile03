<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Crea la tabella stripe_webhook_events per idempotenza webhook.
     *
     * Ogni evento Stripe ha un ID univoco (es. evt_1234...). Quando Stripe
     * ritenta lo stesso webhook (timeout, errore di rete), l'ID evento
     * rimane lo stesso. Registrando gli ID processati, evitiamo di
     * rielaborare lo stesso evento e creare duplicati.
     */
    public function up(): void
    {
        Schema::create('stripe_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('stripe_event_id')->unique();
            $table->string('event_type')->index();
            $table->timestamp('processed_at')->useCurrent();
            $table->index('processed_at');
        });

        // Aggiunge un indice unico su ext_id nelle transactions per impedire
        // duplicati a livello database anche in caso di race condition.
        // ext_id puo' essere NULL (es. per transazioni bonifico senza ext_id),
        // quindi aggiungiamo solo l'indice senza usare ->change() (che richiede doctrine/dbal).
        if (! $this->hasIndex('transactions', 'transactions_ext_id_unique')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->unique('ext_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('stripe_webhook_events');

        if ($this->hasIndex('transactions', 'transactions_ext_id_unique')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->dropUnique('transactions_ext_id_unique');
            });
        }
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        try {
            $indexes = Schema::getIndexes($table);
            foreach ($indexes as $index) {
                if ($index['name'] === $indexName) {
                    return true;
                }
            }
        } catch (\Throwable) {
            // fallback: assume index doesn't exist
        }

        return false;
    }
};
