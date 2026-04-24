<?php

/**
 * SERVICE: SdiService — pipeline fatturazione elettronica SDI.
 *
 * Orchestratore della fatturazione elettronica:
 *   1. Verifica che l'ordine sia pagato e abbia billing_data "fattura".
 *   2. Genera numero fattura progressivo (anno/seq).
 *   3. Costruisce XML FatturaPA via SdiXmlBuilder.
 *   4. Salva XML in storage privato (disk "local").
 *   5. Invia al provider configurato (NullSdiProvider di default).
 *   6. Crea record InvoiceArchive per conservazione decennale.
 *   7. Aggiorna campi sdi_* sull'ordine.
 *
 * IDEMPOTENZA:
 *   Se sdi_xml_path è già valorizzato, non rigenera a meno di $force=true.
 *
 * USO:
 *   $result = app(SdiService::class)->generateAndSend($order);
 *   → $result è SdiTransmissionResult (con status corrente).
 *
 * IL COMANDO CRON:
 *   app/Console/Commands/SendSdiInvoices.php chiama questo service in batch.
 */

namespace App\Services\Sdi;

use App\Models\InvoiceArchive;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SdiService
{
    public function __construct(
        private readonly SdiProviderInterface $provider,
        private readonly SdiXmlBuilder $xmlBuilder,
    ) {}

    /**
     * Genera e (se possibile) trasmette la fattura SDI per l'ordine.
     *
     * @param Order $order
     * @param bool $force Ri-genera anche se già presente
     * @return SdiTransmissionResult
     */
    public function generateAndSend(Order $order, bool $force = false): SdiTransmissionResult
    {
        if (! $this->shouldProcess($order)) {
            return SdiTransmissionResult::pending(
                'Ordine non idoneo alla fatturazione SDI (stato, pagamento o billing_data mancanti).'
            );
        }

        if (! $force && $order->sdi_xml_path && $order->sdi_status !== null) {
            // Già generato, non rigeneriamo
            return new SdiTransmissionResult(
                $order->sdi_status,
                $order->sdi_transmission_id,
                'XML già generato in precedenza.',
                $this->provider->name(),
            );
        }

        return DB::transaction(function () use ($order) {
            // Numero fattura progressivo
            $invoiceNumber = $order->sdi_invoice_number ?: $this->nextInvoiceNumber();
            $progressivoInvio = $this->buildProgressivoInvio($order->id);

            // Costruisci XML
            $xml = $this->xmlBuilder->build($order, $progressivoInvio, $invoiceNumber);
            if ($xml === '') {
                throw new \RuntimeException('Generazione XML FatturaPA fallita (risultato vuoto).');
            }

            // Salva XML su storage privato
            $path = $this->saveXml($order, $xml, $invoiceNumber);

            // Metadati per provider e archivio
            $metadata = [
                'invoice_number' => $invoiceNumber,
                'progressivo_invio' => $progressivoInvio,
                'total_cents' => (int) $order->getRawOriginal('subtotal'),
                'sha256' => hash('sha256', $xml),
                'billing' => $order->billing_data,
            ];

            // Trasmetti al provider
            $result = $this->provider->transmit($order, $xml, $metadata);

            // Aggiorna l'ordine
            $order->forceFill([
                'sdi_status' => $result->status,
                'sdi_xml_path' => $path,
                'sdi_transmission_id' => $result->transmissionId,
                'sdi_invoice_number' => $invoiceNumber,
                'sdi_sent_at' => $result->status === SdiTransmissionResult::STATUS_SENT ? now() : $order->sdi_sent_at,
                'sdi_accepted_at' => $result->status === SdiTransmissionResult::STATUS_ACCEPTED ? now() : $order->sdi_accepted_at,
                'sdi_rejected_at' => $result->status === SdiTransmissionResult::STATUS_REJECTED ? now() : $order->sdi_rejected_at,
                'sdi_last_error' => $result->status === SdiTransmissionResult::STATUS_REJECTED ? $result->message : null,
            ])->save();

            // Conservazione sostitutiva: crea record nell'archivio
            $this->archive($order, $path, $xml, $invoiceNumber, $metadata);

            Log::info('SDI: fattura generata', [
                'order_id' => $order->id,
                'invoice_number' => $invoiceNumber,
                'provider' => $this->provider->name(),
                'status' => $result->status,
            ]);

            return $result;
        });
    }

    /**
     * Verifica se l'ordine è idoneo alla fatturazione SDI.
     */
    private function shouldProcess(Order $order): bool
    {
        // Deve essere post-pagamento (escluso pending/payment_failed)
        if (! $order->isPostPaymentState()) {
            return false;
        }

        $billing = $order->billing_data;
        if (! is_array($billing) || empty($billing)) {
            return false;
        }

        // Deve essere stato scelto "fattura" al checkout
        $type = strtolower((string) ($billing['type'] ?? ''));

        return $type === 'fattura';
    }

    /**
     * Genera il numero fattura successivo in formato "ANNO/NNNNN".
     * Usa la sequenza su orders.sdi_invoice_number (anno corrente).
     */
    private function nextInvoiceNumber(): string
    {
        $year = now()->year;
        $prefix = $year.'/';

        // Cerca l'ultimo numero dell'anno
        $last = Order::whereNotNull('sdi_invoice_number')
            ->where('sdi_invoice_number', 'like', $prefix.'%')
            ->orderByDesc('sdi_invoice_number')
            ->value('sdi_invoice_number');

        $nextSeq = 1;
        if ($last) {
            $parts = explode('/', $last);
            $nextSeq = (int) ($parts[1] ?? 0) + 1;
        }

        return $prefix.str_pad((string) $nextSeq, 5, '0', STR_PAD_LEFT);
    }

    private function buildProgressivoInvio(int $orderId): string
    {
        // Max 10 char alfanumerici — usiamo base36 dell'ID ordine
        return strtoupper(base_convert((string) $orderId, 10, 36));
    }

    private function saveXml(Order $order, string $xml, string $invoiceNumber): string
    {
        $cedenteVat = config('services.sdi.cedente.vat_number', '00000000000');
        $safeInvoice = str_replace(['/', '\\'], '_', $invoiceNumber);
        $filename = sprintf('IT%s_%s.xml', $cedenteVat, $safeInvoice);
        $path = 'sdi/'.now()->format('Y/m').'/'.$filename;

        Storage::disk('local')->put($path, $xml);

        return $path;
    }

    private function archive(Order $order, string $path, string $xml, string $invoiceNumber, array $metadata): void
    {
        InvoiceArchive::updateOrCreate(
            [
                'order_id' => $order->id,
                'document_type' => InvoiceArchive::TYPE_FATTURA_SDI,
            ],
            [
                'file_path' => $path,
                'mime_type' => 'application/xml',
                'sha256_hash' => hash('sha256', $xml),
                'size_bytes' => strlen($xml),
                'invoice_number' => $invoiceNumber,
                'invoice_date' => ($order->created_at ?? now())->toDateString(),
                'archive_status' => InvoiceArchive::STATUS_PENDING,
                'provider' => $this->provider->name(),
                'retain_until' => Carbon::now()->addYears(10)->toDateString(),
                'metadata' => $metadata,
            ]
        );
    }
}
