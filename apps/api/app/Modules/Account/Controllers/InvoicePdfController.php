<?php

/**
 * FILE: app/Http/Controllers/InvoicePdfController.php
 *
 * SCOPO: Espone i PDF fattura/ricevuta per:
 *   - utente proprietario dell'ordine     → GET /api/orders/{order}/invoice.pdf
 *   - amministratore (override owner)     → GET /api/admin/orders/{order}/invoice.pdf
 *
 * SICUREZZA:
 *   - Rotta utente: auth:sanctum + check user_id == order->user_id (oppure admin).
 *   - Rotta admin: auth:sanctum + middleware CheckAdmin (montato in routes/api/invoices.php).
 *   - Rate limit: 10 richieste/min per utente (configurato in routes/api/invoices.php).
 *
 * RESPONSE:
 *   - 200 application/pdf con Content-Disposition "inline" per visualizzazione browser.
 *   - 404 se ordine non trovato (Route Model Binding).
 *   - 403 se utente non autorizzato.
 *   - 500 se errore di generazione (logged via standard handler).
 */

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\Invoice\InvoicePdfGenerator;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class InvoicePdfController extends Controller
{
    public function __construct(
        private readonly InvoicePdfGenerator $generator,
    ) {}

    /**
     * Endpoint utente: scarica/visualizza la fattura del proprio ordine.
     * Route: GET /api/orders/{order}/invoice.pdf
     *
     * Owner check: l'utente autenticato deve essere il proprietario dell'ordine,
     * oppure deve avere ruolo admin (override consentito).
     */
    public function show(Request $request, Order $order): BinaryFileResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401, 'Utente non autenticato.');

        $isOwner = (int) $order->user_id === (int) $user->id;
        $isAdmin = (bool) ($user->is_admin ?? false);

        abort_unless($isOwner || $isAdmin, 403, 'Non sei autorizzato a vedere questa fattura.');

        return $this->stream($order);
    }

    /**
     * Endpoint admin: scarica/visualizza qualunque fattura.
     * Route: GET /api/admin/orders/{order}/invoice.pdf
     *
     * L'autorizzazione admin e' garantita dal middleware CheckAdmin
     * applicato a livello di route group (routes/api/invoices.php).
     */
    public function adminShow(Order $order): BinaryFileResponse
    {
        return $this->stream($order);
    }

    /**
     * Genera (se necessario) il PDF e lo restituisce come stream inline.
     * Cache HTTP no-store per evitare cache di documenti fiscali in proxy/CDN.
     */
    private function stream(Order $order): BinaryFileResponse
    {
        // Genera (idempotente) e ottieni il path relativo al disk configurato.
        $relativePath = $this->generator->generate($order);
        $disk = $this->generator->disk();

        // Risolvo il path assoluto sul filesystem locale per response()->file().
        $absolutePath = $disk->path($relativePath);
        $filename = basename($relativePath);

        return response()->file($absolutePath, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, private',
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
