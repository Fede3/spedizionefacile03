<?php

/**
 * SERVICE: SdiXmlBuilder — genera XML FatturaPA v1.2.2 (formato SDI).
 *
 * RIFERIMENTI UFFICIALI:
 *   - Agenzia Entrate: specifiche tecniche FatturaPA v1.2.2 (ed. 1.9, feb 2024)
 *   - Schema XSD: Schema_del_file_xml_FatturaPA_v1.2.2.xsd
 *
 * SCOPO:
 *   Produce un XML conforme a FatturaPA a partire dai dati dell'ordine
 *   e dello snapshot billing_data (impostato in checkout).
 *
 * STRUTTURA XML GENERATA:
 *   FatturaElettronica (root)
 *     ├── FatturaElettronicaHeader
 *     │     ├── DatiTrasmissione (IdTrasmittente, CodiceDestinatario, PECDestinatario)
 *     │     ├── CedentePrestatore (cedente = azienda emittente, SpediamoFacile)
 *     │     └── CessionarioCommittente (cessionario = cliente)
 *     └── FatturaElettronicaBody
 *           ├── DatiGenerali/DatiGeneraliDocumento (TipoDocumento, Data, Numero, ImportoTotale)
 *           ├── DatiBeniServizi/DettaglioLinee (righe pacchi + servizi)
 *           └── DatiBeniServizi/DatiRiepilogo (IVA 22%)
 *
 * TIPO DOCUMENTO:
 *   - TD01 (fattura) come default.
 *
 * NOTE:
 *   - Prezzi gestiti in centesimi (come nel resto del sistema) ma convertiti
 *     in decimali a 2 cifre per l'XML.
 *   - PrestatoreService (cedente) letto da config('services.sdi.cedente').
 */

namespace App\Services\Sdi;

use App\Models\Order;
use DOMDocument;

class SdiXmlBuilder
{
    /** Aliquota IVA standard (22% in Italia). */
    private const VAT_RATE = 22;

    /**
     * Costruisce l'XML FatturaPA per l'ordine.
     *
     * @param Order $order Ordine con billing_data popolato
     * @param string $progressivoInvio Progressivo trasmissione (max 5 char alfanumerici)
     * @param string $invoiceNumber Numero fattura (es. "2026/00012")
     * @return string XML come stringa
     */
    public function build(Order $order, string $progressivoInvio, string $invoiceNumber): string
    {
        $billing = is_array($order->billing_data) ? $order->billing_data : [];

        $cedente = $this->cedenteData();
        $cessionario = $this->cessionarioDataFromBilling($billing);

        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->formatOutput = true;

        // Tipo trasmissione: FPR12 (verso privati) o FPA12 (PA).
        // Per ora sempre FPR12 perché non serviamo PA.
        $formatoTrasmissione = 'FPR12';

        // <p:FatturaElettronica> con namespace ufficiali
        $root = $dom->createElementNS(
            'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2',
            'p:FatturaElettronica'
        );
        $root->setAttributeNS(
            'http://www.w3.org/2000/xmlns/',
            'xmlns:ds',
            'http://www.w3.org/2000/09/xmldsig#'
        );
        $root->setAttributeNS(
            'http://www.w3.org/2000/xmlns/',
            'xmlns:xsi',
            'http://www.w3.org/2001/XMLSchema-instance'
        );
        $root->setAttribute('versione', $formatoTrasmissione);
        $root->setAttributeNS(
            'http://www.w3.org/2001/XMLSchema-instance',
            'xsi:schemaLocation',
            'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.2.xsd'
        );
        $dom->appendChild($root);

        // ===== HEADER =====
        $header = $dom->createElement('FatturaElettronicaHeader');
        $root->appendChild($header);

        $this->appendDatiTrasmissione(
            $dom,
            $header,
            $cedente,
            $cessionario,
            $progressivoInvio,
            $formatoTrasmissione,
        );
        $this->appendCedentePrestatore($dom, $header, $cedente);
        $this->appendCessionarioCommittente($dom, $header, $cessionario);

        // ===== BODY =====
        $body = $dom->createElement('FatturaElettronicaBody');
        $root->appendChild($body);

        $this->appendDatiGenerali($dom, $body, $order, $invoiceNumber);
        $this->appendDatiBeniServizi($dom, $body, $order);

        return $dom->saveXML() ?: '';
    }

