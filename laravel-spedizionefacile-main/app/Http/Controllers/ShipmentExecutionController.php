<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\ShipmentExecutionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShipmentExecutionController extends Controller
{
    public function __construct(
        private readonly ShipmentExecutionService $execution,
    ) {}

    public function show(Order $order): JsonResponse
    {
        if ($order->user_id !== auth()->id() && ! auth()->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        return response()->json([
            'data' => $this->execution->getExecutionPayload($order),
        ]);
    }

    public function requestPickup(Request $request, Order $order): JsonResponse
    {
        if ($order->user_id !== auth()->id() && ! auth()->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        $payload = $request->validate([
            'pickup_request' => 'nullable|array',
            'pickup_request.enabled' => 'nullable|boolean',
            'pickup_request.time_slot' => 'nullable|string|max:50',
            'pickup_request.notes' => 'nullable|string|max:255',
        ]);

        $result = $this->execution->requestPickup($order, $payload['pickup_request'] ?? null);

        return response()->json([
            'success' => (bool) ($result['success'] ?? false),
            'data' => $this->execution->getExecutionPayload($order->fresh()),
            'message' => $result['error'] ?? 'Richiesta ritiro elaborata.',
        ], ($result['success'] ?? false) ? 200 : 422);
    }

    public function createBordero(Order $order): JsonResponse
    {
        if ($order->user_id !== auth()->id() && ! auth()->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        $result = $this->execution->createBordero($order);

        return response()->json([
            'success' => (bool) ($result['success'] ?? false),
            'data' => $this->execution->getExecutionPayload($order->fresh()),
            'bordero_reference' => $result['bordero_reference'] ?? null,
            'message' => $result['error'] ?? 'Bordero generato.',
        ], ($result['success'] ?? false) ? 200 : 422);
    }

    public function sendDocuments(Order $order): JsonResponse
    {
        if ($order->user_id !== auth()->id() && ! auth()->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        $result = $this->execution->sendDocuments($order);

        return response()->json([
            'success' => (bool) ($result['success'] ?? false),
            'data' => $this->execution->getExecutionPayload($order->fresh()),
            'dispatch' => $result,
        ], ($result['success'] ?? false) ? 200 : 422);
    }
}
