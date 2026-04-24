<?php

/**
 * LISTENER: SendShipmentSmsNotification
 *
 * Invia un SMS transazionale all'utente proprietario dell'ordine quando
 * lo stato cambia (in modo speculare a SendShipmentStatusEmail, ma sul canale SMS).
 *
 * VINCOLI:
 *   - Solo se l'utente ha opt-in `sms_order_updates` = true.
 *   - Solo se ha un `phone_number` valorizzato (E.164).
 *   - Salta le transizioni "interne" gia' coperte (pending->processing,
 *     processing->in_transit) per evitare doppi messaggi vicini all'email.
 *   - Non lancia eccezioni: l'invio SMS e' best-effort.
 */

namespace App\Listeners;

use App\Events\ShipmentStatusChanged;
use App\Models\UserNotificationPreference;
// -- ARCHIVIATO 2026-04-20 -- use App\Services\PushNotificationService;
use App\Services\SmsService;
use Illuminate\Support\Facades\Log;

class SendShipmentSmsNotification
{
    public function __construct(
        private readonly SmsService $sms,
        // -- ARCHIVIATO 2026-04-20 -- private readonly PushNotificationService $push,
    ) {}

    public function handle(ShipmentStatusChanged $event): void
    {
        if ($event->oldStatus === $event->newStatus) {
            return;
        }

        // Stesse esclusioni dell'email per non duplicare due canali nello stesso passo.
        $excludedTransitions = [
            'pending_processing',
            'processing_in_transit',
        ];
        $transitionKey = $event->oldStatus . '_' . $event->newStatus;
        if (in_array($transitionKey, $excludedTransitions, true)) {
            return;
        }

        try {
            $event->order->loadMissing('user');
            $user = $event->order->user;
            if (!$user) {
                return;
            }

            $message = $this->messageFor($event->newStatus, $event->order);
            if ($message === null) {
                return; // stato non rilevante per SMS
            }

            $prefs = UserNotificationPreference::firstOrCreate(
                ['user_id' => $user->id],
                ['referral_site_enabled' => true]
            );

            // Canale SMS
            if ($prefs->sms_order_updates && !empty($user->phone_number)) {
                $this->sms->queue($user->phone_number, $message);
            }

            // -- ARCHIVIATO 2026-04-20 -- Canale Push (PWA) — riusa lo stesso messaggio breve.
            // -- ARCHIVIATO 2026-04-20 -- if ($prefs->push_order_updates) {
            // -- ARCHIVIATO 2026-04-20 --     $this->push->sendToUser($user, [
            // -- ARCHIVIATO 2026-04-20 --         'title' => 'Aggiornamento spedizione',
            // -- ARCHIVIATO 2026-04-20 --         'body' => $message,
            // -- ARCHIVIATO 2026-04-20 --         'tag' => 'order-' . $event->order->id,
            // -- ARCHIVIATO 2026-04-20 --         'url' => '/account/spedizioni/' . $event->order->id,
            // -- ARCHIVIATO 2026-04-20 --     ]);
            // -- ARCHIVIATO 2026-04-20 -- }
        } catch (\Throwable $e) {
            // Mai bloccare il flusso applicativo per un SMS/Push.
            Log::warning('[SMS/Push] dispatch fallito su ShipmentStatusChanged', [
                'order_id' => $event->order->id,
                'transition' => $transitionKey,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Mappa stato → testo SMS (max 160 char, tono neutro, italiano).
     * Se lo stato non e' rilevante restituisce null.
     */
    private function messageFor(string $newStatus, $order): ?string
    {
        $tracking = $order->brt_parcel_id
            ? "https://vas.brt.it/vas/sped_det_show.hsm?refnr={$order->brt_parcel_id}"
            : 'https://spediamofacile.it/account/spedizioni/' . $order->id;

        return match ($newStatus) {
            // Order ritirato (PickedUp)
            'picked_up', 'in_pickup' => "SpediamoFacile: il tuo pacco e' stato ritirato. Tracking: {$tracking}",
            // In transito (InTransit)
            'in_transit' => "SpediamoFacile: il tuo pacco e' in transito. Aggiornamenti su {$tracking}",
            // In consegna oggi (OutForDelivery)
            'out_for_delivery' => 'SpediamoFacile: il tuo pacco e\' in consegna oggi.',
            // Consegnato (Delivered)
            'delivered' => 'SpediamoFacile: pacco consegnato. Grazie per averci scelto!',
            // Eccezione / ritardo / giacenza
            'in_giacenza', 'returned', 'refused', 'exception', 'delay' =>
                'SpediamoFacile: problema sulla tua consegna. Contattaci per assistenza.',
            // Cambio stato reclamo
            'claim_open', 'claim_closed', 'claim_resolved' =>
                'SpediamoFacile: aggiornamento sul tuo reclamo. Dettagli nell\'area account.',
            default => null,
        };
    }
}
