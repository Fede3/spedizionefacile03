<?php

/**
 * FILE: HasPrice.php
 * SCOPO: Trait riutilizzabile che aggiunge gestione automatica dei prezzi ai modelli.
 *
 * DOVE SI USA:
 *   - app/Models/Package.php — formattazione prezzo del pacco
 *
 * DATI IN INGRESSO:
 *   - Il campo "price" del modello (in centesimi nel database)
 *   Esempio: Un pacco con price=1190 nel DB
 *
 * DATI IN USCITA:
 *   - Attributo "price": oggetto MyMoney per calcoli e formattazione
 *   - Attributo "formatted_price": stringa leggibile (es. "11,90 EUR")
 *   Esempio: $package->price->amount(), $package->formatted_price
 *
 * VINCOLI:
 *   - Il modello che usa questo trait deve avere un campo "price" nel database
 *   - Il valore deve essere in centesimi per la conversione corretta
 *
 * ERRORI TIPICI:
 *   - Usare $model->price come numero: e' un oggetto MyMoney, non un int
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per cambiare il formato: modificare la classe MyMoney in app/Cart/MyMoney.php
 *
 * COLLEGAMENTI:
 *   - app/Cart/MyMoney.php — classe che gestisce la formattazione dei prezzi
 *   - app/Models/Package.php — modello principale che usa questo trait
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
