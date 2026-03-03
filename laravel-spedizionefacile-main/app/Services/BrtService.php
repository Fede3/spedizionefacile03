<?php
/**
 * FILE: BrtService.php
 * SCOPO: Comunicazione con le API BRT per spedizioni, etichette, tracking e punti PUDO.
 *
 * DOVE SI USA:
 *   - BrtController.php — endpoint HTTP per operazioni BRT
 *   - GenerateBrtLabel.php — listener che genera etichetta automaticamente dopo pagamento
 *   - AdminController.php — regenerateLabel per rigenerazione manuale admin
 *
 * DATI IN INGRESSO:
 *   - Order (con pacchi e indirizzi) per createShipment
 *     Esempio: $brt->createShipment($order, ['is_cod' => true, 'cod_amount' => 1500])
 *   - Options array: is_cod, cod_amount, pudo_id per opzioni spedizione
 *   - numericSenderReference (int) per confirmShipment, deleteShipment
 *   - Indirizzo o coordinate lat/lng per ricerca PUDO
 *
 * DATI IN USCITA:
 *   - Array con success, parcel_id, tracking_url, label_base64, tracking_number, raw_response
 *     Esempio: ['success' => true, 'parcel_id' => '12345', 'label_base64' => 'JVBERi0...']
 *   - Array con punti PUDO (id, nome, indirizzo, coordinate)
 *   - URL di tracking BRT (stringa)
 *
 * VINCOLI:
 *   - Le credenziali BRT (client_id, password) devono essere configurate in config/services.php
 *   - Gli indirizzi devono avere citta', CAP e provincia validi per il routing BRT
 *   - Il CAP deve corrispondere alla citta', altrimenti BRT restituisce errore -63
 *   - Le note BRT sono limitate a 50 caratteri
 *
 * ERRORI TIPICI:
 *   - BRT non configurato: client_id/password vuoti (restituisce success=false)
 *   - Errori API BRT: formato indirizzo non valido, dimensioni fuori range
 *   - SSL: in dev puo' servire verify_ssl=false (config services.brt.verify_ssl)
 *   - Errore -63: citta' non corrisponde al CAP (routing BRT fallito)
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere un nuovo servizio BRT: modificare $serviceMapping in addServicesToPayload()
 *   - Per cambiare il formato dell'etichetta: modificare labelParameters in createShipment()
 *   - Per aggiungere un nuovo paese: aggiungere una riga in countryToIso2()
 *   - Per cambiare il raggio di ricerca PUDO: modificare maxDistanceSearch in getPudoByAddress()
 *
 * COLLEGAMENTI:
 *   - config/services.php — brt.api_url, brt.client_id, brt.password, brt.pudo_token
 *   - app/Http/Controllers/BrtController.php — controller HTTP che delega a questo servizio
 *   - app/Listeners/GenerateBrtLabel.php — generazione automatica post-pagamento
 *   - app/Models/Location.php — tabella localita' usata per normalizzazione indirizzi
 */

namespace App\Services;

use App\Models\Order;
use App\Models\PudoPoint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
class BrtService
{
    private string $apiUrl;        // Indirizzo base delle API BRT per le spedizioni
    private string $pudoApiUrl;    // Indirizzo base delle API BRT per i punti PUDO
    private string $clientId;      // Identificativo cliente BRT (come un "nome utente")
    private string $password;      // Password per accedere alle API BRT
    private string $pudoToken;     // Token di autenticazione per le API PUDO
    private int $departureDepot;   // Codice del deposito BRT di partenza
    private bool $verifySsl;       // Se verificare il certificato SSL (disabilitare solo in dev)

    // Quando viene creato il servizio, leggiamo tutte le configurazioni necessarie
    public function __construct()
    {
        $this->apiUrl = config('services.brt.api_url', 'https://api.brt.it/rest/v1/shipments');
        $this->pudoApiUrl = config('services.brt.pudo_api_url', 'https://api.brt.it');
        $this->clientId = config('services.brt.client_id', '');
        $this->password = config('services.brt.password', '');
        $this->pudoToken = config('services.brt.pudo_token', '');
        $this->departureDepot = (int) config('services.brt.departure_depot', 0);
        $this->verifySsl = (bool) config('services.brt.verify_ssl', true);
    }

