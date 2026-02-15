<?php
/**
 * FILE: PriceBand.php
 * SCOPO: Modello fascia di prezzo per peso e volume, con supporto sconti/promozioni.
 *
 * COSA ENTRA:
 *   - type (weight/volume), min_value, max_value (range della fascia)
 *   - base_price (prezzo pieno in centesimi), discount_price (prezzo scontato, opzionale)
 *   - show_discount (se mostrare il badge sconto), sort_order
 *
 * COSA ESCE:
 *   - Attributi calcolati: effective_price (prezzo effettivo), discount_percent (% sconto)
 *   - Scope: weight(), volume() per filtrare per tipo
 *
 * CHIAMATO DA:
 *   - PriceBandController.php — CRUD admin con aggiornamento massivo
 *   - PublicPriceBandController.php — lettura pubblica con cache 60 minuti
 *   - SessionController.php — calcolo prezzo nel preventivo (firstStep)
 *   - nuxt: composables/usePriceBands.js — caricamento fasce nel frontend
 *
 * EFFETTI COLLATERALI:
 *   - Nessuno (modello semplice senza boot/observer)
 *
 * ERRORI TIPICI:
 *   - I prezzi (base_price, discount_price) sono in CENTESIMI (es. 890 = 8,90 euro)
 *   - min_value e max_value sono in kg (peso) o m3 (volume) con 4 decimali
 *   - effective_price ritorna discount_price se presente, altrimenti base_price
 *
 * DOCUMENTI CORRELATI:
 *   - PriceBandController.php — gestione admin delle fasce
 *   - PublicPriceBandController.php — endpoint pubblico con cache
 *   - SessionController.php — uso delle fasce per calcolo preventivo
 *   - database/seeders/PriceBandSeeder.php — valori iniziali delle 7 fasce
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PriceBand extends Model
{
    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = [
        'type',            // Tipo di fascia: "weight" (peso) o "volume" (volume)
        'min_value',       // Valore minimo del range (kg o m3)
        'max_value',       // Valore massimo del range (kg o m3)
        'base_price',      // Prezzo pieno in centesimi (es. 890 = 8,90 euro)
        'discount_price',  // Prezzo scontato in centesimi (null = nessuno sconto)
        'show_discount',   // Se mostrare il badge "sconto" nel frontend
        'sort_order',      // Ordine di visualizzazione
    ];

    /**
     * Conversioni automatiche dei tipi.
     */
    protected $casts = [
        'min_value' => 'decimal:4',
        'max_value' => 'decimal:4',
        'show_discount' => 'boolean',
    ];

    // Aggiunge automaticamente effective_price e discount_percent alla risposta JSON
    protected $appends = ['effective_price', 'discount_percent'];

    // Scope: filtra solo le fasce di peso
    public function scopeWeight($query) { return $query->where('type', 'weight'); }

    // Scope: filtra solo le fasce di volume
    public function scopeVolume($query) { return $query->where('type', 'volume'); }

    /**
     * Prezzo effettivo: se c'e' uno sconto attivo, usa il prezzo scontato.
     * Altrimenti usa il prezzo pieno. Sempre in centesimi.
     */
    public function getEffectivePriceAttribute(): int
    {
        return $this->discount_price ?? $this->base_price;
    }

    /**
     * Percentuale di sconto calcolata: se discount_price < base_price -> sconto positivo.
     * Se discount_price >= base_price o null -> null (nessuno sconto da mostrare).
     * Es: base_price=1190, discount_price=890 -> sconto = 25%
     */
    public function getDiscountPercentAttribute(): ?int
    {
        if ($this->discount_price === null || $this->base_price <= 0) {
            return null;
        }

        if ($this->discount_price >= $this->base_price) {
            return null;
        }

        return (int) round((1 - $this->discount_price / $this->base_price) * 100);
    }
}