    /* ========================================================================
     * SEZIONI XML
     * ======================================================================*/

    private function appendDatiTrasmissione(
        DOMDocument $dom,
        \DOMElement $header,
        array $cedente,
        array $cessionario,
        string $progressivoInvio,
        string $formatoTrasmissione
    ): void {
        $node = $dom->createElement('DatiTrasmissione');

        // IdTrasmittente: identificativo del soggetto che trasmette (noi/intermediario)
        $id = $dom->createElement('IdTrasmittente');
        $this->appendText($dom, $id, 'IdPaese', 'IT');
        $this->appendText($dom, $id, 'IdCodice', $this->sanitizeVat($cedente['vat_number']));
        $node->appendChild($id);

        $this->appendText($dom, $node, 'ProgressivoInvio', substr($progressivoInvio, 0, 10));
        $this->appendText($dom, $node, 'FormatoTrasmissione', $formatoTrasmissione);

        // CodiceDestinatario obbligatorio (7 char). Default 0000000 = B2C/privato.
        $sdiCode = $cessionario['sdi_code'] ?: '0000000';
        $this->appendText($dom, $node, 'CodiceDestinatario', strtoupper($sdiCode));

        // PEC opzionale (alternativa al codice SDI)
        if (! empty($cessionario['pec_email'])) {
            $this->appendText($dom, $node, 'PECDestinatario', $cessionario['pec_email']);
        }

        $header->appendChild($node);
    }

    private function appendCedentePrestatore(DOMDocument $dom, \DOMElement $header, array $cedente): void
    {
        $node = $dom->createElement('CedentePrestatore');

        // DatiAnagrafici
        $anagrafici = $dom->createElement('DatiAnagrafici');

        $idFiscale = $dom->createElement('IdFiscaleIVA');
        $this->appendText($dom, $idFiscale, 'IdPaese', 'IT');
        $this->appendText($dom, $idFiscale, 'IdCodice', $this->sanitizeVat($cedente['vat_number']));
        $anagrafici->appendChild($idFiscale);

        if (! empty($cedente['fiscal_code'])) {
            $this->appendText($dom, $anagrafici, 'CodiceFiscale', $cedente['fiscal_code']);
        }

        $anag = $dom->createElement('Anagrafica');
        $this->appendText($dom, $anag, 'Denominazione', $cedente['company_name']);
        $anagrafici->appendChild($anag);

        // RegimeFiscale: RF01 = ordinario (default)
        $this->appendText($dom, $anagrafici, 'RegimeFiscale', $cedente['regime_fiscale'] ?? 'RF01');

        $node->appendChild($anagrafici);

        // Sede
        $sede = $dom->createElement('Sede');
        $this->appendText($dom, $sede, 'Indirizzo', $cedente['address']);
        $this->appendText($dom, $sede, 'CAP', $cedente['postal_code']);
        $this->appendText($dom, $sede, 'Comune', $cedente['city']);
        if (! empty($cedente['province'])) {
            $this->appendText($dom, $sede, 'Provincia', strtoupper(substr($cedente['province'], 0, 2)));
        }
        $this->appendText($dom, $sede, 'Nazione', $cedente['country'] ?? 'IT');
        $node->appendChild($sede);

        $header->appendChild($node);
    }

