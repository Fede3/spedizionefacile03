<?php

/**
 * COMANDO ARTISAN: SendSdiInvoices
 *
 * Genera e trasmette al provider SDI le fatture per ordini pagati che
 * hanno billing_data.type = "fattura" e non hanno ancora sdi_xml_path.
 *
 * Uso:
 *   php artisan invoices:sdi-send              → batch normale
 *   php artisan invoices:sdi-send --order=42   → ordine specifico (utile per test)
 *   php artisan invoices:sdi-send --force      → rigenera anche se già presente
 *
 * SCHEDULING CONSIGLIATO (routes/console.php):
 *   Schedule::command('invoices:sdi-send')->hourlyAt(15);
 *
 * SICUREZZA:
 *   Lock file via withoutOverlapping() per evitare esecuzioni concorrenti.
 */

namespace App\Console\Commands;

use App\Models\Order;
use App\Services\Sdi\SdiService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendSdiInvoices extends Command
{
    protected $signature = 'invoices:sdi-send
        {--order= : Processa solo un ordine}
        {--force : Rigenera XML anche se presente}
        {--limit=50 : Numero massimo ordini batch}';

    protected $description = 'Genera XML FatturaPA e invia al provider SDI per gli ordini idonei';

    public function handle(SdiService $sdi): int
    {
        $orderId = $this->option('order');
        $force = (bool) $this->option('force');
        $limit = (int) ($this->option('limit') ?? 50);

        $query = Order::query()
            ->whereNotNull('billing_data')
            ->when(! $force, fn ($q) => $q->whereNull('sdi_xml_path'))
            ->when($orderId, fn ($q) => $q->where('id', $orderId))
            ->orderBy('id')
            ->limit($limit);

        $orders = $query->get();

        if ($orders->isEmpty()) {
            $this->info('Nessun ordine da processare.');

            return self::SUCCESS;
        }

        $this->info("Trovati {$orders->count()} ordini da processare.");

        $ok = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($orders as $order) {
            try {
                $result = $sdi->generateAndSend($order, $force);

                switch ($result->status) {
                    case 'pending':
                        if ($order->sdi_xml_path) {
                            $this->line("  • #{$order->id}: XML generato (pending). {$result->message}");
                            $ok++;
                        } else {
                            $this->warn("  • #{$order->id}: skip ({$result->message})");
                            $skipped++;
                        }
                        break;
                    case 'sent':
                        $this->info("  • #{$order->id}: inviato al provider (id={$result->transmissionId}).");
                        $ok++;
                        break;
                    case 'accepted':
                        $this->info("  • #{$order->id}: accettata da SDI.");
                        $ok++;
                        break;
                    case 'rejected':
                        $this->error("  • #{$order->id}: rigettata — {$result->message}");
                        $errors++;
                        break;
                    default:
                        $this->line("  • #{$order->id}: stato sconosciuto '{$result->status}'");
                }
            } catch (\Throwable $e) {
                $errors++;
                Log::error('SendSdiInvoices: errore ordine', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
                $this->error("  • #{$order->id}: eccezione — {$e->getMessage()}");
            }
        }

        $this->newLine();
        $this->info("Completato: {$ok} ok, {$skipped} saltati, {$errors} errori.");

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }
}
