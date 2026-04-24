<?php

/**
 * FILE: NotificationController.php
 * SCOPO: Gestisce le notifiche in-app dell'utente e le preferenze di notifica
 *        (referral + SMS spedizione + Push).
 *
 * COSA ENTRA:
 *   - GET index: nessun parametro (usa auth()->id())
 *   - PATCH markRead: notification ID via route
 *   - PUT/PATCH updatePreferences: referral_*, sms_*, push_*, phone_number
 *
 * COSA ESCE:
 *   - JSON con lista notifiche, contatore non lette, preferenze
 *
 * CHIAMATO DA:
 *   - routes/api/community.php
 *   - frontend: pages/account/notifiche.vue
 *
 * EFFETTI COLLATERALI:
 *   - Database: aggiorna read_at su user_notifications
 *   - Database: crea/aggiorna user_notification_preferences
 *   - Database: aggiorna users.phone_number quando l'utente lo modifica
 *               dalla pagina notifiche (E.164 normalizzato via SmsService)
 */

namespace App\Http\Controllers;

use App\Models\UserNotification;
use App\Models\UserNotificationPreference;
// -- ARCHIVIATO 2026-04-24-v2 -- use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NotificationController extends Controller
{
    // -- ARCHIVIATO 2026-04-24-v2 -- SmsService archiviato: la normalizzazione numero
    // telefono resta inline (usata solo qui per salvare phone_number utente).
    // File archiviato in _archive/cleanup-2026-04-24-v2/sms-backend-service/

    /**
     * Normalizza un numero di telefono in formato E.164.
     * Ex: "333 1234567" -> "+393331234567". Restituisce null se non valido.
     * Copia locale della logica originariamente in SmsService::normalize().
     */
    private function normalizePhone(string $raw): ?string
    {
        $defaultCountry = (string) config('services.sms.default_country_code', '+39');
        $cleaned = preg_replace('/[\s\-().]/', '', trim($raw)) ?? '';
        if ($cleaned === '') {
            return null;
        }
        if (Str::startsWith($cleaned, '00')) {
            $cleaned = '+' . substr($cleaned, 2);
        }
        if (!Str::startsWith($cleaned, '+')) {
            $cleaned = ltrim($cleaned, '0');
            $cleaned = $defaultCountry . $cleaned;
        }
        if (!preg_match('/^\+\d{8,15}$/', $cleaned)) {
            return null;
        }
        return $cleaned;
    }

    /**
     * Lista tutte le notifiche dell'utente, ordinate dalla piu' recente.
     * Paginata a 20 elementi per pagina.
     */
    public function index(): JsonResponse
    {
        $notifications = UserNotification::where('user_id', auth()->id())
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($notifications);
    }

    public function markRead(UserNotification $notification): JsonResponse
    {
        if ($notification->user_id !== auth()->id()) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        $notification->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    public function markAllRead(): JsonResponse
    {
        UserNotification::where('user_id', auth()->id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    public function unreadCount(): JsonResponse
    {
        $count = UserNotification::where('user_id', auth()->id())
            ->whereNull('read_at')
            ->count();

        return response()->json(['unread_count' => $count]);
    }

    /**
     * Restituisce le preferenze + dati SMS dell'utente (numero E.164 + verifica).
     */
    public function preferences(): JsonResponse
    {
        $user = auth()->user();
        $prefs = UserNotificationPreference::firstOrCreate(
            ['user_id' => $user->id],
            [
                'referral_site_enabled' => true,
                'referral_email_enabled' => false,
                'referral_sms_enabled' => false,
                'sms_order_updates' => false,
                'sms_marketing' => false,
                'push_order_updates' => false,
                'push_marketing' => false,
            ]
        );

        return response()->json([
            'data' => array_merge($prefs->toArray(), [
                'phone_number' => $user->phone_number,
                'phone_number_verified_at' => $user->phone_number_verified_at,
                'sms_provider' => config('services.sms.driver', 'null'),
                // -- ARCHIVIATO 2026-04-20 -- 'push_configured' => (bool) config('services.push.vapid.public_key'),
                'push_configured' => false,
            ]),
        ]);
    }

    /**
     * Aggiorna le preferenze di notifica.
     * Accetta canali: referral_site/email/sms, sms_order_updates/marketing,
     * push_order_updates/marketing.
     * Accetta anche phone_number (E.164): viene normalizzato lato server.
     *
     * GDPR: registra timestamp opt-in al passaggio false->true per ogni canale.
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'referral_site_enabled' => 'sometimes|boolean',
            'referral_email_enabled' => 'sometimes|boolean',
            'referral_sms_enabled' => 'sometimes|boolean',
            'sms_order_updates' => 'sometimes|boolean',
            'sms_marketing' => 'sometimes|boolean',
            'push_order_updates' => 'sometimes|boolean',
            'push_marketing' => 'sometimes|boolean',
            'phone_number' => 'sometimes|nullable|string|max:32',
        ]);

        $user = $request->user();
        $prefs = UserNotificationPreference::firstOrCreate(
            ['user_id' => $user->id],
            ['referral_site_enabled' => true]
        );

        // Audit GDPR: traccia opt-in al primo true.
        $now = now();
        if (($data['referral_email_enabled'] ?? false) && !$prefs->referral_email_enabled) {
            $data['email_opt_in_at'] = $now;
        }
        if ((($data['referral_sms_enabled'] ?? false) || ($data['sms_order_updates'] ?? false) || ($data['sms_marketing'] ?? false))
            && !$prefs->sms_opt_in_at) {
            $data['sms_opt_in_at'] = $now;
        }
        if ((($data['push_order_updates'] ?? false) || ($data['push_marketing'] ?? false))
            && !$prefs->push_opt_in_at) {
            $data['push_opt_in_at'] = $now;
        }

        // Aggiorna phone_number sull'utente (non sulle prefs).
        if (array_key_exists('phone_number', $data)) {
            $rawPhone = $data['phone_number'];
            unset($data['phone_number']);
            if ($rawPhone === null || $rawPhone === '') {
                // L'utente vuole rimuovere il numero -> spegne anche SMS.
                $user->phone_number = null;
                $user->phone_number_verified_at = null;
                $user->save();
                $data['sms_order_updates'] = false;
                $data['sms_marketing'] = false;
                $data['referral_sms_enabled'] = false;
            } else {
                $normalized = $this->normalizePhone($rawPhone);
                if ($normalized === null) {
                    return response()->json([
                        'message' => 'Numero di telefono non valido. Usa formato +393331234567 o 333 1234567.',
                    ], 422);
                }
                $user->phone_number = $normalized;
                // Reset verifica se il numero cambia.
                $user->phone_number_verified_at = null;
                $user->save();
            }
        }

        $prefs->update($data);

        return response()->json([
            'success' => true,
            'data' => array_merge($prefs->fresh()->toArray(), [
                'phone_number' => $user->phone_number,
                'phone_number_verified_at' => $user->phone_number_verified_at,
            ]),
        ]);
    }
}
