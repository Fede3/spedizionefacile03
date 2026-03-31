<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Brt\ShipmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\ShipmentLabelMail;

class OrderManagementController extends Controller
{
    // Mostra la lista di tutti gli ordini con possibilita' di filtro e ricerca
    // Supporta filtro per stato e ricerca per ID ordine o dati utente
    public function orders(Request $request): JsonResponse
    {
        $query = Order::with([
            'user:id,name,surname,email,role,user_type',
            'packages',
            'transactions',
        ])->orderByDesc('created_at');

        // Filtro per stato (es. "completed", "pending", "in_transit")
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Ricerca per ID ordine, nome utente o email
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('id', $search)
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('surname', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        // Risultati paginati (20 per pagina) per non caricare troppi dati
        $orders = $query->paginate(20);

        return response()->json($orders);
    }

    // Cambia lo stato di un ordine (es. da "pending" a "completed")
    public function updateOrderStatus(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:pending,processing,completed,payment_failed,cancelled,payed,in_transit,delivered,in_giacenza'],
        ]);

        $oldStatus = $order->status;
        $order->update(['status' => $data['status']]);

        // Invia notifica email all'utente sul cambio di stato
        if ($oldStatus !== $data['status']) {
            event(new \App\Events\ShipmentStatusChanged($order, $oldStatus, $data['status']));
        }

        return response()->json([
            'success' => true,
            'message' => "Stato ordine aggiornato da '{$oldStatus}' a '{$data['status']}'.",
            'data' => $order->fresh(),
        ]);
    }

    // Mostra la lista delle spedizioni BRT (ordini che hanno un'etichetta BRT)
    // Supporta filtro per stato e ricerca
    public function shipments(Request $request): JsonResponse
    {
        // Escludiamo brt_label_base64 dalla query per performance (e' un campo molto grande)
        $query = Order::with('user:id,name,surname,email')
            ->select(['id', 'user_id', 'status', 'subtotal', 'brt_parcel_id', 'brt_numeric_sender_reference', 'brt_tracking_url', 'brt_pudo_id', 'is_cod', 'cod_amount', 'created_at', 'updated_at'])
            ->whereNotNull('brt_parcel_id')
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('brt_parcel_id', 'like', "%{$search}%")
                  ->orWhere('brt_numeric_sender_reference', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('surname', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $shipments = $query->paginate(20);

        return response()->json($shipments);
    }

    // Aggiorna o rimuove il punto PUDO associato a un ordine
    public function updateOrderPudo(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'pudo_id' => 'nullable|string|max:100',
            'pudo_name' => 'nullable|string|max:300',
            'pudo_address' => 'nullable|string|max:300',
            'pudo_city' => 'nullable|string|max:200',
            'pudo_zip' => 'nullable|string|max:10',
        ]);

        $order->update(['brt_pudo_id' => $data['pudo_id']]);

        return response()->json([
            'success' => true,
            'message' => $data['pudo_id']
                ? "Punto PUDO '{$data['pudo_id']}' impostato per ordine #{$order->id}."
                : "Punto PUDO rimosso dall'ordine #{$order->id}.",
            'data' => $order->fresh(),
        ]);
    }

    /**
     * regenerateLabel -- Rigenera manualmente l'etichetta BRT per un ordine.
     *
     * PERCHE': La generazione automatica puo' fallire (errore BRT, indirizzo non valido).
     *   L'admin puo' ritentare manualmente dopo aver corretto i dati.
     * COME LEGGERLO: 1) Verifica configurazione BRT  2) Prepara opzioni (contrassegno, PUDO)
     *   3) Chiama BrtService.createShipment()  4) Salva campi brt_*  5) Invia email etichetta
     * COME MODIFICARLO: Per passare opzioni extra a BRT, aggiungerle nell'array $options.
     * COSA EVITARE: Non chiamare su ordini gia' con etichetta senza prima eliminare la vecchia.
     */
    public function regenerateLabel(Order $order): JsonResponse
    {
        if (!config('services.brt.client_id')) {
            return response()->json([
                'success' => false,
                'message' => 'BRT non configurato. Verifica le credenziali nel file .env.',
            ], 422);
        }

        $brt = app(ShipmentService::class);

        $options = [];
        if ($order->is_cod && $order->cod_amount) {
            $options['is_cod'] = true;
            $options['cod_amount'] = $order->cod_amount;
        }
        if ($order->brt_pudo_id) {
            $options['pudo_id'] = $order->brt_pudo_id;
        }

        $result = $brt->createShipment($order, $options);

        if ($result['success']) {
            $order->brt_parcel_id = $result['parcel_id'];
            $order->brt_numeric_sender_reference = $result['numeric_sender_reference'];
            $order->brt_tracking_url = $result['tracking_url'];
            $order->brt_label_base64 = $result['label_base64'];
            $order->status = 'in_transit';
            $order->save();

            // Invia l'email con l'etichetta
            try {
                $order->loadMissing('user');
                if ($order->user && $order->user->email) {
                    Mail::to($order->user->email)->send(new ShipmentLabelMail($order));
                }
            } catch (\Exception $e) {
                Log::error('Failed to send BRT label email on regenerate', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Etichetta BRT rigenerata con successo.',
                'data' => [
                    'parcel_id' => $result['parcel_id'],
                    'tracking_url' => $result['tracking_url'],
                ],
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Generazione etichetta BRT fallita: ' . ($result['error'] ?? 'Errore sconosciuto'),
        ], 422);
    }
}
