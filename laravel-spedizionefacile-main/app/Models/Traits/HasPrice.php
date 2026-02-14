<?php

/**
 * TRAIT GESTIONE PREZZO
 *
 * Un "trait" e' un pezzo di codice riutilizzabile che puo' essere aggiunto
 * a piu' modelli diversi. Questo trait aggiunge la gestione automatica
 * dei prezzi a qualsiasi modello che lo usa (ad esempio il modello Package).
 *
 * Cosa fa:
 * - Quando leggi il campo "price", viene automaticamente convertito
 *   in un oggetto MyMoney che gestisce la formattazione (es. "12,50 EUR")
 * - Fornisce un attributo "formatted_price" gia' pronto per essere mostrato
 */

namespace App\Models\Traits;
use App\Cart\MyMoney;
use Illuminate\Database\Eloquent\Builder;

trait HasPrice {

    // Converte automaticamente il prezzo in un oggetto MyMoney
    // quando viene letto dal database
    public function getPriceAttribute($value) {
        return new MyMoney($value);
    }

    // Restituisce il prezzo gia' formattato come stringa leggibile
    // Esempio: "12,50 EUR"
    public function getFormattedPriceAttribute() {
        return $this->price->formatted();
    }
}
