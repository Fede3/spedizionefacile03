<?php

/**
 * MIGRAZIONE: Aggiunge campi per salvare i dati completi della risposta BRT.
 *
 * Quando BRT crea una spedizione, restituisce diversi dati utili oltre all'etichetta:
 * - Numero di tracking (parcelNumberFrom/To) per seguire il pacco
 * - Numero di serie e tipo di servizio BRT
 * - Depositi e terminali di partenza/arrivo per la logistica
 * - Zona di consegna per il routing
 * - Risposta completa JSON per debug e riferimento futuro
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Numero di tracking BRT (parcelNumberFrom) - il numero di collo principale
            $table->string('brt_tracking_number')->nullable()->after('brt_error');
            // Numero di tracking BRT fine range (parcelNumberTo) - ultimo collo se multi-collo
            $table->string('brt_parcel_number_to')->nullable()->after('brt_tracking_number');
            // Deposito BRT di partenza (codice numerico)
            $table->string('brt_departure_depot')->nullable()->after('brt_parcel_number_to');
            // Terminale BRT di arrivo (codice numerico)
            $table->string('brt_arrival_terminal')->nullable()->after('brt_departure_depot');
            // Deposito BRT di arrivo (codice numerico)
            $table->string('brt_arrival_depot')->nullable()->after('brt_arrival_terminal');
            // Zona di consegna BRT
            $table->string('brt_delivery_zone')->nullable()->after('brt_arrival_depot');
            // Numero di serie BRT
            $table->string('brt_series_number')->nullable()->after('brt_delivery_zone');
            // Tipo di servizio BRT (codice restituito dall'API)
            $table->string('brt_service_type')->nullable()->after('brt_series_number');
            // Risposta JSON completa da BRT (per debug e audit)
            $table->json('brt_raw_response')->nullable()->after('brt_service_type');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'brt_tracking_number',
                'brt_parcel_number_to',
                'brt_departure_depot',
                'brt_arrival_terminal',
                'brt_arrival_depot',
                'brt_delivery_zone',
                'brt_series_number',
                'brt_service_type',
                'brt_raw_response',
            ]);
        });
    }
};
