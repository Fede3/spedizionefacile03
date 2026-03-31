<?php
/**
 * Admin Content Controller
 *
 * Manages site content visible to admins: contact messages, site settings,
 * and homepage image configuration (upload, positioning, viewport config).
 */

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContentController extends Controller
{
    // Mostra tutti i messaggi di contatto ricevuti dalla pagina "Contatti"
    public function contactMessages(): JsonResponse
    {
        $messages = ContactMessage::orderByDesc('created_at')->get();

        return response()->json(['data' => $messages]);
    }

    // Segna un messaggio di contatto come letto
    public function markContactMessageRead($id): JsonResponse
    {
        $msg = ContactMessage::findOrFail($id);
        $msg->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'data' => $msg->fresh(),
        ]);
    }

    // Mostra le impostazioni del sito (chiavi API, configurazioni, ecc.)
    public function settings(): JsonResponse
    {
        $keys = [
            'stripe_public_key', 'stripe_secret_key', 'stripe_webhook_secret',
            'brt_customer_id', 'brt_username', 'brt_password',
            'site_name', 'support_email', 'cod_surcharge',
        ];

        $settings = [];
        foreach ($keys as $key) {
            $settings[$key] = Setting::get($key, '');
        }

        return response()->json(['data' => $settings]);
    }

    // Aggiorna le impostazioni del sito
    // Accetta solo le chiavi autorizzate (per sicurezza)
    public function updateSettings(Request $request): JsonResponse
    {
        // Lista delle impostazioni che l'admin puo' modificare
        $allowed = [
            'stripe_public_key', 'stripe_secret_key', 'stripe_webhook_secret',
            'brt_customer_id', 'brt_username', 'brt_password',
            'site_name', 'support_email', 'cod_surcharge',
        ];

        $data = $request->only($allowed);

        $stripePublicKey = preg_replace('/\s+/', '', (string) ($data['stripe_public_key'] ?? ''));
        $stripeSecretKey = preg_replace('/\s+/', '', (string) ($data['stripe_secret_key'] ?? ''));
        $stripeWebhookSecret = preg_replace('/\s+/', '', (string) ($data['stripe_webhook_secret'] ?? ''));

        if ($stripePublicKey !== '' && ! preg_match('/^pk_(test|live)_[A-Za-z0-9]+$/', $stripePublicKey)) {
            return response()->json([
                'message' => 'Publishable Key non valida. Usa una chiave completa pk_test_... o pk_live_....',
            ], 422);
        }

        if ($stripeSecretKey !== '' && ! preg_match('/^sk_(test|live)_[A-Za-z0-9]+$/', $stripeSecretKey)) {
            return response()->json([
                'message' => 'Secret Key non valida. Usa una chiave completa sk_test_... o sk_live_....',
            ], 422);
        }

        if ($stripeWebhookSecret !== '' && ! preg_match('/^whsec_[A-Za-z0-9]+$/', $stripeWebhookSecret)) {
            return response()->json([
                'message' => 'Webhook Secret non valido. Usa il valore completo whsec_... fornito da Stripe.',
            ], 422);
        }

        $validated = validator($data, [
            'brt_customer_id' => ['nullable', 'string', 'max:255'],
            'brt_username' => ['nullable', 'string', 'max:255'],
            'brt_password' => ['nullable', 'string', 'max:255'],
            'site_name' => ['nullable', 'string', 'max:255'],
            'support_email' => ['nullable', 'email'],
            'cod_surcharge' => ['nullable', 'numeric', 'min:0'],
        ])->validate();

        foreach ($allowed as $key) {
            if (! array_key_exists($key, $data)) {
                continue;
            }

            $value = match ($key) {
                'stripe_public_key' => $stripePublicKey,
                'stripe_secret_key' => $stripeSecretKey,
                'stripe_webhook_secret' => $stripeWebhookSecret,
                default => (string) ($validated[$key] ?? $data[$key] ?? ''),
            };

            Setting::set($key, $value);
        }

        if (array_key_exists('stripe_public_key', $data)) {
            Setting::set('stripe_key', $stripePublicKey);
        }

        if (array_key_exists('stripe_secret_key', $data)) {
            Setting::set('stripe_secret', $stripeSecretKey);
        }

        return response()->json([
            'success' => true,
            'message' => 'Impostazioni aggiornate con successo.',
        ]);
    }

    // Upload immagine homepage
    public function uploadHomepageImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'config' => 'nullable',
            'desktop' => 'nullable|array',
            'mobile' => 'nullable|array',
        ]);

        if (
            !$request->hasFile('image') &&
            !$request->filled('config') &&
            !$request->has('desktop') &&
            !$request->has('mobile')
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Nessuna modifica da salvare.',
            ], 422);
        }

        $storedImageUrl = Setting::get('homepage_image_url', '');
        $currentConfig = $this->parseHomepageImageConfig(
            Setting::get('homepage_image_config', ''),
            $storedImageUrl ?: null
        );

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = 'homepage_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('attach', $filename, 'public');
            $currentConfig['image_url'] = '/storage/' . $path;
        }

        if ($request->filled('config')) {
            $rawConfig = $request->input('config');
            $decodedConfig = is_string($rawConfig) ? json_decode($rawConfig, true) : $rawConfig;

            if (!is_array($decodedConfig)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configurazione hero non valida.',
                ], 422);
            }

            if (array_key_exists('desktop', $decodedConfig)) {
                $currentConfig['desktop'] = $this->normalizeHomepageViewport(
                    is_array($decodedConfig['desktop']) ? $decodedConfig['desktop'] : [],
                    $currentConfig['desktop']
                );
            }

            if (array_key_exists('mobile', $decodedConfig)) {
                $currentConfig['mobile'] = $this->normalizeHomepageViewport(
                    is_array($decodedConfig['mobile']) ? $decodedConfig['mobile'] : [],
                    $currentConfig['mobile']
                );
            }
        }

        if ($request->has('desktop')) {
            $currentConfig['desktop'] = $this->normalizeHomepageViewport(
                is_array($request->input('desktop')) ? $request->input('desktop') : [],
                $currentConfig['desktop']
            );
        }

        if ($request->has('mobile')) {
            $currentConfig['mobile'] = $this->normalizeHomepageViewport(
                is_array($request->input('mobile')) ? $request->input('mobile') : [],
                $currentConfig['mobile']
            );
        }

        $currentConfig['updated_at'] = now()->toIso8601String();

        Setting::set('homepage_image_url', $currentConfig['image_url']);
        Setting::set('homepage_image_config', json_encode($currentConfig, JSON_UNESCAPED_SLASHES));

        return response()->json([
            'success' => true,
            'image_url' => $currentConfig['image_url'],
            'desktop' => $currentConfig['desktop'],
            'mobile' => $currentConfig['mobile'],
            'updated_at' => $currentConfig['updated_at'],
            'config' => $currentConfig,
            'message' => 'Immagine homepage aggiornata con successo.',
        ]);
    }

    // Recupera l'immagine homepage corrente
    public function getHomepageImage(): JsonResponse
    {
        $url = Setting::get('homepage_image_url', '');
        $config = $this->parseHomepageImageConfig(
            Setting::get('homepage_image_config', ''),
            $url ?: null
        );

        // Compatibilita' legacy: se per qualsiasi motivo i due setting divergono, prevale il setting storico.
        if ($url && $config['image_url'] !== $url) {
            $config['image_url'] = $url;
        }

        return response()->json([
            'image_url' => $config['image_url'],
            'desktop' => $config['desktop'],
            'mobile' => $config['mobile'],
            'updated_at' => $config['updated_at'],
            'config' => $config,
        ]);
    }

    private function defaultHomepageImageConfig(?string $imageUrl = null): array
    {
        return [
            'image_url' => $imageUrl ?: null,
            'desktop' => [
                'mode' => 'fill',
                'zoom' => 1.0,
                'x' => 0.0,
                'y' => 0.0,
            ],
            'mobile' => [
                'mode' => 'fill',
                'zoom' => 1.0,
                'x' => 0.0,
                'y' => 0.0,
            ],
            'updated_at' => now()->toIso8601String(),
        ];
    }

    private function normalizeHomepageViewport(array $input, array $fallback): array
    {
        $mode = in_array($input['mode'] ?? null, ['fill', 'fit', 'crop'], true)
            ? $input['mode']
            : ($fallback['mode'] ?? 'fill');

        $zoomRaw = is_numeric($input['zoom'] ?? null) ? (float) $input['zoom'] : (float) ($fallback['zoom'] ?? 1.0);
        $zoom = max(0.5, min(4.0, $zoomRaw));

        $xRaw = is_numeric($input['x'] ?? null) ? (float) $input['x'] : (float) ($fallback['x'] ?? 0.0);
        $yRaw = is_numeric($input['y'] ?? null) ? (float) $input['y'] : (float) ($fallback['y'] ?? 0.0);

        return [
            'mode' => $mode,
            'zoom' => round(max(0.5, min(4.0, $zoom)), 4),
            'x' => round(max(-500, min(500, $xRaw)), 2),
            'y' => round(max(-500, min(500, $yRaw)), 2),
        ];
    }

    private function parseHomepageImageConfig(?string $rawConfig, ?string $fallbackImageUrl = null): array
    {
        $base = $this->defaultHomepageImageConfig($fallbackImageUrl);

        if (!is_string($rawConfig) || trim($rawConfig) === '') {
            return $base;
        }

        $decoded = json_decode($rawConfig, true);
        if (!is_array($decoded)) {
            return $base;
        }

        return [
            'image_url' => is_string($decoded['image_url'] ?? null) && trim($decoded['image_url']) !== ''
                ? $decoded['image_url']
                : $base['image_url'],
            'desktop' => $this->normalizeHomepageViewport(
                is_array($decoded['desktop'] ?? null) ? $decoded['desktop'] : [],
                $base['desktop']
            ),
            'mobile' => $this->normalizeHomepageViewport(
                is_array($decoded['mobile'] ?? null) ? $decoded['mobile'] : [],
                $base['mobile']
            ),
            'updated_at' => is_string($decoded['updated_at'] ?? null) && trim($decoded['updated_at']) !== ''
                ? $decoded['updated_at']
                : $base['updated_at'],
        ];
    }
}
