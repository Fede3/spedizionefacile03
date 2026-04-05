<?php

/**
 * COMANDO ARTISAN: SINCRONIZZAZIONE TRACKING BRT (SyncBrtTracking)
 *
 * Questo comando si lancia dal terminale con:
 *   php artisan orders:sync-tracking
 *
 * Interroga le API BRT per aggiornare automaticamente lo stato degli ordini
 * che sono in transito (in_transit) o in lavorazione (processing).
 *
 * Viene schedulato ogni ora in routes/console.php.
 *
 * Opzioni:
 * --order=ID : Sincronizza solo un ordine specifico
 * --dry-run  : Mostra cosa cambierebbe senza aggiornare il DB
 *
 * Collegamento con altri file:
 * - app/Services/BrtService.php: metodo getTrackingStatus() per interrogare BRT
 * - app/Models/Order.php: modello ordine con costanti di stato
 * - routes/console.php: scheduling automatico
 */

namespace App\Console\Commands;

use App\Events\ShipmentStatusChanged;
use App\Models\Order;
use App\Services\Brt\TrackingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncBrtTracking extends Command
{
    protected $signature = 'orders:sync-tracking
        {--order= : Sincronizza solo un ordine specifico}
        {--dry-run : Mostra le modifiche senza applicarle}';

    protected $description = 'Sincronizza lo stato degli ordini con il tracking BRT';

    public function handle(TrackingService $brt): int
    {
        $dryRun = $this->option('dry-run');
        $specificOrderId = $this->option('order');

        // Recupera gli ordini da sincronizzare:
        // - in_transit o processing (stati "attivi")
        // - con un riferimento BRT (altrimenti non possiamo interrogare)
        $query = Order::whereIn('status', [Order::IN_TRANSIT, Order::PROCESSING, Order::LABEL_GENERATED, Order::OUT_FOR_DELIVERY])
            ->where(function ($q) {
                $q->whereNotNull('brt_numeric_sender_reference')
                    ->orWhereNotNull('brt_parcel_id');
            });

        if ($specificOrderId) {
            $query->where('id', $specificOrderId);
        }

        $orders = $query->get();

        if ($orders->isEmpty()) {
            $this->info('Nessun ordine attivo da sincronizzare.');

            return self::SUCCESS;
        }

        $this->info("Trovati {$orders->count()} ordini da sincronizzare.");
        $updated = 0;
        $errors = 0;

        foreach ($orders as $order) {
            $result = $brt->getTrackingStatus($order);

            if ($result['error']) {
                $this->warn("Ordine #{$order->id}: errore - {$result['error']}");
                $errors++;

                continue;
            }

            if (! $result['status']) {
                $this->line("Ordine #{$order->id}: nessun cambiamento di stato (evento: {$result['brt_event']})");

                continue;
            }

            // Aggiorniamo solo se lo stato è diverso
            if ($result['status'] === $order->status) {
                $this->line("Ordine #{$order->id}: stato invariato ({$order->status})");

                continue;
            }

            $oldStatus = $order->status;
            $newStatus = $result['status'];

            if ($dryRun) {
                $this->info("[DRY-RUN] Ordine #{$order->id}: {$oldStatus} → {$newStatus} ({$result['description']})");
            } else {
                $order->status = $newStatus;
                $order->brt_last_tracking_check = now();
                $order->save();

                // Notifica l'utente del cambio stato via email
                ShipmentStatusChanged::dispatch($order, $oldStatus, $newStatus);

                Log::info('SyncBrtTracking: ordine aggiornato', [
                    'order_id' => $order->id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'brt_event' => $result['brt_event'],
                ]);

                $this->info("Ordine #{$order->id}: {$oldStatus} → {$newStatus} ({$result['description']})");
            }

            $updated++;
        }

        $this->newLine();
        $this->info("Completato: {$updated} aggiornati, {$errors} errori su {$orders->count()} ordini.");

        return self::SUCCESS;
    }
}
