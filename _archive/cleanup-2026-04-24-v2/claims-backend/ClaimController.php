<?php

/**
 * FILE: ClaimController.php
 * SCOPO: API utente per apertura e consultazione reclami (F03 — audit BRT 2026-04-18).
 *
 * ENDPOINT:
 *   - GET  /api/claims            — lista reclami utente
 *   - POST /api/claims            — apre nuovo reclamo (rate limit 3/min)
 *   - GET  /api/claims/{id}       — dettaglio reclamo
 *   - GET  /api/claims/{id}/attachments/{attachmentId} — scarica allegato privato
 *
 * VINCOLI UPLOAD:
 *   - Max 5 file per reclamo
 *   - Max 5 MB per file
 *   - MIME ammessi: image/* (jpg, png, webp, gif) oppure application/pdf
 *   - Storage: disk 'local' privato, path storage/app/private/claims/{claim_id}/
 *
 * SICUREZZA:
 *   - Tutte le route dietro auth:sanctum
 *   - Verifica ownership: l'utente può agire solo sui propri reclami/ordini
 *   - Download allegati: streaming con controllo ownership, mai url pubblico
 *
 * COLLEGAMENTI:
 *   - app/Models/Claim.php, app/Models/ClaimAttachment.php
 *   - app/Mail/ClaimOpenedMail.php, ClaimAdminNotificationMail.php
 *   - routes/api/claims.php
 */

namespace App\Http\Controllers;

use App\Mail\ClaimAdminNotificationMail;
use App\Mail\ClaimOpenedMail;
use App\Models\Claim;
use App\Models\ClaimAttachment;
use App\Models\Order;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ClaimController extends Controller
{
    public const MAX_FILES = 5;
    public const MAX_FILE_SIZE_KB = 5 * 1024; // 5 MB

    /**
     * Lista reclami dell'utente autenticato.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;

        $claims = Claim::query()
            ->where('user_id', $userId)
            ->with(['attachments:id,claim_id,original_name,mime_type,size_bytes', 'order:id,status'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $claims->map(fn (Claim $claim) => $this->transformClaim($claim))->values(),
        ]);
    }

    /**
     * Dettaglio singolo reclamo (solo se di proprietà dell'utente).
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $claim = Claim::query()
            ->with(['attachments', 'order:id,status,brt_tracking_number'])
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        return response()->json([
            'data' => $this->transformClaim($claim, includeOrder: true),
        ]);
    }

    /**
     * Crea un nuovo reclamo con allegati opzionali.
     * Rate-limited (3/min) a livello di route.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'order_id' => [
                'required', 'integer',
                Rule::exists('orders', 'id')->where(fn ($q) => $q->where('user_id', $user->id)),
            ],
            'claim_type' => ['required', 'string', Rule::in(Claim::availableTypes())],
            'description' => ['required', 'string', 'min:10', 'max:5000'],
            'attachments' => ['nullable', 'array', 'max:'.self::MAX_FILES],
            'attachments.*' => [
                'file',
                'mimetypes:image/jpeg,image/png,image/webp,image/gif,application/pdf',
                'max:'.self::MAX_FILE_SIZE_KB,
            ],
        ]);

        $order = Order::findOrFail($data['order_id']);

        $claim = DB::transaction(function () use ($data, $user, $order, $request) {
            /** @var Claim $claim */
            $claim = Claim::create([
                'user_id' => $user->id,
                'order_id' => $order->id,
                'claim_type' => $data['claim_type'],
                'description' => $data['description'],
                'status' => Claim::STATUS_OPEN,
            ]);

            if ($request->hasFile('attachments')) {
                $this->storeAttachments($claim, $request->file('attachments'));
            }

            return $claim;
        });

        // Notifiche email (best-effort: non blocchiamo la risposta in caso di errore mail)
        try {
            Mail::to($user->email)->queue(new ClaimOpenedMail($claim));
            $adminEmail = $this->resolveAdminEmail();
            if ($adminEmail) {
                Mail::to($adminEmail)->queue(new ClaimAdminNotificationMail($claim));
            }
        } catch (\Throwable $e) {
            Log::warning('Claim notification mail failed', [
                'claim_id' => $claim->id,
                'error' => $e->getMessage(),
            ]);
        }

        $claim->load(['attachments', 'order:id,status']);

        return response()->json([
            'data' => $this->transformClaim($claim, includeOrder: true),
            'message' => 'Reclamo inviato. Riceverai aggiornamenti via email.',
        ], 201);
    }

    /**
     * Download streaming di un allegato di reclamo.
     * Solo il proprietario o un admin possono accedere.
     */
    public function downloadAttachment(Request $request, int $claimId, int $attachmentId): StreamedResponse|JsonResponse
    {
        $user = $request->user();

        $claim = Claim::findOrFail($claimId);
        $isOwner = (int) $claim->user_id === (int) $user->id;
        $isAdmin = (bool) ($user->is_admin ?? false);

        if (! $isOwner && ! $isAdmin) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        /** @var ClaimAttachment $attachment */
        $attachment = ClaimAttachment::where('id', $attachmentId)
            ->where('claim_id', $claimId)
            ->firstOrFail();

        if (! Storage::disk('local')->exists($attachment->path)) {
            return response()->json(['message' => 'File non disponibile.'], 404);
        }

        return Storage::disk('local')->response(
            $attachment->path,
            $attachment->original_name ?: basename($attachment->path),
            [
                'Content-Type' => $attachment->mime_type,
            ],
        );
    }

    /**
     * Salva gli allegati in storage privato e crea i record ClaimAttachment.
     *
     * @param  array<int, \Illuminate\Http\UploadedFile>  $files
     */
    protected function storeAttachments(Claim $claim, array $files): void
    {
        foreach ($files as $file) {
            if (! $file || ! $file->isValid()) {
                continue;
            }

            $path = $file->store("claims/{$claim->id}", 'local');

            ClaimAttachment::create([
                'claim_id' => $claim->id,
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                'size_bytes' => $file->getSize() ?: 0,
            ]);
        }
    }

    /**
     * Ritorna l'email admin configurata nei Settings o il from di sistema.
     */
    protected function resolveAdminEmail(): ?string
    {
        $configured = trim((string) Setting::get('admin_notification_email', ''));
        if ($configured !== '') {
            return $configured;
        }

        $from = config('mail.from.address');

        return is_string($from) && $from !== '' ? $from : null;
    }

    /**
     * Trasforma un Claim in payload JSON coerente per il frontend.
     */
    protected function transformClaim(Claim $claim, bool $includeOrder = false): array
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
            'attachments' => $attachments,
        ];

        if ($includeOrder && $claim->relationLoaded('order') && $claim->order) {
            $payload['order'] = [
                'id' => $claim->order->id,
                'status' => $claim->order->getStatus($claim->order->getRawOriginal('status') ?? $claim->order->status),
                'tracking_number' => $claim->order->brt_tracking_number ?? null,
            ];
        }

        return $payload;
    }
}
