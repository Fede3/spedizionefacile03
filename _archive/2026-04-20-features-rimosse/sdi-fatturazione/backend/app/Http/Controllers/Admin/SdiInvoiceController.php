<?php

/**
 * CONTROLLER ADMIN: SdiInvoiceController
 *
 * Endpoint di gestione fatture elettroniche per l'area amministrativa.
 *
 * ROTTE (montate in routes/api/admin.php sotto auth:sanctum + CheckAdmin):
 *   GET    /api/admin/sdi/invoices                → lista ordini con stato SDI
 *   POST   /api/admin/sdi/invoices/{order}/generate  → genera/rigenera XML
 *   GET    /api/admin/sdi/invoices/{order}/download  → scarica XML FatturaPA
 *   GET    /api/admin/sdi/invoices/{order}/status   → stato corrente
 *
 * SICUREZZA:
 *   - Tutte le rotte sono protette da CheckAdmin.
 *   - Il download dell'XML è un file privato (storage "local"), non pubblicamente accessibile.
 */

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Sdi\SdiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SdiInvoiceController extends Controller
{
    public function __construct(
        private readonly SdiService $sdiService,
    ) {}

    /**
     * Lista paginata di ordini con campi SDI per il pannello admin.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Order::query()
            ->select([
                'id', 'user_id', 'status', 'subtotal', 'created_at',
                'billing_data', 'sdi_status', 'sdi_xml_path',
                'sdi_transmission_id', 'sdi_invoice_number',
                'sdi_sent_at', 'sdi_accepted_at', 'sdi_rejected_at',
                'sdi_last_error',
            ])
            ->with('user:id,name,surname,email')
            ->orderByDesc('created_at');

        if ($request->filled('sdi_status')) {
            $query->where('sdi_status', $request->input('sdi_status'));
        }

        // Solo ordini con fattura richiesta
        if ($request->boolean('only_invoice', true)) {
            $query->whereRaw("JSON_EXTRACT(billing_data, '$.type') = 'fattura'");
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Genera (o rigenera con ?force=1) l'XML FatturaPA per l'ordine.
     */
    public function generate(Request $request, Order $order): JsonResponse
    {
        $force = $request->boolean('force', false);
        $result = $this->sdiService->generateAndSend($order, $force);

        return response()->json([
            'order_id' => $order->id,
            'result' => $result->toArray(),
            'order' => $order->fresh()->only([
                'sdi_status', 'sdi_xml_path', 'sdi_transmission_id',
                'sdi_invoice_number', 'sdi_sent_at', 'sdi_accepted_at',
                'sdi_rejected_at', 'sdi_last_error',
            ]),
        ]);
    }

    /**
     * Download dell'XML FatturaPA salvato.
     */
    public function download(Order $order): StreamedResponse|JsonResponse
    {
        if (empty($order->sdi_xml_path) || ! Storage::disk('local')->exists($order->sdi_xml_path)) {
            return response()->json([
                'error' => 'XML non ancora generato per questo ordine.',
            ], 404);
        }

        $filename = basename($order->sdi_xml_path);

        return Storage::disk('local')->download($order->sdi_xml_path, $filename, [
            'Content-Type' => 'application/xml',
        ]);
    }

    /**
     * Stato SDI dell'ordine.
     */
    public function status(Order $order): JsonResponse
    {
        return response()->json([
            'order_id' => $order->id,
            'sdi_status' => $order->sdi_status,
            'sdi_transmission_id' => $order->sdi_transmission_id,
            'sdi_invoice_number' => $order->sdi_invoice_number,
            'sdi_sent_at' => $order->sdi_sent_at?->toIso8601String(),
            'sdi_accepted_at' => $order->sdi_accepted_at?->toIso8601String(),
            'sdi_rejected_at' => $order->sdi_rejected_at?->toIso8601String(),
            'sdi_last_error' => $order->sdi_last_error,
            'has_xml' => ! empty($order->sdi_xml_path),
        ]);
    }
}
