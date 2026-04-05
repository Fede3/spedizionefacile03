<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\ShipmentExecutionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

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

        $pickupTimeSlots = ['09:00-12:00', '09:00-18:00', '14:00-18:00'];
        $payload = $request->validate([
            'pickup_request' => 'nullable|array',
            'pickup_request.enabled' => 'nullable|boolean',
            'pickup_request.date' => [
                'nullable',
                'string',
                'max:20',
                function (string $attribute, mixed $value, \Closure $fail) use ($request): void {
                    $enabled = (bool) data_get($request->input('pickup_request', []), 'enabled', false);
                    $normalizedDate = $this->normalizePickupDateInput($value);

                    if ($normalizedDate === null) {
                        if ($enabled) {
                            $fail('La data ritiro non è valida.');
                        }

                        return;
                    }

                    if ($normalizedDate->isBefore(now()->startOfDay())) {
                        $fail('La data ritiro deve essere oggi o futura.');
                    }
                },
            ],
            'pickup_request.time_slot' => [
                'nullable',
                'string',
                'max:50',
                function (string $attribute, mixed $value, \Closure $fail) use ($request, $pickupTimeSlots): void {
                    $enabled = (bool) data_get($request->input('pickup_request', []), 'enabled', false);
                    $timeSlot = trim((string) ($value ?? ''));

                    if ($timeSlot === '') {
                        if ($enabled) {
                            $fail('Seleziona una fascia oraria valida.');
                        }

                        return;
                    }

                    if (! in_array($timeSlot, $pickupTimeSlots, true)) {
                        $fail('La fascia oraria selezionata non è valida.');
                    }
                },
            ],
            'pickup_request.notes' => 'nullable|string|max:255',
        ]);

        $result = $this->execution->requestPickup($order, $payload['pickup_request'] ?? null);
        $message = $result['error']
            ?? (($result['status'] ?? null) === 'not_requested'
                ? 'Ritiro segnato come non richiesto.'
                : 'Richiesta ritiro elaborata.');

        return response()->json([
            'success' => (bool) ($result['success'] ?? false),
            'data' => $this->execution->getExecutionPayload($order->fresh()),
            'message' => $message,
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

    public function downloadBordero(Request $request, Order $order)
    {
        if ($order->user_id !== auth()->id() && ! auth()->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        if (empty($order->bordero_document_base64)) {
            return response()->json(['message' => 'Bordero non disponibile.'], 404);
        }

        $contents = base64_decode((string) $order->bordero_document_base64, true);
        if ($contents === false || $contents === '') {
            return response()->json(['message' => 'Bordero non disponibile.'], 404);
        }

        $mime = $order->bordero_document_mime ?: 'application/pdf';
        $filename = $order->bordero_document_filename ?: sprintf('bordero-%s.%s', $order->id, $mime === 'application/pdf' ? 'pdf' : 'txt');
        $disposition = $request->boolean('inline') ? 'inline' : 'attachment';

        return response($contents, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
            'Content-Length' => (string) strlen($contents),
        ]);
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

    private function normalizePickupDateInput(mixed $value): ?Carbon
    {
        $input = trim((string) ($value ?? ''));
        if ($input === '') {
            return null;
        }

        try {
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $input)) {
                return Carbon::createFromFormat('Y-m-d', $input)->startOfDay();
            }

            if (preg_match('/^\d{1,2}\/\d{1,2}\/\d{4}$/', $input)) {
                return Carbon::createFromFormat('d/m/Y', $input)->startOfDay();
            }
        } catch (\Throwable) {
            return null;
        }

        return null;
    }
}
