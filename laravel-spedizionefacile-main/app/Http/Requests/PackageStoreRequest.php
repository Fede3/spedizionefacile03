<?php

/**
 * REQUEST: VALIDAZIONE CREAZIONE PACCHI
 *
 * Una "Form Request" in Laravel serve per validare i dati inviati dall'utente
 * PRIMA che arrivino al controller. Se i dati non sono validi, la richiesta
 * viene automaticamente rifiutata con un messaggio di errore.
 *
 * Questa Request valida tutti i dati necessari per creare dei pacchi:
 * - Indirizzo di partenza (tutti i campi obbligatori)
 * - Indirizzo di destinazione (tutti i campi obbligatori)
 * - Servizi opzionali (tipo, data, orario)
 * - I pacchi stessi (tipo, quantita', peso, dimensioni, prezzo)
 *
 * Ogni regola specifica: se il campo e' obbligatorio, il tipo di dato,
 * la lunghezza massima e i valori minimi/massimi accettati.
 */

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PackageStoreRequest extends FormRequest
{
    /**
     * Autorizzazione: tutti possono fare questa richiesta (true).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Regole di validazione per ogni campo.
     * Se un campo non rispetta le regole, la richiesta viene rifiutata.
     */
    public function rules(): array
    {
        return [
            /* Indirizzo di partenza - da dove parte il pacco */
            'origin_address.type' => 'required|string|max:50',
            'origin_address.name' => 'required|string|max:200',
            'origin_address.additional_information' => 'nullable|string|max:500',
            'origin_address.address' => 'required|string|max:300',
            'origin_address.number_type' => 'required|string|max:50',
            'origin_address.address_number' => 'required|string|max:20',
            'origin_address.intercom_code' => 'nullable|string|max:50',
            'origin_address.country' => 'required|string|max:100',
            'origin_address.city' => 'required|string|max:200',
            'origin_address.postal_code' => 'required|string|max:10',
            'origin_address.province' => 'required|string|max:10',
            'origin_address.telephone_number' => 'required|string|max:20',
            'origin_address.email' => 'nullable|string|max:200',

            /* Indirizzo di destinazione - dove deve arrivare il pacco */
            'destination_address.type' => 'required|string|max:50',
            'destination_address.name' => 'required|string|max:200',
            'destination_address.additional_information' => 'nullable|string|max:500',
            'destination_address.address' => 'required|string|max:300',
            'destination_address.number_type' => 'required|string|max:50',
            'destination_address.address_number' => 'required|string|max:20',
            'destination_address.intercom_code' => 'nullable|string|max:50',
            'destination_address.country' => 'required|string|max:100',
            'destination_address.city' => 'required|string|max:200',
            'destination_address.postal_code' => 'required|string|max:10',
            'destination_address.province' => 'required|string|max:10',
            'destination_address.telephone_number' => 'required|string|max:20',
            'destination_address.email' => 'nullable|string|max:200',

            /* Servizi opzionali (tipo di spedizione, data e orario di ritiro) */
            'services.service_type' => 'nullable|string|max:500',
            'services.date' => 'nullable|string|max:20',
            'services.time' => 'nullable|string|max:20',
            'services.serviceData' => 'nullable|array',
            'services.service_data' => 'nullable|array',
            'services.sms_email_notification' => 'nullable|boolean',
            'sms_email_notification' => 'nullable|boolean',

            /* Pacchi - almeno 1 pacco, massimo 50 */
            'packages' => 'required|array|min:1|max:50',
            'packages.*.package_type' => 'required|string|max:50',           // Tipo (busta, scatola...)
            'packages.*.quantity' => 'required|integer|min:1|max:999',       // Quantita' (da 1 a 999)
            'packages.*.weight' => 'required|numeric|min:0.1|max:9999',     // Peso minimo 0.1 kg
            'packages.*.first_size' => 'required|numeric|min:1|max:9999',   // Lunghezza minimo 1 cm
            'packages.*.second_size' => 'required|numeric|min:1|max:9999',  // Larghezza minimo 1 cm
            'packages.*.third_size' => 'required|numeric|min:1|max:9999',   // Altezza minimo 1 cm
            'packages.*.weight_price' => 'nullable|numeric|min:0',          // Prezzo per peso (opzionale)
            'packages.*.volume_price' => 'nullable|numeric|min:0',          // Prezzo per volume (opzionale)
            'packages.*.single_price' => 'required|numeric|min:0',          // Prezzo finale (obbligatorio)

            /* Descrizione del contenuto del pacco (opzionale) */
            'content_description' => 'nullable|string|max:255',

            /* PUDO - Punto di ritiro BRT (opzionale) */
            /* delivery_mode: 'home' = domicilio, 'pudo' = ritiro in punto BRT convenzionato */
            'delivery_mode' => 'nullable|string|in:home,pudo',
            /* pudo: oggetto con i dati del punto BRT selezionato (pudo_id, name, address, ecc.) */
            'pudo' => 'nullable|array',
            'pudo.pudo_id' => 'nullable|string|max:100',
            'pudo.name' => 'nullable|string|max:300',
            'pudo.address' => 'nullable|string|max:300',
            'pudo.city' => 'nullable|string|max:200',
            'pudo.zip_code' => 'nullable|string|max:10',
        ];
    }
}
