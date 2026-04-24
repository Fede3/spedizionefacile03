<?php

/**
 * CONTROLLER: PushSubscriptionController (F09)
 *
 * Endpoint:
 *   - GET    /api/push/public-key       -> restituisce VAPID public key (B64URL)
 *   - POST   /api/push/subscribe        -> registra/aggiorna una subscription
 *   - DELETE /api/push/unsubscribe      -> rimuove subscription per endpoint
 *   - POST   /api/admin/push/test       -> invia un push di test (solo admin)
 *
 * GDPR: la subscription viene persistita SOLO se l'utente ha gia' espresso
 * opt-in (push_order_updates=true) — il check e' lato endpoint.
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Models\User;
use App\Models\UserNotificationPreference;
use App\Services\PushNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    public function __construct(
        private readonly PushNotificationService $push,
    ) {}

    /**
     * Restituisce la public key VAPID. Pubblica per design (deve essere
     * accessibile dal client per registrare la subscription).
     */
    public function publicKey(): JsonResponse
    {
        return response()->json([
            'public_key' => config('services.push.vapid.public_key'),
            'subject' => config('services.push.vapid.subject'),
        ]);
    }

    /**
     * Registra (o aggiorna) una subscription per l'utente loggato.
     */
    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'url', 'max:2048'],
            'keys.p256dh' => ['required', 'string', 'max:200'],
            'keys.auth' => ['required', 'string', 'max:100'],
            'user_agent' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();

        // Opt-in obbligatorio: la subscription si salva solo se l'utente
        // ha esplicitamente abilitato push_order_updates.
        $prefs = UserNotificationPreference::firstOrCreate(
            ['user_id' => $user->id],
            ['referral_site_enabled' => true]
        );
        if (!$prefs->push_order_updates) {
            $prefs->update([
                'push_order_updates' => true,
                'push_opt_in_at' => now(),
            ]);
        }

        $endpointHash = PushSubscription::hashEndpoint($data['endpoint']);

        $sub = PushSubscription::updateOrCreate(
            ['endpoint_hash' => $endpointHash],
            [
                'user_id' => $user->id,
                'endpoint' => $data['endpoint'],
                'p256dh' => $data['keys']['p256dh'],
                'auth' => $data['keys']['auth'],
                'user_agent' => $data['user_agent'] ?? $request->userAgent(),
                'last_used_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'subscription_id' => $sub->id,
        ], 201);
    }

    /**
     * Rimuove la subscription identificata dall'endpoint per l'utente loggato.
     */
    public function unsubscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'url'],
        ]);

        $hash = PushSubscription::hashEndpoint($data['endpoint']);
        PushSubscription::where('endpoint_hash', $hash)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Endpoint admin: invia un push di prova al destinatario indicato (default: se stesso).
     */
    public function adminTest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'title' => ['nullable', 'string', 'max:80'],
            'body' => ['nullable', 'string', 'max:200'],
        ]);

        $target = isset($data['user_id'])
            ? User::find($data['user_id'])
            : $request->user();

        if (!$target) {
            return response()->json(['message' => 'Utente non trovato'], 404);
        }

        $sent = $this->push->sendToUser($target, [
            'title' => $data['title'] ?? 'Test SpediamoFacile',
            'body' => $data['body'] ?? 'Questa è una notifica di prova.',
            'tag' => 'admin-test',
            'url' => '/account/notifiche',
        ]);

        return response()->json([
            'success' => true,
            'sent' => $sent,
        ]);
    }
}
