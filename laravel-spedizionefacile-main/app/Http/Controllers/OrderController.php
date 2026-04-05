<?php

/**
 * OrderController — CRUD ordini di spedizione, creazione diretta, annullamento.
 * Prezzi in centesimi. createDirectOrder() ricalcola server-side via PriceEngineService.
 * Annullamento delegato a RefundController.
 */

namespace App\Http\Controllers;

use App\Http\Requests\PackageStoreRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Package;
use App\Models\PackageAddress;
use App\Models\Service;
use App\Services\CheckoutSubmissionContextService;
use App\Services\InvoicePdfService;
use App\Services\PriceEngineService;
use App\Services\ShipmentServicePricingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class OrderController extends Controller
{
    use Traits\NormalizesServiceData;

    public function __construct(
        private readonly CheckoutSubmissionContextService $submissionContext,
    ) {}

    private function hydrateMissingOrderSubmissionContext(Order $order, array $incomingContext = []): void
    {
        $needsHydration = blank($order->client_submission_id)
            || blank($order->pricing_signature)
            || blank($order->pricing_snapshot)
            || blank($order->pricing_snapshot_version);

        if (! $needsHydration) {
            return;
        }

        $packages = $order->packages()->with(['originAddress', 'destinationAddress', 'service'])->get();
        if ($packages->isEmpty()) {
            return;
        }

        $contextSeed = [];
        $preferredSubmissionId = trim((string) ($order->client_submission_id ?: ($incomingContext['client_submission_id'] ?? '')));
        if ($preferredSubmissionId !== '') {
            $contextSeed['client_submission_id'] = $preferredSubmissionId;
        }

        $context = $this->submissionContext->enrich(
            $contextSeed,
            $this->submissionContext->snapshotFromPackages($packages),
            [
                'user_id' => (int) $order->user_id,
                'order_id' => (int) $order->id,
                'flow' => 'existing-order',
            ],
        );

        $updates = [];
        foreach (['client_submission_id', 'pricing_signature', 'pricing_snapshot_version', 'pricing_snapshot'] as $field) {
            if (blank($order->getAttribute($field))) {
                $updates[$field] = $context[$field];
            }
        }

        if ($updates !== []) {
            $order->forceFill($updates)->save();
        }
    }

    private function rotatePendingOrderSubmissionContext(Order $order): void
    {
        $packages = $order->packages()->with(['originAddress', 'destinationAddress', 'service'])->get();
        if ($packages->isEmpty()) {
            return;
        }

        $context = $this->submissionContext->enrich(
            [],
            $this->submissionContext->snapshotFromPackages($packages),
            [
                'user_id' => (int) $order->user_id,
                'order_id' => (int) $order->id,
                'flow' => 'pending-order-refresh',
                'previous_submission_id' => (string) ($order->client_submission_id ?? ''),
            ],
        );

        $order->forceFill([
            'client_submission_id' => $context['client_submission_id'],
            'pricing_signature' => $context['pricing_signature'],
            'pricing_snapshot_version' => $context['pricing_snapshot_version'],
            'pricing_snapshot' => $context['pricing_snapshot'],
        ])->save();
    }

    // Mostra la lista degli ordini
    // Se l'utente e' un amministratore, vede gli ordini di TUTTI gli utenti
    // Se e' un utente normale, vede solo i PROPRI ordini
    public function index(Request $request)
    {

        // Controllo dei permessi: verifica che l'utente possa vedere gli ordini
        Gate::authorize('viewAny', Order::class);

        $user = $request->user();

        // Specifichiamo quali dati collegati caricare insieme agli ordini
        // per evitare di fare troppe richieste al database
        $eagerLoad = [
            'packages.originAddress',       // Indirizzo di partenza di ogni pacco
            'packages.destinationAddress',   // Indirizzo di destinazione di ogni pacco
            'packages.service',              // Servizi aggiuntivi di ogni pacco
            'transactions',                  // Transazioni di pagamento dell'ordine
        ];

        if ($user->isAdmin()) {
            // L'admin vede anche i dati dell'utente che ha fatto l'ordine
            $eagerLoad[] = 'user';
            $orders = Order::with($eagerLoad)
                ->orderByDesc('created_at')
                ->get();
        } else {
            // L'utente normale vede solo i propri ordini
            $orders = Order::with($eagerLoad)
                ->where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->get();
        }

        return OrderResource::collection($orders);
    }

    // Mostra i dettagli di un singolo ordine
    public function show(Order $order)
    {

        // Controllo dei permessi: verifica che l'utente possa vedere questo ordine
        Gate::authorize('view', $order);

        // Carichiamo tutti i dati collegati all'ordine
        $order->load([
            'packages.originAddress',
            'packages.destinationAddress',
            'packages.service',
            'transactions',
        ]);

        return new OrderResource($order);
    }

    /**
     * createDirectOrder — Crea un ordine direttamente dalla pagina di riepilogo (senza carrello).
     *
     * PERCHE': Permette di creare un ordine in un solo passaggio, saltando il carrello.
     *   I prezzi vengono RICALCOLATI lato server per evitare manipolazioni dal frontend.
     * COME LEGGERLO: 1) Crea indirizzi  2) Crea servizi  3) Per ogni pacco: ricalcola prezzo
     *   (peso, volume, MAX dei due)  4) Controlla contrassegno e PUDO  5) Crea ordine + pivot
     * COME MODIFICARLO: Per aggiungere un servizio, inserirlo nel blocco $servicesData.
     *   Per cambiare le fasce prezzo, modificare i blocchi if/elseif per peso e volume.
     * COSA EVITARE: Non rimuovere il ricalcolo prezzi lato server — e' una misura di sicurezza.
     *   Non fidarsi MAI dei prezzi inviati dal frontend in questo metodo.
     */
    public function createDirectOrder(PackageStoreRequest $request)
    {
        $data = $request->validated();
        $userId = auth()->id();
        $priceEngine = app(PriceEngineService::class);
        $servicePricing = app(ShipmentServicePricingService::class);
        $servicesData = $this->normalizeServiceData($data['services'] ?? []);
        $serviceData = $servicesData['service_data'] ?? [];
        $capSupplementCents = $priceEngine->calculateCapSupplementCents(
            $data['origin_address']['postal_code'] ?? null,
            $data['destination_address']['postal_code'] ?? null,
        );

        $pricedPackages = [];
        $subtotalCents = 0;

        foreach ($data['packages'] as $packageData) {
            $weight = (float) preg_replace('/[^0-9.]/', '', $packageData['weight']);
            $s1 = (float) preg_replace('/[^0-9.]/', '', $packageData['first_size']);
            $s2 = (float) preg_replace('/[^0-9.]/', '', $packageData['second_size']);
            $s3 = (float) preg_replace('/[^0-9.]/', '', $packageData['third_size']);
            $weightPrice = $priceEngine->calculateBandPrice('weight', $weight);
            $volumePrice = $priceEngine->calculateBandPrice('volume', ($s1 / 100) * ($s2 / 100) * ($s3 / 100));
            $basePriceCents = max((int) round($weightPrice * 100), (int) round($volumePrice * 100)) + $capSupplementCents;
            $quantity = (int) ($packageData['quantity'] ?? 1);
            $singlePriceCents = $basePriceCents * $quantity;
            $subtotalCents += $singlePriceCents;

            $pricedPackages[] = [
                'package_type' => $packageData['package_type'],
                'quantity' => $quantity,
                'weight' => $packageData['weight'],
                'first_size' => $packageData['first_size'],
                'second_size' => $packageData['second_size'],
                'third_size' => $packageData['third_size'],
                'weight_price' => $weightPrice,
                'volume_price' => $volumePrice,
                'single_price' => $singlePriceCents,
                'single_price_cents' => $singlePriceCents,
            ];
        }

        $serviceType = $servicesData['service_type'] ?? '';
        $isCod = in_array('contrassegno', $servicePricing->normalizeSelectedServices($serviceType), true);
        $codAmount = $isCod ? $servicePricing->extractContrassegnoAmount($serviceData) : null;
        $serviceSurchargeCents = $servicePricing->calculateSurchargeCents(
            $serviceType,
            $serviceData,
            (bool) ($serviceData['sms_email_notification'] ?? false),
            [
                'packages' => $pricedPackages,
                'origin_address' => $data['origin_address'] ?? [],
                'destination_address' => (($data['delivery_mode'] ?? ($serviceData['delivery_mode'] ?? 'home')) === 'pudo' && ! empty($data['pudo']))
                    ? $data['pudo']
                    : ($data['destination_address'] ?? []),
                'delivery_mode' => $data['delivery_mode'] ?? ($serviceData['delivery_mode'] ?? 'home'),
                'selected_pudo' => $data['selected_pudo'] ?? $data['pudo'] ?? ($serviceData['pudo'] ?? null),
                'requires_manual_quote' => (bool) ($data['requires_manual_quote'] ?? $serviceData['requires_manual_quote'] ?? false),
            ],
        );

        $orderSubtotalCents = $subtotalCents + $serviceSurchargeCents;

        $pudoId = null;
        if (! empty($data['pudo']['pudo_id']) && ($data['delivery_mode'] ?? 'home') === 'pudo') {
            $pudoId = $data['pudo']['pudo_id'];
        }

        return DB::transaction(function () use (
            $data,
            $userId,
            $pricedPackages,
            $servicesData,
            $isCod,
            $codAmount,
            $pudoId,
            $orderSubtotalCents,
            $request,
        ) {
            DB::table('users')->where('id', $userId)->lockForUpdate()->first();

            $submissionContext = $this->submissionContext->enrich(
                $this->submissionContext->fromRequestArray($request->validated()),
                $this->submissionContext->snapshotFromDirectOrderPayload([
                    ...$data,
                    'packages' => $pricedPackages,
                    'services' => $servicesData,
                ], $orderSubtotalCents),
                [
                    'user_id' => $userId,
                    'flow' => 'direct-order',
                    'billing_data' => $data['billing_data'] ?? null,
                ],
            );

            $existingOrder = Order::query()
                ->where('user_id', $userId)
                ->where('client_submission_id', $submissionContext['client_submission_id'])
                ->first();

            if ($existingOrder) {
                $this->hydrateMissingOrderSubmissionContext($existingOrder, [
                    'client_submission_id' => $submissionContext['client_submission_id'],
                ]);
                $existingOrder->refresh();

                if (
                    filled($existingOrder->pricing_signature)
                    && $existingOrder->pricing_signature !== $submissionContext['pricing_signature']
                ) {
                    return response()->json(['error' => 'Contesto preventivo non coerente con l\'ordine.'], 422);
                }

                return response()->json([
                    'order_id' => $existingOrder->id,
                    'order_number' => 'SF-'.str_pad((string) $existingOrder->id, 6, '0', STR_PAD_LEFT),
                ]);
            }

            // Creiamo gli indirizzi di partenza e destinazione
            $origin = PackageAddress::create($data['origin_address']);
            $destination = PackageAddress::create($data['destination_address']);

            // Creiamo i servizi aggiuntivi
            $service = Service::create($servicesData);
            $packages = [];

            foreach ($pricedPackages as $packageData) {
                $packages[] = Package::create([
                    'package_type' => $packageData['package_type'],
                    'quantity' => $packageData['quantity'],
                    'weight' => $packageData['weight'],
                    'first_size' => $packageData['first_size'],
                    'second_size' => $packageData['second_size'],
                    'third_size' => $packageData['third_size'],
                    'weight_price' => $packageData['weight_price'],
                    'volume_price' => $packageData['volume_price'],
                    'single_price' => $packageData['single_price'],
                    'content_description' => $data['content_description'] ?? null,
                    'origin_address_id' => $origin->id,
                    'destination_address_id' => $destination->id,
                    'service_id' => $service->id,
                    'user_id' => $userId,
                ]);
            }

            // Creiamo l'ordine con il subtotale calcolato
            $order = Order::create([
                'user_id' => $userId,
                'subtotal' => $orderSubtotalCents,
                'status' => Order::PENDING, // In attesa di pagamento
                'is_cod' => $isCod,
                'cod_amount' => $codAmount > 0 ? $codAmount : null,
                'brt_pudo_id' => $pudoId,
                'client_submission_id' => $submissionContext['client_submission_id'],
                'pricing_signature' => $submissionContext['pricing_signature'],
                'pricing_snapshot_version' => $submissionContext['pricing_snapshot_version'],
                'pricing_snapshot' => $submissionContext['pricing_snapshot'],
            ]);

            // Colleghiamo i pacchi all'ordine tramite la tabella di relazione
            foreach ($packages as $package) {
                Order::attachPackage($order->id, $package->id, $package->quantity ?? 1);
            }

            return response()->json([
                'order_id' => $order->id,
                'order_number' => 'SF-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT),
            ]);
        });
    }

    /**
     * Annulla un ordine con eventuale rimborso.
     * Delega al RefundController che gestisce la logica completa di rimborso.
     *
     * Ordini non pagati (pending/payment_failed): annullamento semplice
     * Ordini pagati (completed/processing/in_transit): rimborso con commissione di 2 EUR
     */
    public function cancel(Request $request, Order $order)
    {
        $refundController = app(RefundController::class);

        return $refundController->requestCancellation($request, $order);
    }

    /**
     * addPackage — Aggiunge un collo a un ordine in attesa di pagamento.
     *
     * PERCHE': L'utente puo' aggiungere pacchi a un ordine non ancora pagato.
     *   Il prezzo viene ricalcolato lato server e il subtotale dell'ordine aggiornato.
     * COME LEGGERLO: 1) Verifica proprieta' e stato  2) Valida dati  3) Calcola prezzo (peso, volume)
     *   4) Riusa indirizzi e servizi dal primo pacco  5) Crea pacco + pivot  6) Ricalcola subtotale
     * COME MODIFICARLO: Per aggiungere campi al collo, aggiungerli in validate() e in Package::create().
     * COSA EVITARE: Non permettere aggiunte a ordini gia' pagati (il controllo status e' essenziale).
     */
    public function addPackage(Request $request, Order $order)
    {
        if ($order->user_id !== auth()->id()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        if (! in_array($order->status, [Order::PENDING, Order::PAYMENT_FAILED])) {
            return response()->json(['error' => 'Si possono aggiungere colli solo agli ordini in attesa di pagamento.'], 422);
        }

        $request->validate([
            'package_type' => 'required|string|max:50',
            'quantity' => 'required|integer|min:1|max:999',
            'weight' => 'required|numeric|min:0.1|max:9999',
            'first_size' => 'required|numeric|min:1|max:9999',
            'second_size' => 'required|numeric|min:1|max:9999',
            'third_size' => 'required|numeric|min:1|max:9999',
            'content_description' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($request, $order) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            $priceEngine = app(PriceEngineService::class);
            $servicePricing = app(ShipmentServicePricingService::class);
            $weight = (float) $request->weight;
            $s1 = (float) $request->first_size;
            $s2 = (float) $request->second_size;
            $s3 = (float) $request->third_size;

            // Prezzi calcolati dal motore centrale
            $weightPrice = $priceEngine->calculateBandPrice('weight', $weight);
            $vol = ($s1 / 100) * ($s2 / 100) * ($s3 / 100);
            $volumePrice = $priceEngine->calculateBandPrice('volume', $vol);

            $originCap = null;
            $destinationCap = null;
            $lockedOrder->loadMissing(['packages.originAddress', 'packages.destinationAddress']);
            /** @var Package|null $existingPackage */
            $existingPackage = $lockedOrder->packages->first();
            if ($existingPackage?->originAddress) {
                $originCap = $existingPackage->originAddress->postal_code ?? null;
            }
            if ($existingPackage?->destinationAddress) {
                $destinationCap = $existingPackage->destinationAddress->postal_code ?? null;
            }
            $capSupplementCents = $priceEngine->calculateCapSupplementCents($originCap, $destinationCap);

            $basePriceCents = max((int) round($weightPrice * 100), (int) round($volumePrice * 100)) + $capSupplementCents;
            $quantity = (int) $request->quantity;
            // Stay in integer cents throughout to avoid float drift.
            $singlePriceCents = $basePriceCents * $quantity;

            // Reuse origin/destination from existing packages
            $originId = $existingPackage?->origin_address_id;
            $destinationId = $existingPackage?->destination_address_id;
            $serviceId = $existingPackage?->service_id;

            $package = Package::create([
                'package_type' => $request->package_type,
                'quantity' => $quantity,
                'weight' => $request->weight,
                'first_size' => $request->first_size,
                'second_size' => $request->second_size,
                'third_size' => $request->third_size,
                'weight_price' => $weightPrice,
                'volume_price' => $volumePrice,
                'single_price' => $singlePriceCents,
                'content_description' => $request->content_description,
                'origin_address_id' => $originId,
                'destination_address_id' => $destinationId,
                'service_id' => $serviceId,
                'user_id' => auth()->id(),
            ]);

            Order::attachPackage($lockedOrder->id, $package->id, $quantity);

            // Recalculate subtotal
            $newSubtotal = DB::table('package_order')
                ->join('packages', 'package_order.package_id', '=', 'packages.id')
                ->where('package_order.order_id', $lockedOrder->id)
                ->sum('packages.single_price');

            $serviceModel = $existingPackage?->service;
            $serviceSurchargeCents = $serviceModel
                ? $servicePricing->calculateSurchargeCents(
                    $serviceModel->service_type ?? '',
                    $serviceModel->service_data ?? [],
                    (bool) (($serviceModel->service_data ?? [])['sms_email_notification'] ?? false),
                    [
                        'packages' => $lockedOrder->packages()->get()->all(),
                        'origin_address' => $existingPackage?->originAddress?->toArray() ?? [],
                        'destination_address' => (($serviceModel->service_data['delivery_mode'] ?? 'home') === 'pudo' && ! empty($serviceModel->service_data['pudo']))
                            ? $serviceModel->service_data['pudo']
                            : ($existingPackage?->destinationAddress?->toArray() ?? []),
                        'delivery_mode' => $serviceModel->service_data['delivery_mode'] ?? 'home',
                        'selected_pudo' => $serviceModel->service_data['pudo'] ?? null,
                        'requires_manual_quote' => (bool) ($serviceModel->service_data['requires_manual_quote'] ?? false),
                    ],
                )
                : 0;

            $lockedOrder->subtotal = (int) $newSubtotal + $serviceSurchargeCents;
            $lockedOrder->save();
            $this->rotatePendingOrderSubmissionContext($lockedOrder);

            return $package;
        });

        $order = $order->fresh();
        $order->load(['packages.originAddress', 'packages.destinationAddress', 'packages.service']);

        return response()->json([
            'success' => true,
            'message' => 'Collo aggiunto con successo.',
            'order' => new OrderResource($order),
        ]);
    }

    /**
     * invoice — Genera e scarica la ricevuta PDF di un ordine.
     *
     * PERCHE': L'utente puo' scaricare una ricevuta PDF per ogni ordine pagato.
     * COME LEGGERLO: 1) Verifica proprietario  2) Genera PDF via InvoicePdfService  3) Restituisce download
     * COSA EVITARE: Non permettere download di ricevute per ordini in stato "pending" (non ancora pagati).
     */
    public function invoice(Order $order, InvoicePdfService $invoicePdf)
    {
        // Verifica che l'utente possa accedere a questo ordine
        Gate::authorize('view', $order);

        // Genera il PDF
        $pdfContent = $invoicePdf->generate($order);

        $orderNumber = 'SF-' . str_pad((string) $order->id, 6, '0', STR_PAD_LEFT);

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="ricevuta-' . $orderNumber . '.pdf"',
            'Content-Length' => strlen($pdfContent),
        ]);
    }
}
