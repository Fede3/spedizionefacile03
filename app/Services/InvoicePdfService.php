<?php

/**
 * InvoicePdfService — Genera PDF ricevuta per un ordine di spedizione.
 * Endpoint: GET /api/orders/{id}/invoice (OrderController)
 * Prezzi in centesimi (890 = 8,90 EUR), IVA 22%.
 */

namespace App\Services;

use App\Models\Order;
use App\Services\Invoice\SinglePagePdfHelpers;

class InvoicePdfService
{
    use SinglePagePdfHelpers;

    private float $pageWidth = 595.0;   // A4 portrait width (pt)

    private float $pageHeight = 842.0;  // A4 portrait height (pt)

    private float $marginLeft = 50.0;

    private float $marginRight = 50.0;

    /**
     * Genera il contenuto PDF della fattura per un ordine.
     *
     * @return string Contenuto binario del PDF
     */
    public function generate(Order $order): string
    {
        $order->loadMissing([
            'user',
            'packages.originAddress',
            'packages.destinationAddress',
        ]);

        $ops = '';
        $y = 50.0; // posizione verticale corrente (dall'alto)

        // ── HEADER ──────────────────────────────────────────────
        $ops .= $this->drawText($this->pageWidth / 2, $y, 18, 'SpediamoFacile', 'F2', 'center');
        $y += 22;
        $ops .= $this->drawText($this->pageWidth / 2, $y, 10, 'Ricevuta di spedizione', 'F1', 'center');
        $y += 20;
        $ops .= $this->drawLine($this->marginLeft, $y, $this->pageWidth - $this->marginRight, $y, 1.2);
        $y += 20;

        // ── DATI ORDINE ─────────────────────────────────────────
        $ops .= $this->drawText($this->marginLeft, $y, 11, 'Dettagli ordine', 'F2');
        $y += 18;

        $orderDate = $order->created_at ? $order->created_at->format('d/m/Y H:i') : 'n/d';
        $orderNumber = 'SF-' . str_pad((string) $order->id, 6, '0', STR_PAD_LEFT);

        $ops .= $this->drawText($this->marginLeft, $y, 9, 'Numero ordine:', 'F2');
        $ops .= $this->drawText($this->marginLeft + 100, $y, 9, $orderNumber, 'F1');
        $y += 14;
        $ops .= $this->drawText($this->marginLeft, $y, 9, 'Data:', 'F2');
        $ops .= $this->drawText($this->marginLeft + 100, $y, 9, $orderDate, 'F1');
        $y += 14;

        if ($order->brt_parcel_id) {
            $ops .= $this->drawText($this->marginLeft, $y, 9, 'Codice BRT:', 'F2');
            $ops .= $this->drawText($this->marginLeft + 100, $y, 9, (string) $order->brt_parcel_id, 'F1');
            $y += 14;
        }

        if ($order->brt_tracking_number) {
            $ops .= $this->drawText($this->marginLeft, $y, 9, 'Tracking:', 'F2');
            $ops .= $this->drawText($this->marginLeft + 100, $y, 9, (string) $order->brt_tracking_number, 'F1');
            $y += 14;
        }

        $y += 8;

        // ── DATI CLIENTE ────────────────────────────────────────
        $ops .= $this->drawText($this->marginLeft, $y, 11, 'Dati cliente', 'F2');
        $y += 18;

        $userName = '';
        if ($order->user) {
            $userName = trim(($order->user->name ?? '') . ' ' . ($order->user->surname ?? ''));
        }

        // Usa billing_data se disponibile, altrimenti dati utente base.
        // Supporta chiavi vecchie (name/vat_number/fiscal_code) e nuove (F07:
        // ragione_sociale/p_iva/codice_fiscale/codice_sdi/pec) con fallback.
        $billingData = $order->billing_data;
        if (is_array($billingData) && ! empty($billingData)) {
            $subjectType = $billingData['subject_type'] ?? ($billingData['is_business'] ?? false ? 'azienda' : 'privato');
            $isBusiness = $subjectType === 'azienda' || ($billingData['is_business'] ?? false) === true;

            // Intestatario: ragione sociale (azienda) o nome completo (privato)
            $intestatario = $isBusiness
                ? ($billingData['ragione_sociale'] ?? $billingData['company_name'] ?? $billingData['name'] ?? $userName)
                : ($billingData['nome_completo'] ?? $billingData['name'] ?? $userName);

            $ops .= $this->drawLabelValue($this->marginLeft, $y, $isBusiness ? 'Ragione soc.:' : 'Nome:', (string) $intestatario);
            $y += 14;

            // P.IVA (aziende)
            $vat = $billingData['p_iva'] ?? $billingData['vat_number'] ?? null;
            if (! empty($vat)) {
                $ops .= $this->drawLabelValue($this->marginLeft, $y, 'P.IVA:', (string) $vat);
                $y += 14;
            }

            // Codice fiscale
            $cf = $billingData['codice_fiscale'] ?? $billingData['fiscal_code'] ?? null;
            if (! empty($cf)) {
                $ops .= $this->drawLabelValue($this->marginLeft, $y, 'Cod. Fiscale:', (string) $cf);
                $y += 14;
            }

            // Codice SDI (F07)
            $sdi = $billingData['codice_sdi'] ?? $billingData['sdi_code'] ?? null;
            if (! empty($sdi) && $sdi !== '0000000') {
                $ops .= $this->drawLabelValue($this->marginLeft, $y, 'Codice SDI:', (string) $sdi);
                $y += 14;
            }

            // PEC (F07)
            $pec = $billingData['pec'] ?? $billingData['pec_email'] ?? null;
            if (! empty($pec)) {
                $ops .= $this->drawLabelValue($this->marginLeft, $y, 'PEC:', (string) $pec);
                $y += 14;
            }

            // Indirizzo
            $address = $billingData['indirizzo'] ?? $billingData['address'] ?? '';
            if (! empty($address)) {
                $ops .= $this->drawLabelValue($this->marginLeft, $y, 'Indirizzo:', (string) $address);
                $y += 14;
            }
            $cityLine = trim(($billingData['postal_code'] ?? '') . ' ' . ($billingData['city'] ?? '') . ' ' . ($billingData['province'] ?? ''));
            if ($cityLine !== '') {
                $ops .= $this->drawLabelValue($this->marginLeft, $y, 'Localita:', $cityLine);
                $y += 14;
            }
        } else {
            $ops .= $this->drawLabelValue($this->marginLeft, $y, 'Nome:', $userName);
            $y += 14;
            if ($order->user && $order->user->email) {
                $ops .= $this->drawLabelValue($this->marginLeft, $y, 'Email:', $order->user->email);
                $y += 14;
            }
        }

        $y += 8;

        // ── INDIRIZZI ───────────────────────────────────────────
        $firstPackage = $order->packages->first();
        $origin = $firstPackage?->originAddress;
        $destination = $firstPackage?->destinationAddress;

        if ($origin || $destination) {
            $ops .= $this->drawText($this->marginLeft, $y, 11, 'Indirizzi spedizione', 'F2');
            $y += 18;

            if ($origin) {
                $ops .= $this->drawText($this->marginLeft, $y, 9, 'MITTENTE', 'F2');
                $y += 14;
                $ops .= $this->drawText($this->marginLeft, $y, 9, $this->normalizeText($origin->name ?? ''), 'F1');
                $y += 12;
                $ops .= $this->drawText($this->marginLeft, $y, 8, $this->normalizeText(($origin->address ?? '') . ' ' . ($origin->address_number ?? '')), 'F1');
                $y += 12;
                $ops .= $this->drawText($this->marginLeft, $y, 8, $this->normalizeText(($origin->postal_code ?? '') . ' ' . ($origin->city ?? '') . ' (' . ($origin->province ?? '') . ')'), 'F1');
                $y += 16;
            }

            if ($destination) {
                $ops .= $this->drawText($this->marginLeft, $y, 9, 'DESTINATARIO', 'F2');
                $y += 14;
                $ops .= $this->drawText($this->marginLeft, $y, 9, $this->normalizeText($destination->name ?? ''), 'F1');
                $y += 12;
                $ops .= $this->drawText($this->marginLeft, $y, 8, $this->normalizeText(($destination->address ?? '') . ' ' . ($destination->address_number ?? '')), 'F1');
                $y += 12;
                $ops .= $this->drawText($this->marginLeft, $y, 8, $this->normalizeText(($destination->postal_code ?? '') . ' ' . ($destination->city ?? '') . ' (' . ($destination->province ?? '') . ')'), 'F1');
                $y += 16;
            }

            $y += 4;
        }

        // ── TABELLA PACCHI ──────────────────────────────────────
        $ops .= $this->drawText($this->marginLeft, $y, 11, 'Pacchi', 'F2');
        $y += 18;

        // Header tabella
        $tableWidth = $this->pageWidth - $this->marginLeft - $this->marginRight;
        $ops .= $this->drawFilledRect($this->marginLeft, $y - 4, $tableWidth, 18, 0.93);

        $cols = [0, 80, 200, 330, 395]; // posizioni x relative
        $ops .= $this->drawText($this->marginLeft + 4, $y + 8, 7.5, 'N.', 'F2');
        $ops .= $this->drawText($this->marginLeft + $cols[1], $y + 8, 7.5, 'Tipo', 'F2');
        $ops .= $this->drawText($this->marginLeft + $cols[2], $y + 8, 7.5, 'Dimensioni (cm)', 'F2');
        $ops .= $this->drawText($this->marginLeft + $cols[3], $y + 8, 7.5, 'Peso', 'F2');
        $ops .= $this->drawText($this->marginLeft + $cols[4], $y + 8, 7.5, 'Prezzo', 'F2');
        $y += 20;

        $totalCents = 0;
        foreach ($order->packages as $index => $package) {
            $priceCents = $package->getRawOriginal('single_price') ?? 0;
            $totalCents += $priceCents;
            $priceStr = number_format($priceCents / 100, 2, ',', '.') . ' EUR';
            $dims = ($package->first_size ?? '?') . ' x ' . ($package->second_size ?? '?') . ' x ' . ($package->third_size ?? '?');

            $ops .= $this->drawText($this->marginLeft + 4, $y, 8, (string) ($index + 1), 'F1');
            $ops .= $this->drawText($this->marginLeft + $cols[1], $y, 8, $this->normalizeText($package->package_type ?? 'Pacco'), 'F1');
            $ops .= $this->drawText($this->marginLeft + $cols[2], $y, 8, $dims, 'F1');
            $ops .= $this->drawText($this->marginLeft + $cols[3], $y, 8, ($package->weight ?? '?') . ' kg', 'F1');
            $ops .= $this->drawText($this->marginLeft + $cols[4], $y, 8, $priceStr, 'F1');
            $y += 16;
        }

        $y += 4;
        $ops .= $this->drawLine($this->marginLeft, $y, $this->pageWidth - $this->marginRight, $y, 0.7);
        $y += 16;

        // ── TOTALI ──────────────────────────────────────────────
        // Il documento deve riflettere il totale davvero pagabile, non il lordo prima degli sconti.
        $grossSubtotalCents = $order->grossSubtotalCents();
        $discountCents = $order->discountAmountCents();
        $subtotalCents = $order->payableTotalCents();
        $vatRate = 22;
        // Scorporo IVA dal totale (il prezzo include gia' l'IVA)
        $imponibileCents = (int) round($subtotalCents / (1 + $vatRate / 100));
        $ivaCents = $subtotalCents - $imponibileCents;

        $rightX = $this->pageWidth - $this->marginRight;

        if ($discountCents > 0) {
            $ops .= $this->drawText($rightX - 180, $y, 9, 'Totale lordo:', 'F1');
            $ops .= $this->drawText($rightX, $y, 9, number_format($grossSubtotalCents / 100, 2, ',', '.') . ' EUR', 'F1', 'right');
            $y += 14;
            $ops .= $this->drawText($rightX - 180, $y, 9, 'Sconto:', 'F1');
            $ops .= $this->drawText($rightX, $y, 9, '-' . number_format($discountCents / 100, 2, ',', '.') . ' EUR', 'F1', 'right');
            $y += 14;
        }

        $ops .= $this->drawText($rightX - 180, $y, 9, 'Imponibile:', 'F1');
        $ops .= $this->drawText($rightX, $y, 9, number_format($imponibileCents / 100, 2, ',', '.') . ' EUR', 'F1', 'right');
        $y += 14;
        $ops .= $this->drawText($rightX - 180, $y, 9, 'IVA (' . $vatRate . '%):', 'F1');
        $ops .= $this->drawText($rightX, $y, 9, number_format($ivaCents / 100, 2, ',', '.') . ' EUR', 'F1', 'right');
        $y += 16;

        $ops .= $this->drawLine($rightX - 200, $y, $rightX, $y, 1.0);
        $y += 14;
        $ops .= $this->drawText($rightX - 180, $y, 12, 'TOTALE:', 'F2');
        $ops .= $this->drawText($rightX, $y, 12, number_format($subtotalCents / 100, 2, ',', '.') . ' EUR', 'F2', 'right');
        $y += 30;

        // ── METODO DI PAGAMENTO ─────────────────────────────────
        $paymentMethod = $order->payment_method ?? null;
        if ($paymentMethod) {
            $methodLabels = [
                'stripe' => 'Carta di credito (Stripe)',
                'wallet' => 'Portafoglio virtuale',
                'bonifico' => 'Bonifico bancario',
            ];
            $ops .= $this->drawLabelValue($this->marginLeft, $y, 'Pagamento:', $methodLabels[$paymentMethod] ?? $paymentMethod);
            $y += 20;
        }

        // ── FOOTER ──────────────────────────────────────────────
        $footerY = $this->pageHeight - 60;
        $ops .= $this->drawLine($this->marginLeft, $footerY, $this->pageWidth - $this->marginRight, $footerY, 0.7);
        $footerY += 14;
        $ops .= $this->drawText($this->pageWidth / 2, $footerY, 8, 'SpediamoFacile - Spedizioni semplici, veloci e convenienti', 'F1', 'center');
        $footerY += 12;
        $ops .= $this->drawText($this->pageWidth / 2, $footerY, 7, 'Documento generato automaticamente - Non costituisce fattura fiscale', 'F1', 'center');
        $footerY += 10;
        $ops .= $this->drawText($this->pageWidth / 2, $footerY, 7, 'assistenza@spediamofacile.it', 'F1', 'center');

        return $this->buildPdfDocument($ops);
    }

    // ── METODI HELPER PRIVATI ───────────────────────────────────

    private function drawLabelValue(float $x, float $y, string $label, string $value): string
    {
        $ops = $this->drawText($x, $y, 9, $label, 'F2');
        $ops .= $this->drawText($x + 100, $y, 9, $this->normalizeText($value), 'F1');

        return $ops;
    }

    // buildPdfDocument, drawText, drawLine, drawFilledRect, toPdfY,
    // fitTextToWidth, estimateTextWidth, normalizeText, escapePdfText, format
    // sono in trait App\Services\Invoice\SinglePagePdfHelpers (use sopra).
}
