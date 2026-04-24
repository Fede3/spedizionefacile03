<?php

/**
 * COMMAND: vapid:generate
 *
 * Genera una nuova coppia di chiavi VAPID (P-256 ECDSA) per Web Push.
 *
 * USO:
 *   php artisan vapid:generate
 *   php artisan vapid:generate --append  (appende a .env.example)
 *
 * Stampa due righe da copiare in .env (non sovrascrive automaticamente):
 *   VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 *
 * REQUISITI:
 *   composer require minishlink/web-push
 *
 * SE LA LIBRERIA NON E' INSTALLATA:
 *   il comando esce con messaggio chiaro e codice 1 — nessun crash.
 */

namespace App\Console\Commands;

use Illuminate\Console\Command;

class VapidGenerateCommand extends Command
{
    protected $signature = 'vapid:generate {--append : Appendi le chiavi a .env.example}';

    protected $description = 'Genera una coppia di chiavi VAPID per Web Push notifications';

    public function handle(): int
    {
        if (!class_exists('Minishlink\\WebPush\\VAPID')) {
            $this->error('minishlink/web-push non installato.');
            $this->line('Esegui: composer require minishlink/web-push');
            return self::FAILURE;
        }

        $vapidClass = 'Minishlink\\WebPush\\VAPID';
        $keys = $vapidClass::createVapidKeys();

        $public = $keys['publicKey'];
        $private = $keys['privateKey'];

        $this->line('');
        $this->info('Chiavi VAPID generate. Copiale nel tuo file .env:');
        $this->line('');
        $this->line("VAPID_PUBLIC_KEY={$public}");
        $this->line("VAPID_PRIVATE_KEY={$private}");
        $this->line("VAPID_SUBJECT=mailto:supporto@spediamofacile.it");
        $this->line('');

        if ($this->option('append')) {
            $envExample = base_path('.env.example');
            if (!is_file($envExample)) {
                $this->warn(".env.example non trovato in {$envExample}");
                return self::SUCCESS;
            }
            $append = "\n# F09 Web Push (VAPID) - generate con php artisan vapid:generate\n"
                . "VAPID_PUBLIC_KEY={$public}\n"
                . "VAPID_PRIVATE_KEY={$private}\n"
                . "VAPID_SUBJECT=mailto:supporto@spediamofacile.it\n";
            file_put_contents($envExample, $append, FILE_APPEND);
            $this->info('Chiavi appese a .env.example. Copia manualmente in .env reale.');
        }

        $this->warn('IMPORTANTE: ruotare le chiavi invalida tutte le subscription esistenti.');
        return self::SUCCESS;
    }
}
