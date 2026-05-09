<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * P1.1 — Middleware: blocca utenti Admin senza 2FA attivo.
 *
 * Se l'utente autenticato ha role='Admin' ma non ha completato il setup 2FA
 * (two_factor_confirmed_at IS NULL), restituisce 403 con codice 2FA_REQUIRED.
 *
 * Il frontend usa il codice '2FA_REQUIRED' per redirezionare alla pagina di
 * setup 2FA (/admin/2fa-setup) prima di permettere accesso ad altre rotte admin.
 *
 * Pensato per essere usato AFTER 'auth:sanctum' + 'admin' nello stack:
 *   Route::middleware(['auth:sanctum', 'admin', '2fa.required'])
 */
class RequireTwoFactor
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->role === 'Admin' && ! $user->hasTwoFactorEnabled()) {
            // Catch-22: senza 2FA non può accedere ad admin per attivarlo. Whitelist endpoint setup.
            $path = $request->path();
            $allowedWithoutTwoFactor = [
                'api/2fa/enable',
                'api/2fa/confirm',
                'api/2fa/recovery',
            ];
            $isAllowed = false;
            foreach ($allowedWithoutTwoFactor as $allowed) {
                if (str_starts_with($path, $allowed)) {
                    $isAllowed = true;
                    break;
                }
            }
            if (! $isAllowed) {
                return response()->json([
                    'message' => 'Configurazione 2FA richiesta per accedere agli endpoint amministratore. Attiva il 2FA dalle impostazioni di sicurezza.',
                    'code' => '2FA_REQUIRED',
                ], 403);
            }
        }

        return $next($request);
    }
}
