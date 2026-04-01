<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\Brt\ShipmentService;
use App\Services\Brt\PudoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BrtController extends Controller
{
    public function __construct(
        private readonly ShipmentService $shipment,
        private readonly PudoService $pudo,
    ) {}

    public function createShipment(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer',
            'is_cod' => 'nullable|boolean',
            'cod_amount' => 'nullable|integer|min:0',
            'pudo_id' => 'nullable|string',
            'notes' => 'nullable|string|max:255',
        ]);

        // Se contrassegno attivo, l'importo deve essere positivo
        if ($request->boolean('is_cod') && (int) $request->cod_amount <= 0) {
            return response()->json(['error' => 'L\'importo del contrassegno deve essere maggiore di zero.'], 422);
        }

        $order = Order::findOrFail($request->order_id);

        if ($order->user_id !== auth()->id() && !auth()->user()->isAdmin()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        $rawStatus = $order->getRawOriginal('status') ?? $order->getAttributes()['status'] ?? 'pending';
        if (!in_array($rawStatus, [Order::COMPLETED, 'completed', 'processing'])) {
            return response()->json(['error' => 'L\'ordine deve essere pagato prima di creare la spedizione BRT.'], 422);
        }

        if ($order->brt_parcel_id) {
            return response()->json(['error' => 'Spedizione BRT già creata per questo ordine.', 'parcel_id' => $order->brt_parcel_id, 'tracking_url' => $order->brt_tracking_url], 409);
        }

        $options = [
            'is_cod' => $request->boolean('is_cod'), 'cod_amount' => $request->cod_amount,
            'pudo_id' => $request->pudo_id, 'notes' => $request->notes,
        ];

        $result = null;
        for ($attempt = 1; $attempt <= 3; $attempt++) {
            try {
                $result = $this->shipment->createShipment($order, $options);
                if ($result['success']) break;
            } catch (\Exception $e) {
                Log::warning("BRT manual createShipment attempt {$attempt}/3 failed", ['order_id' => $order->id, 'error' => $e->getMessage()]);
                $result = ['success' => false, 'error' => $e->getMessage()];
            }
            if ($attempt < 3) sleep(1);
        }

        if (!$result['success']) {
            return response()->json(['error' => $result['error']], 502);
        }

        $this->saveBrtDataToOrder($order, $result, $request);
        $this->sendLabelEmail($order);

        return response()->json([
            'success' => true, 'parcel_id' => $result['parcel_id'],
            'tracking_number' => $result['tracking_number'] ?? null,
            'tracking_url' => $result['tracking_url'], 'order_status' => 'in_transit',
        ]);
    }

    public function confirmShipment(Request $request)
    {
        $request->validate(['order_id' => 'required|integer']);
        $order = Order::findOrFail($request->order_id);

        if ($order->user_id !== auth()->id() && !auth()->user()->isAdmin()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }
        if (!$order->brt_numeric_sender_reference) {
            return response()->json(['error' => 'Nessuna spedizione BRT trovata per questo ordine.'], 422);
        }

        $result = $this->shipment->confirmShipment((int) $order->brt_numeric_sender_reference);
        if (!$result['success']) return response()->json(['error' => $result['error']], 502);

        return response()->json(['success' => true]);
    }

    public function deleteShipment(Request $request)
    {
        $request->validate(['order_id' => 'required|integer']);
        $order = Order::findOrFail($request->order_id);

        if (!auth()->user()->isAdmin()) {
            return response()->json(['error' => 'Solo gli admin possono eliminare le spedizioni BRT.'], 403);
        }
        if (!$order->brt_numeric_sender_reference) {
            return response()->json(['error' => 'Nessuna spedizione BRT trovata per questo ordine.'], 422);
        }

        $result = $this->shipment->deleteShipment((int) $order->brt_numeric_sender_reference);
        if (!$result['success']) return response()->json(['error' => $result['error']], 502);

        $this->resetBrtData($order);

        return response()->json(['success' => true]);
    }

    public function downloadLabel(Order $order)
    {
        if ($order->user_id !== auth()->id() && !auth()->user()->isAdmin()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }
        if (!$order->brt_label_base64) {
            return response()->json(['error' => 'Nessuna etichetta trovata per questo ordine.'], 404);
        }

        return response(base64_decode($order->brt_label_base64), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="etichetta-brt-' . $order->id . '.pdf"');
    }

    public function tracking(Order $order)
    {
        if ($order->user_id !== auth()->id() && !auth()->user()->isAdmin()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }
        if (!$order->brt_parcel_id) {
            return response()->json(['error' => 'Nessuna spedizione BRT per questo ordine.'], 404);
        }

        return response()->json([
            'parcel_id' => $order->brt_parcel_id, 'tracking_number' => $order->brt_tracking_number,
            'tracking_url' => $order->brt_tracking_url, 'status' => $order->status,
            'departure_depot' => $order->brt_departure_depot, 'arrival_depot' => $order->brt_arrival_depot,
            'service_type' => $order->brt_service_type,
        ]);
    }

    public function publicTracking(Request $request)
    {
        $request->validate(['code' => 'required|string|max:100']);
        $code = trim($request->code);

        $order = Order::where('brt_parcel_id', $code)->first()
            ?? Order::where('brt_tracking_number', $code)->first()
            ?? Order::where('brt_numeric_sender_reference', $code)->first();

        if (!$order) {
            $cleanCode = preg_replace('/^(SF-|#|sf-)/i', '', $code);
            if (is_numeric($cleanCode)) {
                $order = Order::where('id', (int) $cleanCode)->whereNotNull('brt_parcel_id')->first();
            }
        }

        if (!$order) {
            return response()->json([
                'found' => false, 'message' => 'Nessuna spedizione trovata con il codice inserito.',
                'brt_tracking_url' => 'https://vas.brt.it/vas/sped_det_show.hsm?refnr=' . urlencode($code) . '&tiession=',
            ]);
        }

        $statusMap = [
            'pending' => ['label' => 'In attesa', 'description' => 'Ordine in attesa di pagamento.'],
            'processing' => ['label' => 'In lavorazione', 'description' => 'Pagamento ricevuto, preparazione in corso.'],
            'completed' => ['label' => 'Completato', 'description' => 'Ordine pagato, in attesa della generazione etichetta.'],
            'in_transit' => ['label' => 'In transito', 'description' => 'Il pacco e\' stato affidato al corriere BRT ed e\' in viaggio.'],
            'delivered' => ['label' => 'Consegnato', 'description' => 'Il pacco e\' stato consegnato.'],
            'in_giacenza' => ['label' => 'In giacenza', 'description' => 'Il pacco e\' in giacenza presso il corriere.'],
            'payment_failed' => ['label' => 'Pagamento fallito', 'description' => 'Il pagamento non e\' andato a buon fine.'],
            'cancelled' => ['label' => 'Annullato', 'description' => 'L\'ordine e\' stato annullato.'],
        ];

        $rawStatus = $order->getAttributes()['status'] ?? 'pending';
        $statusInfo = $statusMap[$rawStatus] ?? ['label' => $rawStatus, 'description' => ''];
        $trackingRef = $order->brt_tracking_number ?: $order->brt_parcel_id;
        $fallbackUrl = $trackingRef ? 'https://vas.brt.it/vas/sped_det_show.hsm?refnr=' . urlencode($trackingRef) . '&tiession=' : null;

        return response()->json([
            'found' => true, 'order_id' => $order->id,
            'status' => $statusInfo['label'], 'status_description' => $statusInfo['description'],
            'raw_status' => $rawStatus, 'brt_parcel_id' => $order->brt_parcel_id,
            'brt_tracking_number' => $order->brt_tracking_number,
            'brt_tracking_url' => $order->brt_tracking_url ?: $fallbackUrl,
            'created_at' => $order->created_at?->setTimezone('Europe/Rome')->format('d/m/Y H:i'),
        ]);
    }

    public function pudoSearch(Request $request)
    {
        $data = $request->validate([
            'address' => 'nullable|string', 'zip_code' => 'nullable|string|required_without:city',
            'city' => 'nullable|string|required_without:zip_code', 'country' => 'nullable|string',
            'max_results' => 'nullable|integer|min:1|max:50',
        ]);

        $zipCode = preg_replace('/\D/', '', (string) ($data['zip_code'] ?? ''));
        $city = trim((string) ($data['city'] ?? ''));

        if ($zipCode === '' && $city === '') {
            return response()->json(['success' => false, 'error' => "Inserisci almeno citta o CAP per cercare i punti PUDO."], 422);
        }

        $result = $this->pudo->getPudoByAddress(trim((string) ($data['address'] ?? '')), $zipCode, $city, $data['country'] ?? 'ITA', (int) ($data['max_results'] ?? 50));
        return response()->json($result);
    }

    public function pudoNearby(Request $request)
    {
        $request->validate(['latitude' => 'required|numeric', 'longitude' => 'required|numeric', 'max_results' => 'nullable|integer|min:1|max:50']);
        $result = $this->pudo->getPudoByCoordinates((float) $request->latitude, (float) $request->longitude, (int) ($request->max_results ?? 50));
        return response()->json($result);
    }

    public function pudoDetails(string $pudoId)
    {
        return response()->json($this->pudo->getPudoDetails($pudoId));
    }

    public function testCreate(Request $request)
    {
        $request->validate([
            'consignee_name' => 'required|string|max:255', 'consignee_address' => 'required|string|max:255',
            'consignee_city' => 'required|string|max:255', 'consignee_zip' => 'required|string|max:10',
            'consignee_province' => 'required|string|max:2', 'consignee_country' => 'required|string|max:2',
            'consignee_email' => 'nullable|email', 'consignee_phone' => 'nullable|string|max:20',
            'weight_kg' => 'required|integer|min:1', 'parcels' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:255',
        ]);

        return response()->json($this->shipment->testCreateShipment($request->all()));
    }

    private function saveBrtDataToOrder(Order $order, array $result, Request $request): void
    {
        $order->brt_parcel_id = $result['parcel_id'];
        $order->brt_numeric_sender_reference = $result['numeric_sender_reference'];
        $order->brt_tracking_url = $result['tracking_url'];
        $order->brt_label_base64 = $result['label_base64'];
        $order->brt_tracking_number = $result['tracking_number'] ?? null;
        $order->brt_parcel_number_to = $result['parcel_number_to'] ?? null;
        $order->brt_departure_depot = $result['departure_depot'] ?? null;
        $order->brt_arrival_terminal = $result['arrival_terminal'] ?? null;
        $order->brt_arrival_depot = $result['arrival_depot'] ?? null;
        $order->brt_delivery_zone = $result['delivery_zone'] ?? null;
        $order->brt_series_number = $result['series_number'] ?? null;
        $order->brt_service_type = $result['service_type'] ?? null;
        $order->brt_raw_response = $result['raw_response'] ?? null;
        $order->brt_pudo_id = $request->pudo_id;
        $order->is_cod = $request->boolean('is_cod');
        $order->cod_amount = $request->cod_amount;
        $order->brt_error = null;
        $order->status = 'in_transit';
        $order->save();
    }

    private function resetBrtData(Order $order): void
    {
        $brtFields = ['brt_parcel_id', 'brt_numeric_sender_reference', 'brt_tracking_url', 'brt_label_base64',
            'brt_tracking_number', 'brt_parcel_number_to', 'brt_departure_depot', 'brt_arrival_terminal',
            'brt_arrival_depot', 'brt_delivery_zone', 'brt_series_number', 'brt_service_type',
            'brt_raw_response', 'brt_error'];

        foreach ($brtFields as $field) {
            $order->{$field} = null;
        }
        $order->status = Order::COMPLETED;
        $order->save();
    }

    private function sendLabelEmail(Order $order): void
    {
        try {
            $order->loadMissing('user');
            if ($order->user && $order->user->email) {
                \Illuminate\Support\Facades\Mail::to($order->user->email)->send(new \App\Mail\ShipmentLabelMail($order));
            }
        } catch (\Exception $e) {
            Log::error('Failed to send BRT label email', ['order_id' => $order->id, 'error' => $e->getMessage()]);
        }
    }
}
