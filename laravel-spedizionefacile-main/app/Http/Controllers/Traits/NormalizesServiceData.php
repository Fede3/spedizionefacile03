<?php

namespace App\Http\Controllers\Traits;

trait NormalizesServiceData
{
    /**
     * Normalizza i dati dei servizi dal frontend al formato DB.
     * - service_type default 'Nessuno'
     * - date/time default stringa vuota
     * - serviceData (camelCase) → service_data (snake_case)
     */
    private function normalizeServiceData(array $servicesData): array
    {
        $servicesData['service_type'] = !empty($servicesData['service_type']) ? $servicesData['service_type'] : 'Nessuno';
        $servicesData['date'] = $servicesData['date'] ?? '';
        $servicesData['time'] = $servicesData['time'] ?? '';
        if (isset($servicesData['serviceData'])) {
            $servicesData['service_data'] = $servicesData['serviceData'];
            unset($servicesData['serviceData']);
        }
        return $servicesData;
    }
}
