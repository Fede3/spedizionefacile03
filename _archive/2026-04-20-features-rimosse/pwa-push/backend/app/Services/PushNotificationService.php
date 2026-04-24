<?php

/**
 * SERVICE: PushNotificationService
 *
 * Invia Web Push notifications (VAPID) verso le subscription registrate
 * dai browser degli utenti (PushSubscription model).
 *
 * DIPENDENZA: minishlink/web-push (composer require minishlink/web-push).
 *   Se non installata, l'invio viene loggato e saltato (no-op) cosi' lo
 *   sviluppo locale non si rompe.
 *
 * USO:
 *   app(PushNotificationService::class)->sendToUser($user, [
 *       'title' => 'Spedizione consegnata',
 *       'body'  => 'Il tuo pacco e\' arrivato.',
 *       'url'   => '/account/spedizioni/123',
 *   ]);
 */

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Throwable;

class PushNotificationService
{
    public function __construct() {}

    /**
     * Invia push a TUTTE le subscription attive di un utente.
     * Restituisce numero di invii andati a buon fine.
     */
    public function sendToUser(User $user, array $payload): int
    {
        $subscriptions = $user->pushSubscriptions()->get();
        if ($subscriptions->isEmpty()) {
            return 0;
        }

        return $this->sendToSubscriptions($subscriptions->all(), $payload);
    }

    /**
     * Invia push a una lista di PushSubscription.
     * Le subscription scadute (HTTP 404/410) vengono eliminate dal DB.
     */
    public function sendToSubscriptions(array $subscriptions, array $payload): int
    {
        if (empty($subscriptions)) {
            return 0;
        }

        // Verifica configurazione VAPID minima.
        $publicKey = config('services.push.vapid.public_key');
        $privateKey = config('services.push.vapid.private_key');
        $subject = config('services.push.vapid.subject', 'mailto:supporto@spediamofacile.it');

        if (!$publicKey || !$privateKey) {
            Log::warning('[Push] VAPID non configurato, skip invio', [
                'subs' => count($subscriptions),
            ]);
            return 0;
        }

        // Se libreria non installata: log + skip senza errore.
        if (!class_exists('Minishlink\\WebPush\\WebPush')) {
            Log::info('[Push] minishlink/web-push non installato. Esegui: composer require minishlink/web-push', [
                'subs' => count($subscriptions),
            ]);
            return 0;
        }

        $sent = 0;
        try {
            // Lazy-instanziamento via FQCN per non rompere static analysis.
            $webPushClass = 'Minishlink\\WebPush\\WebPush';
            $subscriptionClass = 'Minishlink\\WebPush\\Subscription';

            $auth = [
                'VAPID' => [
                    'subject' => $subject,
                    'publicKey' => $publicKey,
                    'privateKey' => $privateKey,
                ],
            ];

            /** @var object $webPush */
            $webPush = new $webPushClass($auth, [], 30, []);

            $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            foreach ($subscriptions as $sub) {
                /** @var PushSubscription $sub */
                $subObj = $subscriptionClass::create($sub->toWebPushArray());
                $webPush->queueNotification($subObj, $body, [
                    'TTL' => (int) config('services.push.ttl', 86400),
                    'urgency' => 'normal',
                ]);
            }

            foreach ($webPush->flush() as $report) {
                /** @var object $report */
                if ($report->isSuccess()) {
                    $sent++;
                    continue;
                }
                // Subscription invalida -> rimuovi dal DB.
                $statusCode = method_exists($report, 'getResponse') && $report->getResponse()
                    ? $report->getResponse()->getStatusCode()
                    : null;
                $endpoint = method_exists($report, 'getEndpoint') ? $report->getEndpoint() : null;

                if ($endpoint && in_array($statusCode, [404, 410], true)) {
                    PushSubscription::where('endpoint_hash', PushSubscription::hashEndpoint($endpoint))->delete();
                    Log::info('[Push] subscription scaduta rimossa', ['endpoint' => $endpoint, 'status' => $statusCode]);
                } else {
                    Log::warning('[Push] invio fallito', [
                        'endpoint' => $endpoint,
                        'status' => $statusCode,
                        'reason' => method_exists($report, 'getReason') ? $report->getReason() : null,
                    ]);
                }
            }
        } catch (Throwable $e) {
            Log::error('[Push] errore generale', ['error' => $e->getMessage()]);
        }

        return $sent;
    }
}
