<?php
/**
 * FILE: Brt/ErrorTranslator.php
 * SCOPO: Traduce i codici di errore BRT in messaggi leggibili in italiano.
 *
 * DOVE SI USA:
 *   - ShipmentService.php — per tradurre errori della createShipment
 */

namespace App\Services\Brt;

class ErrorTranslator
{
    /**
     * Traduce gli errori BRT in messaggi leggibili in italiano.
     * Fornisce suggerimenti su come risolvere il problema.
     */
    public function translate(int $code, string $codeDesc, string $message, array $createData): string
    {
        $city = $createData['consigneeCity'] ?? '?';
        $zip = $createData['consigneeZIPCode'] ?? '?';
        $province = $createData['consigneeProvinceAbbreviation'] ?? '?';

        // Errori di routing (indirizzo non trovato)
        if ($code === -63 || stripos($codeDesc, 'ROUTING') !== false) {
            return "Errore indirizzo BRT: la citta' '{$city}' non corrisponde al CAP '{$zip}' (provincia: {$province}). "
                . "Verificare che citta', CAP e provincia siano corretti e corrispondano tra loro.";
        }

        // Errori di autenticazione
        if ($code === -1 && (stripos($message, 'auth') !== false || stripos($message, 'password') !== false || stripos($message, 'user') !== false)) {
            return "Errore autenticazione BRT: credenziali non valide. Verificare BRT_CLIENT_ID e BRT_PASSWORD nel file .env.";
        }

        // Errore generico con messaggio BRT
        if ($message) {
            return "Errore BRT (code: {$code}, {$codeDesc}): {$message}";
        }

        return "Errore BRT sconosciuto (code: {$code}).";
    }
}
