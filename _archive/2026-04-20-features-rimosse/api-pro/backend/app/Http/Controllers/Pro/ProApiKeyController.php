<?php

/**
 * FILE: Pro/ProApiKeyController.php
 * SCOPO: CRUD chiavi API per Partner Pro.
 *
 * ENDPOINT:
 *   - GET    /api/pro/api-keys         lista chiavi (senza plaintext, solo last_four)
 *   - POST   /api/pro/api-keys         crea nuova chiave (ritorna plaintext UNA SOLA VOLTA)
 *   - DELETE /api/pro/api-keys/{id}    revoca chiave (soft revoke)
 *
 * SCOPES VALIDI: shipments:read, shipments:write, tracking:read
 *
 * AUTH: solo Partner Pro
 */

namespace App\Http\Controllers\Pro;

use App\Http\Controllers\Controller;
use App\Models\ProApiKey;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProApiKeyController extends Controller
{
    public const VALID_SCOPES = [
        'shipments:read',
        'shipments:write',
        'tracking:read',
    ];

    public function index(): JsonResponse
    {
        $this->ensurePro();

        $keys = ProApiKey::where('user_id', auth()->id())
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'last_four', 'scopes', 'last_used_at', 'revoked_at', 'created_at']);

        return response()->json(['data' => $keys]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensurePro();

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'scopes' => 'required|array|min:1',
            'scopes.*' => ['required', 'string', 'in:' . implode(',', self::VALID_SCOPES)],
        ], [
            'name.required' => 'Il nome della chiave è obbligatorio.',
            'name.max' => 'Il nome non può superare 100 caratteri.',
            'scopes.required' => 'Seleziona almeno uno scope.',
            'scopes.array' => 'Formato scope non valido.',
            'scopes.min' => 'Seleziona almeno uno scope.',
            'scopes.*.in' => 'Scope non valido. Ammessi: ' . implode(', ', self::VALID_SCOPES),
        ]);

        // Limite ragionevole: max 10 chiavi attive per utente
        $activeCount = ProApiKey::where('user_id', auth()->id())
            ->whereNull('revoked_at')
            ->count();

        if ($activeCount >= 10) {
            return response()->json([
                'message' => 'Hai raggiunto il limite massimo di 10 chiavi attive. Revoca quelle non utilizzate.',
            ], 422);
        }

        $plaintext = ProApiKey::generatePlaintext();

        $apiKey = ProApiKey::create([
            'user_id' => auth()->id(),
            'name' => $data['name'],
            'key_hash' => ProApiKey::hash($plaintext),
            'last_four' => substr($plaintext, -4),
            'scopes' => array_values(array_unique($data['scopes'])),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Chiave creata. Copiala ora: non potrai più vederla.',
            'data' => [
                'id' => $apiKey->id,
                'name' => $apiKey->name,
                'last_four' => $apiKey->last_four,
                'scopes' => $apiKey->scopes,
                'created_at' => $apiKey->created_at,
                'plaintext' => $plaintext, // ESPOSTO UNA SOLA VOLTA
            ],
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->ensurePro();

        $apiKey = ProApiKey::where('user_id', auth()->id())
            ->where('id', $id)
            ->first();

        if (! $apiKey) {
            return response()->json(['message' => 'Chiave non trovata.'], 404);
        }

        if (! is_null($apiKey->revoked_at)) {
            return response()->json(['message' => 'Chiave già revocata.'], 422);
        }

        $apiKey->update(['revoked_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Chiave revocata con successo.',
        ]);
    }

    protected function ensurePro(): void
    {
        $user = auth()->user();
        if (! $user || ! $user->isPro()) {
            abort(403, 'Funzionalità riservata ai Partner Pro.');
        }
    }
}
