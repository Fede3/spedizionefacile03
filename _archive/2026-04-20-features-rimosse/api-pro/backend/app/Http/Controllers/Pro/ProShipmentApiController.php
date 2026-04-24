<?php

/**
 * FILE: Pro/ProShipmentApiController.php
 * SCOPO: Endpoint API v1 esposti tramite chiave Pro (header X-Pro-Api-Key).
 *
 * ENDPOINT:
 *   - GET  /api/v1/shipments               lista ordini utente (paginato)
 *   - POST /api/v1/shipments               crea nuova spedizione (basilare)
 *   - GET  /api/v1/shipments/{id}/tracking dettagli tracking di una spedizione
 *
 * AUTH: middleware 'pro.api' (verifica chiave + scope)
 * NOTA: per uso programmatico (es. integrazione gestionale del Partner).
 *
 * Documentazione OpenAPI: public/openapi.yaml (servita su /api/docs).
 * Le annotazioni @OA qui sotto sono ASCII-compatibili con l5-swagger
 * (darkaonline/l5-swagger) se in futuro verra' installato via composer.
 *
 * @OA\Info(
 *     title="SpediamoFacile API Pro",
 *     version="1.0.0",
 *     description="API Pro per Partner. Header richiesto: X-Pro-Api-Key."
 * )
 * @OA\SecurityScheme(
 *     securityScheme="ProApiKey",
 *     type="apiKey",
 *     in="header",
 *     name="X-Pro-Api-Key"
 * )
 */

namespace App\Http\Controllers\Pro;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Package;
use App\Models\PackageAddress;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProShipmentApiController extends Controller
{
    /**
     * GET /api/v1/shipments
     * Ritorna ordini paginati dell'utente associato alla chiave.
     *
     * @OA\Get(
     *     path="/api/v1/shipments",
     *     tags={"Spedizioni"},
     *     summary="Lista spedizioni del partner",
     *     security={{"ProApiKey":{"shipments:read"}}},
     *     @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", maximum=100)),
     *     @OA\Response(response=200, description="Elenco paginato")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 25), 100);

        $orders = Order::where('user_id', auth()->id())
            ->orderByDesc('created_at')
            ->paginate($perPage, [
                'id', 'status', 'subtotal', 'brt_tracking_number',
                'brt_parcel_id', 'created_at', 'updated_at',
            ]);

        return response()->json([
            'data' => $orders->items(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    /**
     * POST /api/v1/shipments
     * Crea una spedizione basilare. Stesso schema delle righe del bulk-upload.
     *
     * @OA\Post(
     *     path="/api/v1/shipments",
     *     tags={"Spedizioni"},
     *     summary="Crea una nuova spedizione",
     *     security={{"ProApiKey":{"shipments:write"}}},
     *     @OA\Response(response=201, description="Spedizione creata"),
     *     @OA\Response(response=422, description="Payload non valido")
     * )
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tipo_collo' => 'required|string|max:50',
            'peso_kg' => 'required|numeric|min:0.1|max:100',
            'lunghezza_cm' => 'required|numeric|min:1|max:120',
            'larghezza_cm' => 'required|numeric|min:1|max:120',
            'altezza_cm' => 'required|numeric|min:1|max:120',
            'origine_nome' => 'required|string|max:100',
            'origine_indirizzo' => 'required|string|max:200',
            'origine_cap' => ['required', 'regex:/^\d{5}$/'],
            'origine_citta' => 'required|string|max:100',
            'origine_provincia' => ['required', 'regex:/^[A-Za-z]{2}$/'],
            'destinazione_nome' => 'required|string|max:100',
            'destinazione_indirizzo' => 'required|string|max:200',
            'destinazione_cap' => ['required', 'regex:/^\d{5}$/'],
            'destinazione_citta' => 'required|string|max:100',
            'destinazione_provincia' => ['required', 'regex:/^[A-Za-z]{2}$/'],
            'destinazione_email' => 'nullable|email|max:150',
            'destinazione_telefono' => 'nullable|string|max:30',
            'contenuto' => 'nullable|string|max:200',
            'servizio' => 'nullable|string|max:50',
            'note' => 'nullable|string|max:500',
        ]);

        $userId = auth()->id();
        $priceCents = 590 + (int) round(50 * (float) $data['peso_kg']);

        try {
            DB::beginTransaction();

            $service = Service::create([
                'service_type' => $data['servizio'] ?? 'standard',
            ]);

            $originAddress = PackageAddress::create([
                'type' => 'privato',
                'name' => $data['origine_nome'],
                'address' => $data['origine_indirizzo'],
                'address_number' => 'snc',
                'number_type' => 'civico',
                'country' => 'Italia',
                'postal_code' => $data['origine_cap'],
                'city' => $data['origine_citta'],
                'province' => strtoupper($data['origine_provincia']),
                'telephone_number' => '0000000000',
            ]);

            $destAddress = PackageAddress::create([
                'type' => 'privato',
                'name' => $data['destinazione_nome'],
                'address' => $data['destinazione_indirizzo'],
                'address_number' => 'snc',
                'number_type' => 'civico',
                'country' => 'Italia',
                'postal_code' => $data['destinazione_cap'],
                'city' => $data['destinazione_citta'],
                'province' => strtoupper($data['destinazione_provincia']),
                'telephone_number' => $data['destinazione_telefono'] ?? '0000000000',
                'email' => $data['destinazione_email'] ?? null,
            ]);

            $package = Package::create([
                'user_id' => $userId,
                'package_type' => $data['tipo_collo'],
                'quantity' => 1,
                'weight' => (string) $data['peso_kg'],
                'first_size' => (string) $data['lunghezza_cm'],
                'second_size' => (string) $data['larghezza_cm'],
                'third_size' => (string) $data['altezza_cm'],
                'service_id' => $service->id,
                'origin_address_id' => $originAddress->id,
                'destination_address_id' => $destAddress->id,
                'single_price' => $priceCents,
            ]);

            $order = Order::create([
                'user_id' => $userId,
                'subtotal' => $priceCents,
                'status' => 'pending',
            ]);

            $order->packages()->attach($package->id);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'order_id' => $order->id,
                    'status' => $order->status,
                    'price_cents' => $priceCents,
                ],
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Errore creazione spedizione: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/shipments/{id}/tracking
     * Ritorna dati tracking BRT della spedizione (se disponibili).
     *
     * @OA\Get(
     *     path="/api/v1/shipments/{id}/tracking",
     *     tags={"Spedizioni"},
     *     summary="Tracking di una spedizione",
     *     security={{"ProApiKey":{"tracking:read"}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Dati tracking"),
     *     @OA\Response(response=404, description="Spedizione non trovata")
     * )
     */
    public function tracking(int $id): JsonResponse
    {
        $order = Order::where('user_id', auth()->id())
            ->where('id', $id)
            ->first();

        if (! $order) {
            return response()->json(['message' => 'Spedizione non trovata.'], 404);
        }

        return response()->json([
            'data' => [
                'order_id' => $order->id,
                'status' => $order->status,
                'tracking_number' => $order->brt_tracking_number ?? null,
                'parcel_id' => $order->brt_parcel_id ?? null,
                'last_tracking_check' => $order->brt_last_tracking_check ?? null,
                'created_at' => $order->created_at,
                'updated_at' => $order->updated_at,
            ],
        ]);
    }
}
