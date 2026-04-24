<?php

/**
 * MIDDLEWARE: AuthenticateProApiKey
 *
 * SCOPO:
 *   Autentica le richieste alle rotte /api/v1/* tramite header X-Pro-Api-Key.
 *   Verifica scope, aggiorna last_used_at, autentica l'utente Partner Pro associato.
 *
 * COME FUNZIONA:
 *   1. Legge header X-Pro-Api-Key
 *   2. Calcola SHA-256 e cerca su pro_api_keys.key_hash
 *   3. Verifica che la chiave non sia revocata
 *   4. Verifica che l'utente sia ancora Partner Pro attivo
 *   5. Se la rotta richiede uno scope (parametro), lo verifica
 *   6. Aggiorna last_used_at e autentica l'utente nel guard 'web'
 *
 * USO ROTTE:
 *   Route::middleware('pro.api:shipments:read')->get(...)
 *   Route::middleware('pro.api:shipments:write')->post(...)
 *
 * RISPOSTE ERRORE:
 *   - 401: chiave mancante / non valida / revocata
 *   - 403: scope insufficiente
 */

namespace App\Http\Middleware;

use App\Models\ProApiKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateProApiKey
{
    public function handle(Request $request, Closure $next, ?string $requiredScope = null): Response
    {
        $plaintext = $request->header('X-Pro-Api-Key');

        if (empty($plaintext)) {
            return response()->json([
                'message' => 'Chiave API mancante. Includi header X-Pro-Api-Key.',
            ], 401);
        }

        $hash = ProApiKey::hash($plaintext);

        $apiKey = ProApiKey::where('key_hash', $hash)
            ->whereNull('revoked_at')
            ->with('user')
            ->first();

        if (! $apiKey) {
            return response()->json([
                'message' => 'Chiave API non valida o revocata.',
            ], 401);
        }

        $user = $apiKey->user;

        if (! $user || $user->trashed() || ! $user->isPro()) {
            return response()->json([
                'message' => 'Utente non autorizzato all\'accesso Pro.',
            ], 401);
        }

        if ($requiredScope && ! $apiKey->hasScope($requiredScope)) {
            return response()->json([
                'message' => "Scope insufficiente. Richiesto: {$requiredScope}.",
            ], 403);
        }

        // Aggiorna last_used_at senza modificare updated_at (usa updateQuietly)
        $apiKey->forceFill(['last_used_at' => now()])->saveQuietly();

        // Autentica l'utente per le successive chiamate auth()->user()
        auth()->setUser($user);

        // Espone la chiave usata nel request per eventuale logging downstream
        $request->attributes->set('pro_api_key', $apiKey);

        return $next($request);
    }
}
