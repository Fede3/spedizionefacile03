<?php

/**
 * FILE: Admin/AdminClaimController.php
 * SCOPO: API admin per gestione reclami (F03 — audit BRT 2026-04-18).
 *
 * ENDPOINT:
 *   - GET   /api/admin/claims                 — lista reclami con filtri (status, claim_type, search)
 *   - GET   /api/admin/claims/{id}            — dettaglio reclamo completo
 *   - PATCH /api/admin/claims/{id}            — aggiorna status e note risoluzione
 *   - POST  /api/admin/claims/{id}/reply      — invia risposta testuale al cliente
 *
 * SICUREZZA:
 *   - Middleware auth:sanctum + CheckAdmin applicato in routes/api/admin.php
 *   - Cambi di status verso resolved/rejected popolano resolved_at e scatenano
 *     ClaimResolvedMail al cliente.
 *   - Risposte via reply() loggano in audit_log (action = 'admin.claim.reply').
 */

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\ClaimResolvedMail;
use App\Mail\ClaimStatusUpdateMail;
use App\Models\Claim;
use App\Models\ClaimAttachment;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class AdminClaimController extends Controller
{
    /**
     * Lista paginata dei reclami con filtri opzionali.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', 'string', Rule::in(Claim::availableStatuses())],
            'claim_type' => ['nullable', 'string', Rule::in(Claim::availableTypes())],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);

        $query = Claim::query()
            ->with([
                'user:id,name,email',
                'order:id,status,brt_tracking_number',
                'attachments:id,claim_id,original_name,mime_type',
            ])
            ->orderByDesc('created_at');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['claim_type'])) {
            $query->where('claim_type', $filters['claim_type']);
        }

        if (! empty($filters['search'])) {
            $needle = trim($filters['search']);
            $query->where(function ($q) use ($needle) {
                $q->where('description', 'like', "%{$needle}%")
                    ->orWhere('id', (int) $needle)
                    ->orWhere('order_id', (int) $needle);
            });
        }

        $paginator = $query->paginate((int) ($filters['per_page'] ?? 20));

        return response()->json([
            'data' => $paginator->getCollection()->map(fn (Claim $claim) => $this->transform($claim))->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $claim = Claim::with([
            'user:id,name,email',
            'order',
            'attachments',
        ])->findOrFail($id);

        return response()->json([
            'data' => $this->transform($claim, detailed: true),
        ]);
    }

    /**
     * Aggiorna status e note di risoluzione.
     * Se lo status diventa resolved/rejected e prima non lo era, invia email al cliente.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(Claim::availableStatuses())],
            'resolution_notes' => ['nullable', 'string', 'max:5000'],
        ]);

        /** @var Claim $claim */
        $claim = Claim::findOrFail($id);

        $previousStatus = $claim->status;
        $claim->status = $data['status'];
        if (array_key_exists('resolution_notes', $data)) {
            $claim->resolution_notes = $data['resolution_notes'];
        }

        $isClosingState = in_array($data['status'], [Claim::STATUS_RESOLVED, Claim::STATUS_REJECTED], true);
        if ($isClosingState && $claim->resolved_at === null) {
            $claim->resolved_at = now();
        }

        $claim->save();

        $shouldNotify = $isClosingState && $previousStatus !== $data['status'];
        if ($shouldNotify) {
            try {
                $claim->loadMissing('user:id,email,name');
                if ($claim->user?->email) {
                    Mail::to($claim->user->email)->queue(new ClaimResolvedMail($claim));
                }
            } catch (\Throwable $e) {
                Log::warning('Claim resolved mail failed', [
                    'claim_id' => $claim->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $claim->load(['user:id,name,email', 'order', 'attachments']);

        // Audit log: ogni cambio di status su un reclamo e' tracciato.
        AuditLogService::log('admin.claim.update', $claim, [
            'from_status' => $previousStatus,
            'to_status' => $claim->status,
            'has_resolution_notes' => filled($claim->resolution_notes),
        ]);

        return response()->json([
            'data' => $this->transform($claim, detailed: true),
            'message' => 'Reclamo aggiornato.',
        ]);
    }

    /**
     * POST /api/admin/claims/{id}/reply
     * Invia una risposta testuale al cliente via email e scrive audit_log.
     * Non modifica lo status del reclamo: usare update() per farlo.
     */
    public function reply(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'min:5', 'max:5000'],
        ]);

        /** @var Claim $claim */
        $claim = Claim::with('user:id,name,email')->findOrFail($id);

        if (empty($claim->user?->email)) {
            return response()->json([
                'message' => 'Utente senza email: impossibile inviare la risposta.',
            ], 422);
        }

        try {
            Mail::to($claim->user->email)->queue(new ClaimStatusUpdateMail($claim, $data['message']));
        } catch (\Throwable $e) {
            Log::warning('Claim reply mail failed', [
                'claim_id' => $claim->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Errore invio email. Riprovare piu\' tardi.',
            ], 500);
        }

        // Audit log: la risposta inviata al cliente finisce nel registro.
        // Teniamo un estratto del messaggio (primi 500 char) per evitare payload enormi.
        AuditLogService::log('admin.claim.reply', $claim, [
            'recipient_email' => $claim->user->email,
            'message_excerpt' => mb_substr($data['message'], 0, 500),
            'message_length' => mb_strlen($data['message']),
        ]);

        return response()->json([
            'message' => 'Risposta inviata al cliente.',
            'data' => [
                'claim_id' => $claim->id,
                'recipient' => $claim->user->email,
                'sent_at' => now()->toIso8601String(),
            ],
        ]);
    }

    protected function transform(Claim $claim, bool $detailed = false): array
    {
        $attachments = $claim->attachments->map(function (ClaimAttachment $a) use ($claim) {
            return [
                'id' => $a->id,
                'original_name' => $a->original_name,
                'mime_type' => $a->mime_type,
                'size_bytes' => (int) $a->size_bytes,
                'is_image' => $a->isImage(),
                'download_url' => route('claims.attachment.download', [
                    'claim' => $claim->id,
                    'attachment' => $a->id,
                ]),
            ];
        })->values();

        $payload = [
            'id' => $claim->id,
            'order_id' => $claim->order_id,
            'claim_type' => $claim->claim_type,
            'claim_type_label' => $claim->typeLabel(),
            'status' => $claim->status,
            'status_label' => $claim->statusLabel(),
            'description' => $claim->description,
            'resolution_notes' => $claim->resolution_notes,
            'resolved_at' => $claim->resolved_at?->setTimezone('Europe/Rome')->format('d/m/Y H:i'),
            'created_at' => $claim->created_at?->setTimezone('Europe/Rome')->format('d/m/Y H:i'),
            'user' => $claim->user ? [
                'id' => $claim->user->id,
                'name' => $claim->user->name,
                'email' => $claim->user->email,
            ] : null,
            'attachments' => $attachments,
        ];

        if ($detailed && $claim->order) {
            $payload['order'] = [
                'id' => $claim->order->id,
                'status' => $claim->order->getStatus($claim->order->getRawOriginal('status') ?? $claim->order->status),
                'tracking_number' => $claim->order->brt_tracking_number ?? null,
            ];
        }

        return $payload;
    }
}