    private function appendCessionarioCommittente(DOMDocument $dom, \DOMElement $header, array $cess): void
    {
        $node = $dom->createElement('CessionarioCommittente');

        $anagrafici = $dom->createElement('DatiAnagrafici');

        // IdFiscaleIVA solo per aziende
        if ($cess['is_business'] && ! empty($cess['vat_number'])) {
            $idFiscale = $dom->createElement('IdFiscaleIVA');
            $this->appendText($dom, $idFiscale, 'IdPaese', $cess['country']);
            $this->appendText($dom, $idFiscale, 'IdCodice', $this->sanitizeVat($cess['vat_number']));
            $anagrafici->appendChild($idFiscale);
        }

        // CodiceFiscale sempre se presente (obbligatorio per privati)
        if (! empty($cess['fiscal_code'])) {
            $this->appendText($dom, $anagrafici, 'CodiceFiscale', $cess['fiscal_code']);
        }

        $anag = $dom->createElement('Anagrafica');
        if ($cess['is_business']) {
            $this->appendText($dom, $anag, 'Denominazione', $cess['company_name'] ?: $cess['name']);
        } else {
            // Persona fisica: split nome/cognome
            [$nome, $cognome] = $this->splitName($cess['name']);
            if ($nome !== '') {
                $this->appendText($dom, $anag, 'Nome', $nome);
            }
            if ($cognome !== '') {
                $this->appendText($dom, $anag, 'Cognome', $cognome);
            }
        }
        $anagrafici->appendChild($anag);

        $node->appendChild($anagrafici);

        // Sede
        $sede = $dom->createElement('Sede');
        $this->appendText($dom, $sede, 'Indirizzo', $cess['address'] ?: 'n/d');
        $this->appendText($dom, $sede, 'CAP', $cess['postal_code'] ?: '00000');
        $this->appendText($dom, $sede, 'Comune', $cess['city'] ?: 'n/d');
        if (! empty($cess['province'])) {
            $this->appendText($dom, $sede, 'Provincia', strtoupper(substr($cess['province'], 0, 2)));
        }
        $this->appendText($dom, $sede, 'Nazione', $cess['country'] ?: 'IT');
        $node->appendChild($sede);

        $header->appendChild($node);
    }

    private function appendDatiGenerali(DOMDocument $dom, \DOMElement $body, Order $order, string $invoiceNumber): void
    {
        $dg = $dom->createElement('DatiGenerali');
        $dgd = $dom->createElement('DatiGeneraliDocumento');

        $this->appendText($dom, $dgd, 'TipoDocumento', 'TD01'); // Fattura
        $this->appendText($dom, $dgd, 'Divisa', 'EUR');
        $this->appendText($dom, $dgd, 'Data', ($order->created_at ?? now())->format('Y-m-d'));
        $this->appendText($dom, $dgd, 'Numero', $invoiceNumber);

        $totaleCents = (int) ($order->getRawOriginal('subtotal') ?? 0);
        $this->appendText($dom, $dgd, 'ImportoTotaleDocumento', $this->money($totaleCents));

        // Causale facoltativa
        $this->appendText($dom, $dgd, 'Causale', 'Servizio di spedizione SpediamoFacile');

        $dg->appendChild($dgd);
        $body->appendChild($dg);
    }

