<?php
/**
 * FILE: BillingAddress.php
 * SCOPO: Modello indirizzo di fatturazione (diverso da indirizzo spedizione).
 *
 * DOVE SI USA:
 *   - BillingAddressController.php — CRUD indirizzi di fatturazione
 *   - nuxt: pages/checkout.vue (selezione indirizzo fattura)
 *   - pages/account/profilo.vue (tab Fatturazione)
 *   - SdiService (legge vat_number / fiscal_code / sdi_code / pec_email)
 *
 * CAMPI FISCALI (aggiunti in F07 — fatturazione elettronica SDI):
 *   - is_business (bool): true per aziende, false per privati
 *   - company_name: ragione sociale (obbligatoria se is_business=true)
 *   - fiscal_code: codice fiscale (16 char — obbligatorio per privati)
 *   - vat_number: Partita IVA 11 cifre (obbligatoria per aziende)
 *   - sdi_code: codice destinatario SDI 7 char (default "0000000")
 *   - pec_email: indirizzo PEC alternativa a sdi_code
 *   - country: ISO alpha-2 (default "IT")
 *
 * VINCOLI (applicativi, vedi BillingAddressStoreRequest):
 *   - Aziende: company_name + vat_number OBBLIGATORI + (sdi_code o pec_email)
 *   - Privati: fiscal_code OBBLIGATORIO; sdi_code fallback "0000000"
 *
 * ERRORI TIPICI:
 *   - Confusione con UserAddress o PackageAddress: BillingAddress e' solo per la fatturazione
 *   - Passare P.IVA di 10 cifre (sbagliata): validazione checksum fallisce
 *
 * COLLEGAMENTI:
 *   - app/Http/Requests/BillingAddressStoreRequest.php — validazione request
 *   - app/Rules/ItalianVatNumber.php — checksum algoritmo ministeriale
 *   - app/Rules/ItalianFiscalCode.php — pattern CF
 *   - app/Services/Sdi/SdiService.php — usa questi dati per generare XML FatturaPA
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingAddress extends Model
{
    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = [
        'name',            // Nome/cognome referente (persona fisica, anche se azienda)
        'is_business',     // true se azienda, false se privato
        'company_name',    // Ragione sociale (solo aziende)
        'fiscal_code',     // Codice fiscale
        'vat_number',      // Partita IVA
        'sdi_code',        // Codice destinatario SDI 7 char
        'pec_email',       // PEC alternativa
        'address',         // Via/piazza/corso
        'city',            // Città
        'province_name',   // Nome/sigla della provincia
        'postal_code',     // CAP
        'country',         // Paese ISO alpha-2 (default IT)
    ];

    protected $casts = [
        'is_business' => 'boolean',
    ];

    protected $attributes = [
        'is_business' => false,
        'sdi_code' => '0000000',
        'country' => 'IT',
    ];

    /**
     * Mutator: normalizza vat_number rimuovendo prefisso "IT" e spazi.
     */
    public function setVatNumberAttribute(?string $value): void
    {
        if ($value === null) {
            $this->attributes['vat_number'] = null;

            return;
        }

        $normalized = strtoupper(preg_replace('/\s+/', '', $value) ?? '');
        if (str_starts_with($normalized, 'IT')) {
            $normalized = substr($normalized, 2);
        }

        $this->attributes['vat_number'] = $normalized !== '' ? $normalized : null;
    }

    /**
     * Mutator: uppercase il codice fiscale senza spazi.
     */
    public function setFiscalCodeAttribute(?string $value): void
    {
        if ($value === null) {
            $this->attributes['fiscal_code'] = null;

            return;
        }

        $normalized = strtoupper(preg_replace('/\s+/', '', $value) ?? '');
        $this->attributes['fiscal_code'] = $normalized !== '' ? $normalized : null;
    }

    /**
     * Mutator: uppercase il codice SDI e fallback "0000000" se vuoto.
     */
    public function setSdiCodeAttribute(?string $value): void
    {
        $normalized = strtoupper(preg_replace('/\s+/', '', (string) $value) ?? '');
        $this->attributes['sdi_code'] = $normalized !== '' ? $normalized : '0000000';
    }
}
