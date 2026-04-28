<?php

/**
 * FILE: 2026_04_20_000000_encrypt_existing_stripe_account_ids.php
 * SCOPO: Cifra (at-rest) i valori gia' presenti in `users.stripe_account_id`
 *        e `users.customer_id`, storicamente salvati in plaintext.
 *
 * CONTESTO SICUREZZA — Sprint 6.1 BLOCKER GO-LIVE:
 *   I due campi sono segreti Stripe ad alto valore. Se il DB venisse esfiltrato
 *   (backup rubato, SQL injection, ex-dipendente, mis-config ambiente), un
 *   attaccante potrebbe mappare i nostri Partner Pro ai loro account Stripe
 *   reali. CVSS 7.5 (High). Il remediation prevede:
 *     1. Cast Eloquent 'encrypted' su entrambi i campi (App\Models\User).
 *     2. Questa migration: backfill dei valori esistenti.
 *
 * COSA FA:
 *   up():   Legge ogni riga users che ha stripe_account_id o customer_id non
 *           NULL, verifica che il valore sia effettivamente plaintext (non
 *           gia' cifrato) e lo aggiorna con la versione cifrata.
 *           L'aggiornamento usa il query builder RAW (DB::table) per bypassare
 *           il cast 'encrypted' del model e inserire il ciphertext letterale.
 *           Se si usasse User::save() con il cast attivo, Laravel ricifrerebbe
 *           il ciphertext (doppia cifratura = corruzione).
 *
 *   down(): Decifra i valori e li ripristina in plaintext. Necessaria per
 *           rollback di emergenza.
 *
 * SICUREZZA:
 *   - Transazione DB: aborta se qualcosa va storto.
 *   - Chunk 100 righe per evitare timeout o pressione memoria.
 *   - Idempotente: il check `isEncrypted()` evita doppia cifratura se la
 *     migration viene rieseguita per errore.
 *   - Nessun log dei valori (PII/segreti): logga solo il conteggio.
 *
 * PRE-REQUISITI:
 *   - APP_KEY impostata (altrimenti Crypt fallisce).
 *   - Backup del DB fatto (questa operazione e' reversibile con down() ma
 *     richiede comunque APP_KEY identica).
 *
 * ROLLBACK:
 *   php artisan migrate:rollback --step=1
 *   (richiede la stessa APP_KEY usata in up())
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Colonne da migrare. Ogni colonna viene processata indipendentemente.
     */
    private array $columns = ['stripe_account_id', 'customer_id'];

    /**
     * Cifra i valori plaintext esistenti.
     */
    public function up(): void
    {
        DB::transaction(function () {
            foreach ($this->columns as $column) {
                $this->encryptColumn($column);
            }
        });
    }

    /**
     * Decifra e ripristina il plaintext. Rollback di emergenza.
     */
    public function down(): void
    {
        DB::transaction(function () {
            foreach ($this->columns as $column) {
                $this->decryptColumn($column);
            }
        });
    }

    private function encryptColumn(string $column): void
    {
        $processed = 0;
        $skipped = 0;

        DB::table('users')
            ->select(['id', $column])
            ->whereNotNull($column)
            ->orderBy('id')
            ->chunkById(100, function ($rows) use ($column, &$processed, &$skipped) {
                foreach ($rows as $row) {
                    $value = $row->{$column};

                    if ($value === null || $value === '') {
                        continue;
                    }

                    // Idempotenza: se e' gia' cifrato, skip.
                    if ($this->isEncrypted($value)) {
                        $skipped++;
                        continue;
                    }

                    $ciphertext = Crypt::encryptString($value);

                    DB::table('users')
                        ->where('id', $row->id)
                        ->update([$column => $ciphertext]);

                    $processed++;
                }
            });

        Log::info('stripe-encryption: up() completata', [
            'column' => $column,
            'encrypted' => $processed,
            'skipped_already_encrypted' => $skipped,
        ]);
    }

    private function decryptColumn(string $column): void
    {
        $processed = 0;
        $skipped = 0;

        DB::table('users')
            ->select(['id', $column])
            ->whereNotNull($column)
            ->orderBy('id')
            ->chunkById(100, function ($rows) use ($column, &$processed, &$skipped) {
                foreach ($rows as $row) {
                    $value = $row->{$column};

                    if ($value === null || $value === '') {
                        continue;
                    }

                    if (! $this->isEncrypted($value)) {
                        // Gia' plaintext: nulla da fare.
                        $skipped++;
                        continue;
                    }

                    try {
                        $plaintext = Crypt::decryptString($value);
                    } catch (\Throwable $e) {
                        // Non interrompe tutto: logga e skippa la riga.
                        Log::warning('stripe-encryption: down() decrypt fallito', [
                            'user_id' => $row->id,
                            'column' => $column,
                            'error' => $e->getMessage(),
                        ]);
                        $skipped++;
                        continue;
                    }

                    DB::table('users')
                        ->where('id', $row->id)
                        ->update([$column => $plaintext]);

                    $processed++;
                }
            });

        Log::info('stripe-encryption: down() completata', [
            'column' => $column,
            'decrypted' => $processed,
            'skipped' => $skipped,
        ]);
    }

    /**
     * Rileva se un valore e' gia' nel formato ciphertext di Laravel.
     * Crypt::encryptString produce una stringa base64 di un JSON
     * {"iv":"...","value":"...","mac":"...","tag":"..."}. Proviamo a decodificare
     * e a decifrare; se riesce, il valore e' gia' cifrato.
     */
    private function isEncrypted(string $value): bool
    {
        // Heuristic veloce: stripe account id inizia per "acct_", customer id per "cus_".
        // Se il valore inizia cosi' e' certamente plaintext, evitiamo decryptString.
        if (str_starts_with($value, 'acct_') || str_starts_with($value, 'cus_')) {
            return false;
        }

        // Un payload cifrato Laravel e' base64; se non lo e' affatto, e' plaintext.
        $decoded = base64_decode($value, true);
        if ($decoded === false) {
            return false;
        }

        // Prova decrypt: se funziona e' cifrato, altrimenti plaintext generico.
        try {
            Crypt::decryptString($value);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }
};
