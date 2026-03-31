<?php
/**
 * FILE: NotificationController.php
 * SCOPO: Gestisce le notifiche in-app dell'utente e le preferenze di notifica.
 *
 * COSA ENTRA:
 *   - GET index: nessun parametro (usa auth()->id())
 *   - PATCH markRead: notification ID via route
 *   - PUT updatePreferences: referral_site_enabled, referral_email_enabled, referral_sms_enabled
 *
 * COSA ESCE:
 *   - JSON con lista notifiche, contatore non lette, preferenze
 *
 * CHIAMATO DA:
 *   - routes/api.php — GET /api/notifications, PATCH /api/notifications/{id}/read, etc.
 *   - nuxt: components/NotificationBell.vue (futuro), pages/account/impostazioni.vue
 *
 * EFFETTI COLLATERALI:
 *   - Database: aggiorna read_at su user_notifications
 *   - Database: crea/aggiorna record in user_notification_preferences
 */

namespace App\Http\Controllers;

use App\Models\UserNotification;
use App\Models\UserNotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Lista tutte le notifiche dell'utente, ordinate dalla più recente.
     * Paginata a 20 elementi per pagina.
     */
    public function index(): JsonResponse
    {
        $notifications = UserNotification::where('user_id', auth()->id())
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($notifications);
    }

    /**
     * Segna una singola notifica come letta.
     */
    public function markRead(UserNotification $notification): JsonResponse
    {
        if ($notification->user_id !== auth()->id()) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        $notification->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * Segna tutte le notifiche non lette dell'utente come lette.
     */
    public function markAllRead(): JsonResponse
    {
        UserNotification::where('user_id', auth()->id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * Restituisce il contatore delle notifiche non lette.
     */
    public function unreadCount(): JsonResponse
    {
        $count = UserNotification::where('user_id', auth()->id())
            ->whereNull('read_at')
            ->count();

        return response()->json(['unread_count' => $count]);
    }

    /**
     * Restituisce le preferenze di notifica dell'utente.
     * Se non esistono, restituisce i default (tutto abilitato per il sito).
     */
    public function preferences(): JsonResponse
    {
        $prefs = UserNotificationPreference::firstOrCreate(
            ['user_id' => auth()->id()],
            [
                'referral_site_enabled' => true,
                'referral_email_enabled' => false,
                'referral_sms_enabled' => false,
            ]
        );

        return response()->json(['data' => $prefs]);
    }

    /**
     * Aggiorna le preferenze di notifica dell'utente.
     * Per email e SMS, registra il timestamp di consenso (opt-in GDPR).
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'referral_site_enabled' => 'boolean',
            'referral_email_enabled' => 'boolean',
            'referral_sms_enabled' => 'boolean',
        ]);

        $prefs = UserNotificationPreference::firstOrCreate(
            ['user_id' => auth()->id()],
            [
                'referral_site_enabled' => true,
                'referral_email_enabled' => false,
                'referral_sms_enabled' => false,
            ]
        );

        // Traccia il momento di opt-in per GDPR compliance
        if (($data['referral_email_enabled'] ?? false) && !$prefs->referral_email_enabled) {
            $data['email_opt_in_at'] = now();
        }
        if (($data['referral_sms_enabled'] ?? false) && !$prefs->referral_sms_enabled) {
            $data['sms_opt_in_at'] = now();
        }

        $prefs->update($data);

        return response()->json(['success' => true, 'data' => $prefs->fresh()]);
    }
}