    /**
     * createShipment — Crea una spedizione BRT e genera l'etichetta PDF.
     *
     * PERCHE': E' il metodo principale del servizio. Prende un ordine con pacchi e indirizzi,
     *   prepara il payload nel formato richiesto da BRT, e invia la richiesta HTTP.
     *
     * COME LEGGERLO:
     *   1. Caricamento dati (loadMissing) e validazione campi obbligatori
     *   2. Normalizzazione indirizzo (citta' maiuscolo, CAP 5 cifre, provincia 2 lettere)
     *   3. Costruzione payload JSON per API BRT
     *   4. Invio richiesta HTTP e parsing risposta
     *   5. Estrazione etichetta PDF e dati tracking dalla risposta
     *
     * COME MODIFICARLO:
     *   - Per aggiungere campi al payload: modificare l'array $payload['createData']
     *   - Per cambiare la logica contrassegno: modificare il blocco if is_cod
     *   - Per cambiare il formato etichetta: modificare labelParameters
     *
     * COSA EVITARE:
     *   - Non rimuovere la normalizzazione indirizzi (causa errore -63 routing BRT)
     *   - Non loggare la password BRT (gia' mascherata nel log)
     *   - Non aumentare il timeout oltre 30s (BRT risponde tipicamente in 5-15s)
     *
     * @param Order $order  L'ordine (con pacchi e indirizzi caricati)
     * @param array $options  Opzioni aggiuntive: contrassegno (is_cod, cod_amount), punto PUDO, note
     * @return array  Risultato con: success, parcel_id, label_base64, tracking_url, error
     */
    public function createShipment(Order $order, array $options = []): array
    {
        // Carichiamo i dati collegati all'ordine (pacchi, indirizzi, utente, servizi)
        $order->loadMissing(['packages.originAddress', 'packages.destinationAddress', 'packages.service', 'user']);

        // Prendiamo il primo pacco dell'ordine (per gli indirizzi)
        $package = $order->packages->first();
        if (!$package) {
            return ['success' => false, 'error' => 'Nessun collo trovato nell\'ordine.'];
        }

        $origin = $package->originAddress;
        $destination = $package->destinationAddress;

        if (!$origin || !$destination) {
            return ['success' => false, 'error' => 'Indirizzi di partenza o destinazione mancanti.'];
        }

        // Calcoliamo il peso totale di tutti i pacchi dell'ordine
        $totalWeight = $order->packages->sum(function ($pkg) {
            return (float) preg_replace('/[^0-9.]/', '', $pkg->weight ?? '0');
        });
        // Calcoliamo il numero totale di colli (pacchi)
        $totalParcels = $order->packages->sum(function ($pkg) {
            return max(1, (int) ($pkg->quantity ?? 1));
        });

        // Usiamo l'ID dell'ordine come riferimento numerico per BRT
        $numericSenderReference = $order->id;

        // Validazione dati obbligatori prima di inviare a BRT
        $missingFields = [];
        if (empty(trim($destination->name ?? ''))) $missingFields[] = 'nome destinatario';
        if (empty(trim(($destination->address ?? '') . ' ' . ($destination->address_number ?? '')))) $missingFields[] = 'indirizzo destinatario';
        if (empty(trim($destination->postal_code ?? ''))) $missingFields[] = 'CAP destinatario';
        if (empty(trim($destination->city ?? ''))) $missingFields[] = 'città destinatario';
        if (empty(trim($destination->province ?? ''))) $missingFields[] = 'provincia destinatario';

        if (!empty($missingFields)) {
            return ['success' => false, 'error' => 'Dati mancanti per BRT: ' . implode(', ', $missingFields) . '.'];
        }

        // Normalizziamo i dati dell'indirizzo per il formato richiesto da BRT
        // BRT richiede: citta' in MAIUSCOLO, CAP a 5 cifre, provincia a 2 lettere
        $normalizedDest = $this->normalizeAddressForBrt($destination);

        // Prepariamo i dati da inviare a BRT nel formato richiesto dalla loro API
        $payload = [
            'account' => [
                'userID' => $this->clientId,
                'password' => $this->password,
            ],
            'createData' => [
                // departureDepot: codice filiale BRT di partenza. Il valore 0 è placeholder,
                // va configurato con il codice filiale reale assegnato da BRT (es. 53 per Milano).
                // Contattare BRT per ottenere il codice filiale corretto.
                'departureDepot' => $this->departureDepot,
                'senderCustomerCode' => (int) $this->clientId,
                // 'network' rimosso: campo opzionale, stringa vuota causava errori di validazione BRT
                'deliveryFreightTypeCode' => $options['delivery_freight_type'] ?? 'DAP', // DAP = consegnato a destinazione
                'consigneeCompanyName' => $destination->name ?? '',          // Nome del destinatario
                'consigneeAddress' => trim(($destination->address ?? '') . ' ' . ($destination->address_number ?? '')),
                'consigneeZIPCode' => $normalizedDest['postal_code'],       // CAP (5 cifre, zero-padded)
                'consigneeCity' => $normalizedDest['city'],                 // Citta' (MAIUSCOLO, normalizzata)
                'consigneeProvinceAbbreviation' => $normalizedDest['province'], // Provincia (sigla a 2 lettere)
                'consigneeCountryAbbreviationISOAlpha2' => $this->countryToIso2($destination->country ?? 'Italia'), // Paese ISO Alpha-2
                'consigneeContactName' => $destination->name ?? '',
                'consigneeTelephone' => $destination->telephone_number ?? '',
                'consigneeEMail' => $destination->email ?? ($order->user->email ?? ''),
                'consigneeMobilePhoneNumber' => $destination->telephone_number ?? '',
                'numberOfParcels' => $totalParcels,                          // Numero di colli
                'weightKG' => max(1, (int) ceil($totalWeight)),              // Peso in kg (minimo 1)
                'numericSenderReference' => $numericSenderReference,
                'alphanumericSenderReference' => 'SF-' . str_pad($order->id, 6, '0', STR_PAD_LEFT), // Es. "SF-000042"
                'notes' => $this->buildNotes($order, $options),
                'isAlertRequired' => '1',        // Richiedi notifiche al destinatario
                'isCODMandatory' => '0',         // Contrassegno non obbligatorio (di default)
            ],
            'isLabelRequired' => 1,              // Vogliamo l'etichetta PDF
            'labelParameters' => [
                'outputType' => 'PDF',
                'offsetX' => 0,
                'offsetY' => 0,
                'isBorderRequired' => 0,
                'isLogoRequired' => 1,           // Includi il logo BRT nell'etichetta
                'isBarcodeControlRowRequired' => 1,
            ],
        ];

        // Se la spedizione e' in contrassegno (pagamento alla consegna),
        // aggiungiamo i dati necessari
        if (!empty($options['is_cod']) && !empty($options['cod_amount'])) {
            $payload['createData']['isCODMandatory'] = '1';
            $payload['createData']['cashOnDelivery'] = (float) ($options['cod_amount'] / 100); // Da centesimi a euro
            $payload['createData']['codPaymentType'] = $options['cod_payment_type'] ?? 'BM';   // BM = Bollettino Postale
            $payload['createData']['codCurrency'] = 'EUR';
        }

        // Se la consegna e' presso un punto PUDO, aggiungiamo l'ID del punto
        if (!empty($options['pudo_id'])) {
            $payload['createData']['pudoId'] = $options['pudo_id'];
        }

        // Aggiungiamo i servizi/accessori selezionati dall'utente al payload BRT
        $this->addServicesToPayload($payload, $order, $options);

        try {
            // Log del payload inviato (senza password) per debug
            $payloadForLog = $payload;
            $payloadForLog['account']['password'] = '***';
            Log::info('BRT createShipment request', [
                'order_id' => $order->id,
                'payload' => $payloadForLog,
            ]);

            // Inviamo la richiesta alle API BRT (con timeout di 30 secondi)
            $response = Http::withOptions(['verify' => $this->verifySsl])
                ->timeout(30)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($this->apiUrl . '/shipment', $payload);

            $body = $response->json();
            $rawBody = $response->body();

            // La risposta BRT puo' avere due formati:
            // 1. { "createResponse": { "executionMessage": {...}, "labels": {...}, ... } }
            // 2. { "executionMessage": {...}, "labels": {...}, ... }
            // Normalizziamo estraendo sempre il contenuto di createResponse se presente
            $responseData = $body['createResponse'] ?? $body;

            // Registriamo la risposta completa nei log per debug
            Log::info('BRT createShipment response', [
                'order_id' => $order->id,
                'http_status' => $response->status(),
                'response_data' => $responseData,
            ]);

            // Se la risposta HTTP non e' positiva, restituiamo l'errore
            if (!$response->successful()) {
                $errorMsg = $responseData['executionMessage']['message'] ?? 'Errore API BRT (HTTP ' . $response->status() . ')';
                return ['success' => false, 'error' => $errorMsg];
            }

            // Controlliamo il codice di esecuzione nella risposta BRT
            // Se e' negativo, c'e' stato un errore
            $execCode = $responseData['executionMessage']['code'] ?? -1;
            if ($execCode < 0) {
                $message = $responseData['executionMessage']['message'] ?? '';
                $codeDesc = $responseData['executionMessage']['codeDesc'] ?? '';

                // Creiamo un messaggio di errore leggibile in italiano
                $errorMsg = $this->translateBrtError($execCode, $codeDesc, $message, $payload['createData'] ?? []);

                // Aggiungiamo dettagli utili per il debug nei log
                Log::warning('BRT createShipment error response', [
                    'order_id' => $order->id,
                    'exec_code' => $execCode,
                    'exec_code_desc' => $codeDesc,
                    'exec_message' => $message,
                    'payload_sent' => [
                        'consigneeCity' => $payload['createData']['consigneeCity'] ?? '',
                        'consigneeZIPCode' => $payload['createData']['consigneeZIPCode'] ?? '',
                        'consigneeProvinceAbbreviation' => $payload['createData']['consigneeProvinceAbbreviation'] ?? '',
                        'consigneeAddress' => $payload['createData']['consigneeAddress'] ?? '',
                        'departureDepot' => $payload['createData']['departureDepot'] ?? 0,
                    ],
                ]);
                return ['success' => false, 'error' => $errorMsg];
            }

            // Estraiamo i dati dell'etichetta dalla risposta
            // BRT restituisce le etichette in: createResponse.labels.label[] (array)
            $parcelId = '';
            $labelBase64 = '';
            $labels = $responseData['labels']['label'] ?? $responseData['labels'] ?? [];
            if (!empty($labels) && is_array($labels)) {
                $firstLabel = $labels[0] ?? null;
                if ($firstLabel) {
                    $parcelId = $firstLabel['parcelID'] ?? $firstLabel['parcelId'] ?? '';
                    $labelBase64 = $firstLabel['stream'] ?? '';
                }
            }

            // Estraiamo i dati di routing/tracking dalla risposta BRT
            // Questi campi si trovano direttamente nella createResponse
            $parcelNumberFrom = (string) ($responseData['parcelNumberFrom'] ?? '');
            $parcelNumberTo = (string) ($responseData['parcelNumberTo'] ?? '');
            $departureDepot = (string) ($responseData['departureDepot'] ?? '');
            $arrivalTerminal = (string) ($responseData['arrivalTerminal'] ?? '');
            $arrivalDepot = (string) ($responseData['arrivalDepot'] ?? '');
            $deliveryZone = (string) ($responseData['deliveryZone'] ?? '');
            $seriesNumber = (string) ($responseData['seriesNumber'] ?? '');
            $serviceType = (string) ($responseData['serviceType'] ?? '');

            // Il numero di tracking principale e' parcelNumberFrom
            // Se non presente, usiamo il parcelId dall'etichetta come fallback
            $trackingNumber = $parcelNumberFrom ?: $parcelId;

            // URL di tracking BRT usando il formato VAS (Visual Automated System)
            // che accetta il numero di collo (parcelNumber) come riferimento
            $trackingUrl = '';
            if ($trackingNumber) {
                $trackingUrl = 'https://vas.brt.it/vas/sped_det_show.hsm?refnr=' . urlencode($trackingNumber) . '&tiession=';
            }

            Log::info('BRT createShipment tracking data extracted', [
                'order_id' => $order->id,
                'parcel_id' => $parcelId,
                'tracking_number' => $trackingNumber,
                'parcel_number_from' => $parcelNumberFrom,
                'parcel_number_to' => $parcelNumberTo,
                'departure_depot' => $departureDepot,
                'arrival_terminal' => $arrivalTerminal,
                'arrival_depot' => $arrivalDepot,
                'delivery_zone' => $deliveryZone,
                'series_number' => $seriesNumber,
                'service_type' => $serviceType,
            ]);

            return [
                'success' => true,
                'parcel_id' => $parcelId,
                'numeric_sender_reference' => $numericSenderReference,
                'label_base64' => $labelBase64,
                'tracking_url' => $trackingUrl,
                'tracking_number' => $trackingNumber,
                'parcel_number_from' => $parcelNumberFrom,
                'parcel_number_to' => $parcelNumberTo,
                'departure_depot' => $departureDepot,
                'arrival_terminal' => $arrivalTerminal,
                'arrival_depot' => $arrivalDepot,
                'delivery_zone' => $deliveryZone,
                'series_number' => $seriesNumber,
                'service_type' => $serviceType,
                'raw_response' => $body,
            ];
        } catch (\Exception $e) {
            // Se c'e' un errore di connessione o altro, lo registriamo e restituiamo l'errore
            Log::error('BRT createShipment exception', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
            return ['success' => false, 'error' => 'Errore di connessione BRT: ' . $e->getMessage()];
        }
    }

    /**
     * Test di creazione spedizione BRT senza ordine reale.
     * Invia una richiesta di test all'API BRT e restituisce la risposta completa.
     */
    public function testCreateShipment(array $data): array
    {
        $numericSenderReference = (int) (time() % 1000000000);

        // Normalizziamo i dati anche nel test per coerenza
        $testAddress = (object) [
            'city' => $data['consignee_city'] ?? '',
            'postal_code' => $data['consignee_zip'] ?? '',
            'province' => $data['consignee_province'] ?? '',
        ];
        $normalizedTest = $this->normalizeAddressForBrt($testAddress);

        $payload = [
            'account' => [
                'userID' => $this->clientId,
                'password' => $this->password,
            ],
            'createData' => [
                'departureDepot' => $this->departureDepot,
                'senderCustomerCode' => (int) $this->clientId,
                'deliveryFreightTypeCode' => 'DAP',
                'consigneeCompanyName' => $data['consignee_name'],
                'consigneeAddress' => $data['consignee_address'],
                'consigneeZIPCode' => $normalizedTest['postal_code'],
                'consigneeCity' => $normalizedTest['city'],
                'consigneeProvinceAbbreviation' => $normalizedTest['province'],
                'consigneeCountryAbbreviationISOAlpha2' => $data['consignee_country'],
                'consigneeContactName' => $data['consignee_name'],
                'consigneeTelephone' => $data['consignee_phone'] ?? '',
                'consigneeEMail' => $data['consignee_email'] ?? '',
                'consigneeMobilePhoneNumber' => $data['consignee_phone'] ?? '',
                'numberOfParcels' => (int) ($data['parcels'] ?? 1),
                'weightKG' => max(1, (int) ($data['weight_kg'] ?? 1)),
                'numericSenderReference' => $numericSenderReference,
                'alphanumericSenderReference' => 'TEST-' . $numericSenderReference,
                'notes' => $data['notes'] ?? 'Test SpedizioneFacile',
                'isAlertRequired' => '1',
                'isCODMandatory' => '0',
            ],
            'isLabelRequired' => 1,
            'labelParameters' => [
                'outputType' => 'PDF',
                'offsetX' => 0,
                'offsetY' => 0,
                'isBorderRequired' => 0,
                'isLogoRequired' => 1,
                'isBarcodeControlRowRequired' => 1,
            ],
        ];

        try {
            Log::info('BRT TEST createShipment request', ['payload' => array_merge($payload, ['account' => ['userID' => $this->clientId, 'password' => '***']])]);

            $response = Http::withOptions(['verify' => $this->verifySsl])
                ->timeout(30)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($this->apiUrl . '/shipment', $payload);

            $body = $response->json();

            Log::info('BRT TEST createShipment response', ['http_status' => $response->status(), 'body' => $body]);

            // Controlliamo il codice nella risposta
            // La risposta BRT ha struttura: createResponse > executionMessage > code
            $createResponse = $body['createResponse'] ?? $body;
            $execCode = $createResponse['executionMessage']['code'] ?? $body['executionMessage']['code'] ?? -1;

            if ($execCode < 0) {
                return [
                    'success' => false,
                    'error' => $createResponse['executionMessage']['message'] ?? 'Errore BRT',
                    'exec_code' => $execCode,
                    'raw_response' => $body,
                    'payload_sent' => array_merge($payload, ['account' => ['userID' => $this->clientId, 'password' => '***']]),
                ];
            }

            // Estraiamo l'etichetta
            $labels = $createResponse['labels']['label'] ?? $body['labels'] ?? [];
            $labelBase64 = '';
            $parcelId = '';
            if (!empty($labels) && is_array($labels)) {
                $first = $labels[0] ?? null;
                if ($first) {
                    $parcelId = $first['parcelID'] ?? $first['parcelId'] ?? '';
                    $labelBase64 = $first['stream'] ?? '';
                }
            }

            return [
                'success' => true,
                'parcel_id' => $parcelId,
                'label_base64' => $labelBase64,
                'tracking_url' => $parcelId ? 'https://www.brt.it/it/tracking?parcelId=' . urlencode($parcelId) : '',
                'raw_response' => $body,
            ];
        } catch (\Exception $e) {
            Log::error('BRT TEST createShipment exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Errore connessione BRT: ' . $e->getMessage()];
        }
    }

    /**
     * Conferma una spedizione BRT (modalita' di conferma esplicita).
     * Alcune configurazioni BRT richiedono una conferma separata dopo la creazione.
     */
    public function confirmShipment(int $numericSenderReference): array
    {
        $payload = [
            'account' => [
                'userID' => $this->clientId,
                'password' => $this->password,
            ],
            'confirmData' => [
                'senderCustomerCode' => (int) $this->clientId,
                'numericSenderReference' => $numericSenderReference,
            ],
        ];

        try {
            $response = Http::withOptions(['verify' => $this->verifySsl])
                ->timeout(30)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->put($this->apiUrl . '/shipment', $payload);

            $body = $response->json();

            Log::info('BRT confirmShipment response', [
                'reference' => $numericSenderReference,
                'body' => $body,
            ]);

            $execCode = $body['executionMessage']['code'] ?? -1;
            if ($execCode < 0) {
                return ['success' => false, 'error' => $body['executionMessage']['message'] ?? 'Errore conferma BRT.'];
            }

            return ['success' => true, 'raw_response' => $body];
        } catch (\Exception $e) {
            Log::error('BRT confirmShipment exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Elimina una spedizione BRT.
     * Utile se l'admin vuole annullare una spedizione gia' creata.
     */
    public function deleteShipment(int $numericSenderReference): array
    {
        $payload = [
            'account' => [
                'userID' => $this->clientId,
                'password' => $this->password,
            ],
            'deleteData' => [
                'senderCustomerCode' => (int) $this->clientId,
                'numericSenderReference' => $numericSenderReference,
            ],
        ];

        try {
            $response = Http::withOptions(['verify' => $this->verifySsl])
                ->timeout(30)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->put($this->apiUrl . '/delete', $payload);

            $body = $response->json();
            $execCode = $body['executionMessage']['code'] ?? -1;

            return [
                'success' => $execCode >= 0,
                'error' => $execCode < 0 ? ($body['executionMessage']['message'] ?? 'Errore') : null,
                'raw_response' => $body,
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Cerca punti PUDO (Pick Up Drop Off) per indirizzo.
     * I PUDO sono negozi convenzionati (tabaccai, edicole, ecc.) dove si possono
     * ritirare o consegnare i pacchi. Comodo per chi non e' a casa durante la consegna.
     *
     * Cerca in un raggio di 10 km dall'indirizzo specificato.
     * FALLBACK: Se l'API BRT fallisce, usa il database locale con punti PUDO mock.
     */
    public function getPudoByAddress(string $address, string $zipCode, string $city, string $countryCode = 'ITA', int $maxResults = 10): array
    {
        try {
            // Costruiamo gli header — il token è opzionale per gli endpoint "open"
            $headers = ['Accept' => 'application/json'];
            if (!empty($this->pudoToken)) {
                $headers['X-API-Auth'] = $this->pudoToken;
            }

            // withoutVerifying(): BRT usa un certificato self-signed nella chain SSL,
            // senza questo flag cURL restituisce errore 60 e la richiesta fallisce.
            $response = Http::timeout(15)
                ->withoutVerifying()
                ->withHeaders($headers)
                ->get($this->pudoApiUrl . '/pudo/v1/open/pickup/get-pudo-by-address', [
                    'address' => $address,
                    'zipCode' => $zipCode,
                    'city' => $city,
                    'countryCode' => $countryCode,       // ISO 3166-1 alpha-3 (es. ITA, DEU, FRA)
                    'max_pudo_number' => $maxResults,
                    'maxDistanceSearch' => 10000,         // Raggio di ricerca in metri (max 50000)
                ]);

            $body = $response->json();

            if (!$response->successful()) {
                Log::warning('BRT PUDO API error - using fallback', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'city' => $city,
                    'zip' => $zipCode,
                ]);
                // FALLBACK: usa database locale
                return $this->getPudoFromDatabase($city, $zipCode, $maxResults);
            }

            $pudoList = $body['pudo'] ?? [];

            // Se l'API non restituisce risultati, prova il fallback
            if (empty($pudoList)) {
                Log::info('BRT PUDO API returned no results - using fallback', ['city' => $city, 'zip' => $zipCode]);
                return $this->getPudoFromDatabase($city, $zipCode, $maxResults);
            }

            // Formattiamo i dati dei punti PUDO per il frontend
            return [
                'success' => true,
                'pudo' => array_map(fn($p) => [
                    'pudo_id' => $p['pudoId'] ?? '',
                    'carrier_pudo_id' => $p['carrierPudoId'] ?? '',
                    'name' => $p['pointName'] ?? '',                      // Nome del punto PUDO
                    'address' => $p['fullAddress'] ?? (($p['street'] ?? '') . ' ' . ($p['streetNumber'] ?? '')),
                    'city' => $p['town'] ?? '',
                    'zip_code' => $p['zipCode'] ?? '',
                    'province' => $p['state'] ?? '',
                    'country' => $p['country'] ?? 'ITA',
                    'latitude' => $p['latitude'] ?? null,                // Coordinate GPS
                    'longitude' => $p['longitude'] ?? null,
                    'distance_meters' => $p['distanceFromPoint'] ?? null, // Distanza in metri
                    'enabled' => $p['enabled'] ?? true,
                    'opening_hours' => $p['hours'] ?? [],                // Orari di apertura
                    'localization_hint' => $p['localizationHint'] ?? '', // Indicazioni per trovare il punto
                ], $pudoList),
            ];
        } catch (\Exception $e) {
            Log::error('BRT PUDO exception - using fallback', ['error' => $e->getMessage(), 'city' => $city, 'zip' => $zipCode]);
            // FALLBACK: usa database locale
            return $this->getPudoFromDatabase($city, $zipCode, $maxResults);
        }
    }

    /**
     * Cerca punti PUDO per coordinate GPS (latitudine e longitudine).
     * Utile quando l'utente condivide la propria posizione dal telefono.
     * FALLBACK: Se l'API BRT fallisce, usa il database locale con punti PUDO mock.
     */
    public function getPudoByCoordinates(float $latitude, float $longitude, int $maxResults = 10): array
    {
        try {
            // withoutVerifying(): certificato self-signed BRT (vedi searchPudo)
            $response = Http::timeout(15)
                ->withoutVerifying()
                ->withHeaders([
                    'X-API-Auth' => $this->pudoToken,
                    'Accept' => 'application/json',
                ])
                ->get($this->pudoApiUrl . '/pudo/v1/open/pickup/get-pudo-by-lat-lng', [
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'max_pudo_number' => $maxResults,
                    'maxDistanceSearch' => 10000,        // Raggio di ricerca in metri (max 50000)
                ]);

            $body = $response->json();

            if (!$response->successful()) {
                Log::warning('BRT PUDO coordinates API error - using fallback', [
                    'status' => $response->status(),
                    'lat' => $latitude,
                    'lng' => $longitude,
                ]);
                // FALLBACK: usa database locale
                return $this->getPudoFromDatabaseByCoordinates($latitude, $longitude, $maxResults);
            }

            $pudoList = $body['pudo'] ?? [];

            // Se l'API non restituisce risultati, prova il fallback
            if (empty($pudoList)) {
                Log::info('BRT PUDO coordinates API returned no results - using fallback', ['lat' => $latitude, 'lng' => $longitude]);
                return $this->getPudoFromDatabaseByCoordinates($latitude, $longitude, $maxResults);
            }

            return [
                'success' => true,
                'pudo' => array_map(fn($p) => [
                    'pudo_id' => $p['pudoId'] ?? '',
                    'carrier_pudo_id' => $p['carrierPudoId'] ?? '',
                    'name' => $p['pointName'] ?? '',
                    'address' => $p['fullAddress'] ?? (($p['street'] ?? '') . ' ' . ($p['streetNumber'] ?? '')),
                    'city' => $p['town'] ?? '',
                    'zip_code' => $p['zipCode'] ?? '',
                    'province' => $p['state'] ?? '',
                    'country' => $p['country'] ?? 'ITA',
                    'latitude' => $p['latitude'] ?? null,
                    'longitude' => $p['longitude'] ?? null,
                    'distance_meters' => $p['distanceFromPoint'] ?? null,
                    'enabled' => $p['enabled'] ?? true,
                    'opening_hours' => $p['hours'] ?? [],
                    'localization_hint' => $p['localizationHint'] ?? '',
                ], $pudoList),
            ];
        } catch (\Exception $e) {
            Log::error('BRT PUDO coordinates exception - using fallback', ['error' => $e->getMessage(), 'lat' => $latitude, 'lng' => $longitude]);
            // FALLBACK: usa database locale
            return $this->getPudoFromDatabaseByCoordinates($latitude, $longitude, $maxResults);
        }
    }

    /**
     * Mostra i dettagli di un punto PUDO specifico (orari completi, servizi disponibili, ecc.).
     */
    public function getPudoDetails(string $pudoId): array
    {
        try {
            // withoutVerifying(): certificato self-signed BRT (vedi searchPudo)
            $response = Http::timeout(15)
                ->withoutVerifying()
                ->withHeaders([
                    'X-API-Auth' => $this->pudoToken,
                    'Accept' => 'application/json',
                ])
                ->get($this->pudoApiUrl . '/pudo/v1/open/pickup/get-pudo-details', [
                    'pudoId' => $pudoId,
                ]);

            $body = $response->json();

            if (!$response->successful()) {
                return ['success' => false, 'error' => 'Errore PUDO details API'];
            }

            return ['success' => true, 'pudo' => $body];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Genera l'URL per seguire il tracking di un pacco BRT.
     * Usa il sistema VAS di BRT che accetta il numero di collo come riferimento.
     * Il tracking permette di vedere dove si trova il pacco in tempo reale.
     *
     * @param string $parcelNumber  Il numero di collo BRT (parcelNumberFrom) o parcelId
     */
    public function getTrackingUrl(string $parcelNumber): string
    {
        if (empty($parcelNumber)) {
            return '';
        }
        return 'https://vas.brt.it/vas/sped_det_show.hsm?refnr=' . urlencode($parcelNumber) . '&tiession=';
    }

    /**
     * addServicesToPayload — Mappa i servizi dell'app ai parametri API BRT.
     *
     * PERCHE': I servizi dell'applicazione (dalla tabella "services") hanno nomi diversi
     *   dai parametri dell'API BRT. Questa funzione traduce i nomi (es. "consegna al piano"
     *   diventa il campo BRT 'particularitiesDeliveryManagement' con valore 'CP').
     *
     * COME LEGGERLO:
     *   1. Definizione mappa servizio app → parametro BRT ($serviceMapping)
     *   2. Ciclo sui pacchi dell'ordine per raccogliere i servizi richiesti
     *   3. Aggiunta opzioni extra (assicurazione, appuntamento) dalle $options
     *   4. Log dei servizi applicati per debug
     *
     * COME MODIFICARLO:
     *   - Per aggiungere un nuovo servizio: aggiungere una riga in $serviceMapping
     *   - Per cambiare il codice BRT di un servizio: modificare il 'value' nella mappa
     *
     * COSA EVITARE:
     *   - Non sovrascrivere campi gia' impostati (controllato con isset)
     *   - Non rimuovere il log dei servizi non mappati (utile per trovare servizi mancanti)
     *
     * @param array &$payload  Il payload da inviare a BRT (modificato per riferimento)
     * @param Order $order     L'ordine con i pacchi e servizi caricati
     * @param array $options   Opzioni aggiuntive passate dal chiamante
     */
    private function addServicesToPayload(array &$payload, Order $order, array $options): void
    {
        // Mappa dei nomi di servizio dell'applicazione -> parametri API BRT
        // I nomi sono normalizzati in minuscolo per la comparazione
        $serviceMapping = [
            'consegna al piano'     => ['field' => 'particularitiesDeliveryManagement', 'value' => 'CP'],
            'delivery al piano'     => ['field' => 'particularitiesDeliveryManagement', 'value' => 'CP'],
            'ritiro al piano'       => ['field' => 'particularitiesPickupManagement', 'value' => 'RP'],
            'pickup al piano'       => ['field' => 'particularitiesPickupManagement', 'value' => 'RP'],
            'express'               => ['field' => 'serviceType', 'value' => 'E'],
            'priority'              => ['field' => 'serviceType', 'value' => 'P'],
            '10:30'                 => ['field' => 'serviceType', 'value' => 'O'],
            'economy'               => ['field' => 'serviceType', 'value' => 'N'],
        ];

        // Raccogliamo tutti i tipi di servizio dai pacchi dell'ordine
        $appliedServices = [];
        foreach ($order->packages as $package) {
            if ($package->service && !empty($package->service->service_type)) {
                $serviceType = mb_strtolower(trim($package->service->service_type), 'UTF-8');

                if (isset($serviceMapping[$serviceType])) {
                    $mapping = $serviceMapping[$serviceType];
                    $field = $mapping['field'];
                    $value = $mapping['value'];

                    // Evitiamo di sovrascrivere campi gia' impostati
                    if (!isset($payload['createData'][$field])) {
                        $payload['createData'][$field] = $value;
                        $appliedServices[] = [
                            'app_service' => $package->service->service_type,
                            'brt_field' => $field,
                            'brt_value' => $value,
                        ];
                    }
                } else {
                    // Servizio non mappato: lo registriamo per debug
                    // cosi' possiamo vedere nei log quali servizi mancano nella mappa
                    Log::info('BRT service not mapped', [
                        'order_id' => $order->id,
                        'service_type' => $package->service->service_type,
                        'available_mappings' => array_keys($serviceMapping),
                    ]);
                }
            }
        }

        // Servizi aggiuntivi passati nelle opzioni (dal chiamante)
        if (!empty($options['insurance_amount'])) {
            $payload['createData']['insuranceAmount'] = (float) ($options['insurance_amount'] / 100); // Da centesimi a euro
            $appliedServices[] = [
                'app_service' => 'assicurazione',
                'brt_field' => 'insuranceAmount',
                'brt_value' => $payload['createData']['insuranceAmount'],
            ];
        }

        if (!empty($options['delivery_appointment'])) {
            $payload['createData']['isAlertRequired'] = '1';
            $payload['createData']['particularitiesDeliveryManagement'] =
                $payload['createData']['particularitiesDeliveryManagement'] ?? 'AP'; // AP = Appuntamento
            $appliedServices[] = [
                'app_service' => 'appuntamento_consegna',
                'brt_field' => 'particularitiesDeliveryManagement',
                'brt_value' => 'AP',
            ];
        }

        // Logghiamo i servizi applicati per debug e monitoraggio
        if (!empty($appliedServices)) {
            Log::info('BRT services applied to shipment', [
                'order_id' => $order->id,
                'services' => $appliedServices,
            ]);
        }
    }

    /**
     * normalizeAddressForBrt — Normalizza indirizzo per il sistema di routing BRT.
     *
     * PERCHE': BRT rifiuta indirizzi non normalizzati con errore -63 (routing fallito).
     *   Senza questa funzione, "S. Giovanni Lupatoto" fallirebbe perche' BRT vuole
     *   "SAN GIOVANNI LUPATOTO". Stessa cosa per CAP senza zero iniziale o provincia estesa.
     *
     * COME LEGGERLO:
     *   1. Normalizza CAP: solo cifre, zero-padded a 5 caratteri
     *   2. Normalizza provincia: converte nome completo in sigla 2 lettere
     *   3. Normalizza citta': maiuscolo + espansione abbreviazioni (S. → SAN)
     *   4. Verifica con database locations: se il CAP e' noto, usa il nome citta' dal DB
     *
     * COME MODIFICARLO:
     *   - Per aggiungere abbreviazioni: modificare $abbreviations in normalizeCityName()
     *   - Per cambiare la strategia di matching: modificare resolveCityFromLocations()
     *
     * COSA EVITARE:
     *   - Non rimuovere lo step 4 (risoluzione da DB): risolve molti casi ambigui
     *   - Non rendere lo step 4 obbligatorio: se la tabella locations non esiste, deve continuare
     *
     * @param object $address  L'oggetto indirizzo (PackageAddress) con city, postal_code, province
     * @return array  Array con chiavi: city, postal_code, province (normalizzati per BRT)
     */
    private function normalizeAddressForBrt(object $address): array
    {
        $city = trim($address->city ?? '');
        $postalCode = trim($address->postal_code ?? '');
        $province = trim($address->province ?? '');

        // 1. Normalizza il CAP: solo cifre, zero-padded a 5 caratteri
        $postalCode = preg_replace('/[^0-9]/', '', $postalCode);
        $postalCode = str_pad($postalCode, 5, '0', STR_PAD_LEFT);

        // 2. Normalizza la provincia (sigla a 2 lettere)
        $province = $this->provinceToAbbreviation($province);

        // 3. Normalizza la citta': maiuscolo e abbreviazioni espanse
        $city = $this->normalizeCityName($city);

        // 4. Prova a trovare la citta' corretta dal database locations usando il CAP
        //    Questo risolve i casi in cui l'utente ha scritto il nome della citta'
        //    in modo diverso da quello che BRT si aspetta (es. "S. Giovanni" vs "SAN GIOVANNI")
        //    Nota: se la tabella locations non esiste, saltiamo questo step senza errori
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('locations')) {
                $city = $this->resolveCityFromLocations($city, $postalCode, $province);
            }
        } catch (\Exception $e) {
            // Se la tabella non esiste o c'e' un errore DB, continuiamo con la citta' normalizzata
            Log::debug('BRT normalizeAddress: locations table not available', ['error' => $e->getMessage()]);
        }

        return [
            'city' => $city,
            'postal_code' => $postalCode,
            'province' => $province,
        ];
    }

    /**
     * Normalizza il nome della citta' per BRT:
     * - Converte in maiuscolo
     * - Espande le abbreviazioni comuni italiane
     * - Rimuove spazi multipli e caratteri non necessari
     */
    private function normalizeCityName(string $city): string
    {
        // Converti in maiuscolo
        $city = mb_strtoupper(trim($city), 'UTF-8');

        // Espandi abbreviazioni comuni italiane usate nei nomi di citta'
        // L'ordine e' importante: prima le piu' specifiche, poi le piu' generiche
        $abbreviations = [
            '/\bSS\.\s*/u' => 'SANTISSIMO ',
            '/\bS\.S\.\s*/u' => 'SANTISSIMO ',
            '/\bS\.\s*/u' => 'SAN ',
            '/\bSTA\.\s*/u' => 'SANTA ',
            '/\bSTO\.\s*/u' => 'SANTO ',
            '/\bV\.LE\s*/u' => 'VIALE ',
            '/\bP\.ZZA\s*/u' => 'PIAZZA ',
            '/\bC\.SO\s*/u' => 'CORSO ',
            '/\bF\.LLI\s*/u' => 'FRATELLI ',
            '/\bMTE\.\s*/u' => 'MONTE ',
        ];

        foreach ($abbreviations as $pattern => $replacement) {
            $city = preg_replace($pattern, $replacement, $city);
        }

        // Rimuovi spazi multipli
        $city = preg_replace('/\s+/', ' ', trim($city));

        return $city;
    }

    /**
     * resolveCityFromLocations — Risolve il nome citta' corretto dal database locations.
     *
     * PERCHE': L'utente potrebbe scrivere "S. Giovanni" ma BRT vuole "SAN GIOVANNI LUPATOTO".
     *   Il database locations contiene i nomi ufficiali del sistema postale italiano,
     *   che corrispondono a quelli usati dal routing BRT.
     *
     * COME LEGGERLO:
     *   1. Match esatto: CAP + nome citta' (conferma dati corretti)
     *   2. Un solo risultato per CAP: usa quello (caso piu' comune)
     *   3. Match parziale: una citta' contiene l'altra (es. "REGGIO" in "REGGIO EMILIA")
     *   4. Match per provincia: se ci sono piu' citta' con lo stesso CAP, preferisce quella con provincia giusta
     *   5. Nessun match: restituisce la citta' originale (fallback sicuro)
     *
     * COME MODIFICARLO:
     *   - Per aggiungere un criterio di matching: aggiungere un blocco prima del return finale
     *   - La strategia e' in ordine di priorita', i primi match vincono
     *
     * COSA EVITARE:
     *   - Non lanciare eccezioni: se il DB non funziona, restituire la citta' originale
     *   - Non cambiare l'ordine degli step senza testare (il match esatto deve restare primo)
     */
    private function resolveCityFromLocations(string $normalizedCity, string $postalCode, string $province): string
    {
        if (empty($postalCode) || $postalCode === '00000') {
            return $normalizedCity;
        }

        try {
            // 1. Corrispondenza esatta: CAP + nome citta' (case-insensitive)
            $exactMatch = \App\Models\Location::where('postal_code', $postalCode)
                ->whereRaw('UPPER(place_name) = ?', [$normalizedCity])
                ->first();

            if ($exactMatch) {
                // I dati sono corretti, restituisci il nome dal database in maiuscolo
                return mb_strtoupper($exactMatch->place_name, 'UTF-8');
            }

            // 2. Cerca tutte le citta' con questo CAP
            $citiesByZip = \App\Models\Location::where('postal_code', $postalCode)->get();

            if ($citiesByZip->isEmpty()) {
                // CAP non trovato nel database, restituisci la citta' com'e'
                Log::warning('BRT address normalization: ZIP code not found in locations database', [
                    'postal_code' => $postalCode,
                    'city' => $normalizedCity,
                ]);
                return $normalizedCity;
            }

            // Se c'e' un solo risultato per questo CAP, usa quello
            if ($citiesByZip->count() === 1) {
                $resolved = mb_strtoupper($citiesByZip->first()->place_name, 'UTF-8');
                if ($resolved !== $normalizedCity) {
                    Log::info('BRT address normalization: resolved city from ZIP', [
                        'original_city' => $normalizedCity,
                        'resolved_city' => $resolved,
                        'postal_code' => $postalCode,
                    ]);
                }
                return $resolved;
            }

            // 3. Se ci sono piu' citta' con lo stesso CAP, cerca una corrispondenza parziale
            //    (es. l'utente ha scritto "REGGIO EMILIA" e nel DB c'e' "REGGIO NELL'EMILIA")
            foreach ($citiesByZip as $location) {
                $dbCity = mb_strtoupper($location->place_name, 'UTF-8');

                // Controlla se una contiene l'altra
                if (str_contains($dbCity, $normalizedCity) || str_contains($normalizedCity, $dbCity)) {
                    Log::info('BRT address normalization: partial match found', [
                        'original_city' => $normalizedCity,
                        'resolved_city' => $dbCity,
                        'postal_code' => $postalCode,
                    ]);
                    return $dbCity;
                }
            }

            // 4. Se c'e' una corrispondenza di provincia, preferisci quella
            if (!empty($province)) {
                $provinceMatch = $citiesByZip->first(function ($loc) use ($province) {
                    return mb_strtoupper($loc->province ?? '', 'UTF-8') === $province;
                });
                if ($provinceMatch) {
                    $resolved = mb_strtoupper($provinceMatch->place_name, 'UTF-8');
                    Log::info('BRT address normalization: resolved city from ZIP + province', [
                        'original_city' => $normalizedCity,
                        'resolved_city' => $resolved,
                        'postal_code' => $postalCode,
                        'province' => $province,
                    ]);
                    return $resolved;
                }
            }

            // 5. Nessuna corrispondenza trovata, restituisci la citta' originale
            Log::warning('BRT address normalization: no matching city found for ZIP', [
                'postal_code' => $postalCode,
                'city' => $normalizedCity,
                'available_cities' => $citiesByZip->pluck('place_name')->toArray(),
            ]);
            return $normalizedCity;

        } catch (\Exception $e) {
            // In caso di errore DB, non bloccare la spedizione
            Log::warning('BRT address normalization exception', [
                'error' => $e->getMessage(),
                'city' => $normalizedCity,
                'postal_code' => $postalCode,
            ]);
            return $normalizedCity;
        }
    }

    /**
     * Traduce gli errori BRT in messaggi leggibili in italiano.
     * Fornisce suggerimenti su come risolvere il problema.
     */
    private function translateBrtError(int $code, string $codeDesc, string $message, array $createData): string
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

    /**
     * Costruisce le note per la spedizione BRT.
     * Include la descrizione del contenuto dei pacchi se disponibile.
     */
    private function buildNotes(Order $order, array $options): string
    {
        // Se l'utente ha specificato note personalizzate, le usiamo
        if (!empty($options['notes'])) {
            return $options['notes'];
        }

        $notes = 'SpedizioneFacile ordine #' . $order->id;

        // Aggiungiamo la descrizione del contenuto dai pacchi (campo content_description)
        $descriptions = $order->packages
            ->pluck('content_description')
            ->filter()
            ->unique()
            ->implode(', ');

        if ($descriptions) {
            $notes .= ' - Contenuto: ' . $descriptions;
        }

        // BRT ha un limite di 50 caratteri per le note
        return mb_substr($notes, 0, 50);
    }

    /**
     * Converte il nome della provincia italiana nella sigla a 2 lettere.
     * BRT richiede la sigla (es. "MI" per Milano, "RM" per Roma).
     * Se il valore e' gia' una sigla a 2 lettere, viene restituito cosi' com'e'.
     * Se il nome non viene trovato, restituisce il valore originale (potrebbe essere gia' una sigla).
     */
    private function provinceToAbbreviation(string $province): string
    {
        $province = trim($province);

        // Se e' gia' una sigla a 2 lettere, restituiscila in maiuscolo
        if (strlen($province) === 2) {
            return strtoupper($province);
        }

        // Mappa completa di tutte le 107 province italiane (nome → sigla)
        $map = [
            'agrigento' => 'AG', 'alessandria' => 'AL', 'ancona' => 'AN', 'aosta' => 'AO',
            'arezzo' => 'AR', 'ascoli piceno' => 'AP', 'asti' => 'AT', 'avellino' => 'AV',
            'bari' => 'BA', 'barletta-andria-trani' => 'BT', 'belluno' => 'BL', 'benevento' => 'BN',
            'bergamo' => 'BG', 'biella' => 'BI', 'bologna' => 'BO', 'bolzano' => 'BZ',
            'brescia' => 'BS', 'brindisi' => 'BR', 'cagliari' => 'CA', 'caltanissetta' => 'CL',
            'campobasso' => 'CB', 'carbonia-iglesias' => 'CI', 'caserta' => 'CE', 'catania' => 'CT',
            'catanzaro' => 'CZ', 'chieti' => 'CH', 'como' => 'CO', 'cosenza' => 'CS',
            'cremona' => 'CR', 'crotone' => 'KR', 'cuneo' => 'CN', 'enna' => 'EN',
            'fermo' => 'FM', 'ferrara' => 'FE', 'firenze' => 'FI', 'foggia' => 'FG',
            'forlì-cesena' => 'FC', 'forli-cesena' => 'FC', 'frosinone' => 'FR', 'genova' => 'GE',
            'gorizia' => 'GO', 'grosseto' => 'GR', 'imperia' => 'IM', 'isernia' => 'IS',
            'la spezia' => 'SP', 'l\'aquila' => 'AQ', 'laquila' => 'AQ', 'latina' => 'LT',
            'lecce' => 'LE', 'lecco' => 'LC', 'livorno' => 'LI', 'lodi' => 'LO',
            'lucca' => 'LU', 'macerata' => 'MC', 'mantova' => 'MN', 'massa-carrara' => 'MS',
            'massa carrara' => 'MS', 'matera' => 'MT', 'medio campidano' => 'VS',
            'messina' => 'ME', 'milano' => 'MI', 'modena' => 'MO', 'monza e brianza' => 'MB',
            'monza' => 'MB', 'napoli' => 'NA', 'novara' => 'NO', 'nuoro' => 'NU',
            'ogliastra' => 'OG', 'olbia-tempio' => 'OT', 'oristano' => 'OR', 'padova' => 'PD',
            'palermo' => 'PA', 'parma' => 'PR', 'pavia' => 'PV', 'perugia' => 'PG',
            'pesaro e urbino' => 'PU', 'pesaro-urbino' => 'PU', 'pescara' => 'PE',
            'piacenza' => 'PC', 'pisa' => 'PI', 'pistoia' => 'PT', 'pordenone' => 'PN',
            'potenza' => 'PZ', 'prato' => 'PO', 'ragusa' => 'RG', 'ravenna' => 'RA',
            'reggio calabria' => 'RC', 'reggio emilia' => 'RE', 'rieti' => 'RI', 'rimini' => 'RN',
            'roma' => 'RM', 'rovigo' => 'RO', 'salerno' => 'SA', 'sassari' => 'SS',
            'savona' => 'SV', 'siena' => 'SI', 'siracusa' => 'SR', 'sondrio' => 'SO',
            'sud sardegna' => 'SU', 'taranto' => 'TA', 'teramo' => 'TE', 'terni' => 'TR',
            'torino' => 'TO', 'trapani' => 'TP', 'trento' => 'TN', 'treviso' => 'TV',
            'trieste' => 'TS', 'udine' => 'UD', 'varese' => 'VA', 'venezia' => 'VE',
            'verbano-cusio-ossola' => 'VB', 'verbania' => 'VB', 'vercelli' => 'VC',
            'verona' => 'VR', 'vibo valentia' => 'VV', 'vicenza' => 'VI', 'viterbo' => 'VT',
        ];

        $lower = strtolower(trim($province));

        return $map[$lower] ?? strtoupper($province);
    }

    /**
     * Converte il nome del paese (es. "Italia") nel codice ISO 3166-1 Alpha-2 (es. "IT").
     * BRT richiede il codice a 2 lettere, non il nome completo.
     */
    private function countryToIso2(string $country): string
    {
        $map = [
            'italia' => 'IT',
            'italy' => 'IT',
            'francia' => 'FR',
            'france' => 'FR',
            'germania' => 'DE',
            'germany' => 'DE',
            'deutschland' => 'DE',
            'spagna' => 'ES',
            'spain' => 'ES',
            'regno unito' => 'GB',
            'united kingdom' => 'GB',
            'svizzera' => 'CH',
            'switzerland' => 'CH',
            'austria' => 'AT',
            'belgio' => 'BE',
            'belgium' => 'BE',
            'olanda' => 'NL',
            'paesi bassi' => 'NL',
            'netherlands' => 'NL',
            'portogallo' => 'PT',
            'portugal' => 'PT',
            'polonia' => 'PL',
            'poland' => 'PL',
            'grecia' => 'GR',
            'greece' => 'GR',
            'irlanda' => 'IE',
            'ireland' => 'IE',
            'danimarca' => 'DK',
            'denmark' => 'DK',
            'svezia' => 'SE',
            'sweden' => 'SE',
            'norvegia' => 'NO',
            'norway' => 'NO',
            'finlandia' => 'FI',
            'finland' => 'FI',
            'lussemburgo' => 'LU',
            'luxembourg' => 'LU',
            'romania' => 'RO',
            'ungheria' => 'HU',
            'hungary' => 'HU',
            'repubblica ceca' => 'CZ',
            'czech republic' => 'CZ',
            'slovacchia' => 'SK',
            'slovakia' => 'SK',
            'slovenia' => 'SI',
            'croazia' => 'HR',
            'croatia' => 'HR',
            'bulgaria' => 'BG',
        ];

        $lower = strtolower(trim($country));

        // Se è già un codice ISO a 2 lettere, restituiscilo direttamente
        if (strlen($country) === 2) {
            return strtoupper($country);
        }

        return $map[$lower] ?? 'IT';
    }

    /**
     * FALLBACK: Cerca punti PUDO nel database locale quando l'API BRT non funziona.
     * Usa la tabella pudo_points popolata con dati mock delle città principali.
     */
    private function getPudoFromDatabase(string $city, string $zipCode, int $maxResults): array
    {
        try {
            $points = PudoPoint::searchByLocation($city, $zipCode, $maxResults);

            Log::info('PUDO fallback database search', [
                'city' => $city,
                'zip' => $zipCode,
                'results' => count($points),
            ]);

            return [
                'success' => true,
                'pudo' => array_map(fn($p) => [
                    'pudo_id' => $p['id'],
                    'carrier_pudo_id' => $p['id'],
                    'name' => $p['name'],
                    'address' => $p['address'],
                    'city' => $p['city'],
                    'zip_code' => $p['zip_code'],
                    'province' => $p['province'],
                    'country' => $p['country'],
                    'latitude' => $p['latitude'],
                    'longitude' => $p['longitude'],
                    'distance_meters' => $p['distance'] ? (int)($p['distance'] * 1000) : null,
                    'enabled' => true,
                    'opening_hours' => $p['opening_hours'] ?? [],
                    'localization_hint' => '',
                ], $points),
                'fallback' => true,
            ];
        } catch (\Exception $e) {
            Log::error('PUDO fallback database error', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Nessun punto PUDO disponibile al momento.', 'pudo' => []];
        }
    }

    /**
     * FALLBACK: Cerca punti PUDO nel database locale per coordinate GPS.
     */
    private function getPudoFromDatabaseByCoordinates(float $latitude, float $longitude, int $maxResults): array
    {
        try {
            $points = PudoPoint::searchByCoordinates($latitude, $longitude, $maxResults);

            Log::info('PUDO fallback database search by coordinates', [
                'lat' => $latitude,
                'lng' => $longitude,
                'results' => count($points),
            ]);

            return [
                'success' => true,
                'pudo' => array_map(fn($p) => [
                    'pudo_id' => $p['id'],
                    'carrier_pudo_id' => $p['id'],
                    'name' => $p['name'],
                    'address' => $p['address'],
                    'city' => $p['city'],
                    'zip_code' => $p['zip_code'],
                    'province' => $p['province'],
                    'country' => $p['country'],
                    'latitude' => $p['latitude'],
                    'longitude' => $p['longitude'],
                    'distance_meters' => $p['distance'] ? (int)($p['distance'] * 1000) : null,
                    'enabled' => true,
                    'opening_hours' => $p['opening_hours'] ?? [],
                    'localization_hint' => '',
                ], $points),
                'fallback' => true,
            ];
        } catch (\Exception $e) {
            Log::error('PUDO fallback database error (coordinates)', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Nessun punto PUDO disponibile al momento.', 'pudo' => []];
        }
    }
}