    private function appendDatiBeniServizi(DOMDocument $dom, \DOMElement $body, Order $order): void
    {
        $dbs = $dom->createElement('DatiBeniServizi');

        $totaleCents = (int) ($order->getRawOriginal('subtotal') ?? 0);
        $imponibileCents = (int) round($totaleCents / (1 + self::VAT_RATE / 100));
        $ivaCents = $totaleCents - $imponibileCents;

        // Riga dettaglio: un'unica riga aggregata "servizi di spedizione".
        // (Se si vuole dettagliare per pacco, iterare $order->packages.)
        $riga = $dom->createElement('DettaglioLinee');
        $this->appendText($dom, $riga, 'NumeroLinea', '1');
        $this->appendText($dom, $riga, 'Descrizione', 'Servizi di spedizione — ordine SF-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT));
        $this->appendText($dom, $riga, 'Quantita', '1.00');
        $this->appendText($dom, $riga, 'PrezzoUnitario', $this->money($imponibileCents));
        $this->appendText($dom, $riga, 'PrezzoTotale', $this->money($imponibileCents));
        $this->appendText($dom, $riga, 'AliquotaIVA', number_format(self::VAT_RATE, 2, '.', ''));
        $dbs->appendChild($riga);

        // DatiRiepilogo IVA 22%
        $riep = $dom->createElement('DatiRiepilogo');
        $this->appendText($dom, $riep, 'AliquotaIVA', number_format(self::VAT_RATE, 2, '.', ''));
        $this->appendText($dom, $riep, 'ImponibileImporto', $this->money($imponibileCents));
        $this->appendText($dom, $riep, 'Imposta', $this->money($ivaCents));
        $this->appendText($dom, $riep, 'EsigibilitaIVA', 'I'); // Immediata
        $dbs->appendChild($riep);

        $body->appendChild($dbs);
    }

    /* ========================================================================
     * HELPERS
     * ======================================================================*/

    private function appendText(DOMDocument $dom, \DOMElement $parent, string $name, ?string $value): void
    {
        $value = $value ?? '';
        $value = trim($value);
        if ($value === '') {
            return;
        }
        $parent->appendChild($dom->createElement($name, htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8')));
    }

    private function money(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }

    private function sanitizeVat(?string $vat): string
    {
        $vat = strtoupper(preg_replace('/\s+/', '', (string) $vat) ?? '');
        if (str_starts_with($vat, 'IT')) {
            $vat = substr($vat, 2);
        }

        return $vat;
    }

    private function splitName(string $fullName): array
    {
        $fullName = trim(preg_replace('/\s+/', ' ', $fullName) ?? '');
        if ($fullName === '') {
            return ['', ''];
        }

        $parts = explode(' ', $fullName);
        if (count($parts) === 1) {
            return [$parts[0], ''];
        }

        $cognome = array_pop($parts);
        $nome = implode(' ', $parts);

        return [$nome, $cognome];
    }

    /**
     * Cedente (emittente fattura) — letto da config. Fallback placeholder se non configurato.
     */
    private function cedenteData(): array
    {
        $cfg = config('services.sdi.cedente', []);

        return [
            'company_name' => $cfg['company_name'] ?? 'SpediamoFacile S.r.l.',
            'vat_number' => $cfg['vat_number'] ?? '00000000000',
            'fiscal_code' => $cfg['fiscal_code'] ?? null,
            'address' => $cfg['address'] ?? 'Via Esempio 1',
            'postal_code' => $cfg['postal_code'] ?? '20100',
            'city' => $cfg['city'] ?? 'Milano',
            'province' => $cfg['province'] ?? 'MI',
            'country' => $cfg['country'] ?? 'IT',
            'regime_fiscale' => $cfg['regime_fiscale'] ?? 'RF01',
        ];
    }

    /**
     * Cessionario (cliente) — normalizzato dallo snapshot billing_data.
     */
    private function cessionarioDataFromBilling(array $billing): array
    {
        $isBusiness = ($billing['subject_type'] ?? ($billing['is_business'] ?? null)) === 'azienda'
            || ($billing['is_business'] ?? false) === true;

        return [
            'is_business' => (bool) $isBusiness,
            'name' => $billing['nome_completo'] ?? $billing['name'] ?? '',
            'company_name' => $billing['ragione_sociale'] ?? $billing['company_name'] ?? '',
            'vat_number' => $billing['p_iva'] ?? $billing['vat_number'] ?? '',
            'fiscal_code' => $billing['codice_fiscale'] ?? $billing['fiscal_code'] ?? '',
            'sdi_code' => strtoupper((string) ($billing['codice_sdi'] ?? $billing['sdi_code'] ?? '0000000')),
            'pec_email' => $billing['pec'] ?? $billing['pec_email'] ?? '',
            'address' => $billing['indirizzo'] ?? $billing['address'] ?? '',
            'postal_code' => $billing['postal_code'] ?? '',
            'city' => $billing['city'] ?? '',
            'province' => $billing['province'] ?? '',
            'country' => $billing['country'] ?? 'IT',
        ];
    }
}
