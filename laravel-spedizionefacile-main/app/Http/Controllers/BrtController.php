<?php
/**
 * FILE: BrtController.php
 * SCOPO: Gestisce tutte le operazioni con il corriere BRT (creazione spedizioni, etichette, tracking, PUDO).
 *
 * DOVE SI USA: Dettaglio ordine, pagina tracking, checkout (ricerca PUDO), pannello admin, test BRT
 *
 * DATI IN INGRESSO:
 *   - createShipment(): {order_id, is_cod?, cod_amount?, pudo_id?, notes?}
 *   - confirmShipment/deleteShipment(): {order_id}
 *   - publicTracking(): {code: "BRT123" | "SF-000042" | "12345"}
 *   - pudoSearch(): {address?, zip_code, city, country?: "ITA", max_results?: 10}
 *   - pudoNearby(): {latitude, longitude, max_results?: 10}
 *   - testCreate(): {consignee_name, consignee_address, consignee_city, ...}
 *
 * DATI IN USCITA:
 *   - createShipment(): {success, parcel_id, tracking_number, tracking_url, order_status}
 *   - downloadLabel(): file PDF binario (Content-Type: application/pdf)
 *   - publicTracking(): {found, order_id?, status, status_description, brt_tracking_url}
 *   - pudoSearch/pudoNearby(): array di punti PUDO con nome, indirizzo, coordinate
 *
 * VINCOLI:
 *   - createShipment() salva 13+ campi brt_* nell'ordine — NON rimuoverne senza aggiornare il frontend
 *   - L'etichetta e' salvata come base64 nel campo brt_label_base64 (campo TEXT grande)
 *   - deleteShipment() resetta TUTTI i campi brt_* e riporta lo stato a 'completed'
 *   - publicTracking() e' SENZA autenticazione — non esporre dati sensibili dell'utente
 *   - L'email dell'etichetta non blocca il flusso se fallisce (errore solo nei log)
 *
 * ERRORI TIPICI:
 *   - 403: utente non proprietario e non admin
 *   - 409: spedizione BRT gia' creata per questo ordine
 *   - 422: ordine non ancora pagato, dati mancanti
 *   - 502: errore API BRT (indirizzo non riconosciuto, credenziali errate)
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere campi BRT: aggiungerli in createShipment() (salvataggio) e deleteShipment() (reset)
 *   - Per modificare la ricerca tracking: aggiungere casi nel blocco sequenziale di publicTracking()
 *   - Per cambiare il formato dell'etichetta: modificare BrtService.createShipment()
 *
 * COLLEGAMENTI:
 *   - app/Services/BrtService.php — logica di comunicazione con le API BRT
 *   - app/Listeners/GenerateBrtLabel.php — generazione automatica etichetta dopo pagamento
 *   - pages/traccia-spedizione.vue — pagina pubblica di tracking
 *   - pages/account/spedizioni/[id].vue — dettaglio ordine con download etichetta
 */

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\Brt\ShipmentService;
use App\Services\Brt\PudoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
class BrtController extends Controller
{
    // Servizi BRT specializzati (spedizioni + punti PUDO)
    private ShipmentService $shipment;
    private PudoService $pudo;

    public function __construct(ShipmentService $shipment, PudoService $pudo)
    {
        $this->shipment = $shipment;
        $this->pudo = $pudo;
    }

    /**
     * Crea una spedizione BRT per un ordine pagato e genera l'etichetta.
     * L'etichetta e' il foglio con il codice a barre che va attaccato al pacco.
     *
     * Verifica che:
     * - L'ordine esista e appartenga all'utente (o che l'utente sia admin)
     * - L'ordine sia stato pagato
     * - Non sia gia' stata creata una spedizione BRT per questo ordine
     */
    public function createShipment(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer',
            'is_cod' => 'nullable|boolean',         // Se e' in contrassegno (pagamento alla consegna)
            'cod_amount' => 'nullable|integer|min:0', // Importo del contrassegno in centesimi
            'pudo_id' => 'nullable|string',          // ID del punto di ritiro PUDO
            'notes' => 'nullable|string|max:255',    // Note aggiuntive per il corriere
        ]);

        $order = Order::findOrFail($request->order_id);

        // Controllo di sicurezza: solo il proprietario dell'ordine o un admin puo' creare la spedizione
        if ($order->user_id !== auth()->id() && !auth()->user()->isAdmin()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        // L'ordine deve essere stato pagato prima di poter creare la spedizione
        $rawStatus = $order->getRawOriginal('status') ?? $order->getAttributes()['status'] ?? 'pending';
        if (!in_array($rawStatus, [Order::COMPLETED, 'completed', 'processing'])) {
            return response()->json(['error' => 'L\'ordine deve essere pagato prima di creare la spedizione BRT.'], 422);
        }

        // Controlliamo che non sia gia' stata creata una spedizione per questo ordine
        if ($order->brt_parcel_id) {
            return response()->json([
                'error' => 'Spedizione BRT già creata per questo ordine.',
                'parcel_id' => $order->brt_parcel_id,
                'tracking_url' => $order->brt_tracking_url,
            ], 409);
        }

        // Chiamiamo il servizio BRT per creare la spedizione e generare l'etichetta
        $result = $this->shipment->createShipment($order, [
            'is_cod' => $request->boolean('is_cod'),
            'cod_amount' => $request->cod_amount,
            'pudo_id' => $request->pudo_id,
            'notes' => $request->notes,
        ]);

        // Se la creazione e' fallita, restituiamo l'errore
        if (!$result['success']) {
            return response()->json(['error' => $result['error']], 502);
        }

        // Salviamo i dati della spedizione BRT nell'ordine
        $order->brt_parcel_id = $result['parcel_id'];                       // ID del pacco BRT
        $order->brt_numeric_sender_reference = $result['numeric_sender_reference']; // Riferimento numerico
        $order->brt_tracking_url = $result['tracking_url'];                 // URL per il tracking
        $order->brt_label_base64 = $result['label_base64'];                 // Etichetta in formato PDF (codificata)
        $order->brt_tracking_number = $result['tracking_number'] ?? null;   // Numero di tracking (parcelNumberFrom)
        $order->brt_parcel_number_to = $result['parcel_number_to'] ?? null; // Ultimo collo (parcelNumberTo)
        $order->brt_departure_depot = $result['departure_depot'] ?? null;   // Deposito di partenza
        $order->brt_arrival_terminal = $result['arrival_terminal'] ?? null; // Terminale di arrivo
        $order->brt_arrival_depot = $result['arrival_depot'] ?? null;       // Deposito di arrivo
        $order->brt_delivery_zone = $result['delivery_zone'] ?? null;       // Zona di consegna
        $order->brt_series_number = $result['series_number'] ?? null;       // Numero di serie
        $order->brt_service_type = $result['service_type'] ?? null;         // Tipo di servizio BRT
        $order->brt_raw_response = $result['raw_response'] ?? null;         // Risposta completa JSON
        $order->brt_pudo_id = $request->pudo_id;
        $order->is_cod = $request->boolean('is_cod');
        $order->cod_amount = $request->cod_amount;
        $order->brt_error = null;       // Puliamo l'eventuale errore precedente
        $order->status = 'in_transit';  // Lo stato dell'ordine diventa "in transito"
        $order->save();

        // Inviamo l'etichetta via email all'utente
        $this->sendLabelEmail($order);

        return response()->json([
            'success' => true,
            'parcel_id' => $result['parcel_id'],
            'tracking_number' => $result['tracking_number'] ?? null,
            'tracking_url' => $result['tracking_url'],
            'order_status' => 'in_transit',
        ]);
    }

    /**
     * Conferma una spedizione BRT (usato nella modalita' di conferma esplicita).
     * Alcune spedizioni richiedono una conferma manuale dopo la creazione.
     */
    public function confirmShipment(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer',
        ]);

        $order = Order::findOrFail($request->order_id);

        if ($order->user_id !== auth()->id() && !auth()->user()->isAdmin()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        // L'ordine deve avere un riferimento BRT per poter essere confermato
        if (!$order->brt_numeric_sender_reference) {
            return response()->json(['error' => 'Nessuna spedizione BRT trovata per questo ordine.'], 422);
        }

        $result = $this->shipment->confirmShipment((int) $order->brt_numeric_sender_reference);

        if (!$result['success']) {
            return response()->json(['error' => $result['error']], 502);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Elimina una spedizione BRT (solo admin).
     * Rimuove la spedizione e riporta l'ordine allo stato "completato" (pagato ma non spedito).
     */
    public function deleteShipment(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer',
        ]);

        $order = Order::findOrFail($request->order_id);

        // Solo gli amministratori possono eliminare le spedizioni BRT
        if (!auth()->user()->isAdmin()) {
            return response()->json(['error' => 'Solo gli admin possono eliminare le spedizioni BRT.'], 403);
        }

        if (!$order->brt_numeric_sender_reference) {
            return response()->json(['error' => 'Nessuna spedizione BRT trovata per questo ordine.'], 422);
        }

        $result = $this->shipment->deleteShipment((int) $order->brt_numeric_sender_reference);

        if (!$result['success']) {
            return response()->json(['error' => $result['error']], 502);
        }

        // Resettiamo tutti i campi BRT dell'ordine e riportiamo lo stato a "completato"
        $order->brt_parcel_id = null;
        $order->brt_numeric_sender_reference = null;
        $order->brt_tracking_url = null;
        $order->brt_label_base64 = null;
        $order->brt_tracking_number = null;
        $order->brt_parcel_number_to = null;
        $order->brt_departure_depot = null;
        $order->brt_arrival_terminal = null;
        $order->brt_arrival_depot = null;
        $order->brt_delivery_zone = null;
        $order->brt_series_number = null;
        $order->brt_service_type = null;
        $order->brt_raw_response = null;
        $order->brt_error = null;
        $order->status = Order::COMPLETED;
        $order->save();

        return response()->json(['success' => true]);
    }

    /**
     * Scarica l'etichetta BRT come file PDF.
     * L'etichetta e' salvata nell'ordine come stringa codificata in base64,
     * e qui la decodifichiamo per creare il file PDF scaricabile.
     */
    public function downloadLabel(Order $order)
    {
        if ($order->user_id !== auth()->id() && !auth()->user()->isAdmin()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        if (!$order->brt_label_base64) {
            return response()->json(['error' => 'Nessuna etichetta trovata per questo ordine.'], 404);
        }

        // Decodifichiamo l'etichetta da base64 a contenuto PDF
        $pdfContent = base64_decode($order->brt_label_base64);

        return response($pdfContent, 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="etichetta-brt-' . $order->id . '.pdf"');
    }

    /**
     * Mostra le informazioni di tracking (tracciamento) per un ordine.
     * Restituisce l'ID del pacco BRT, l'URL per seguire la spedizione, e lo stato attuale.
     */
    public function tracking(Order $order)
    {
        if ($order->user_id !== auth()->id() && !auth()->user()->isAdmin()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        if (!$order->brt_parcel_id) {
            return response()->json(['error' => 'Nessuna spedizione BRT per questo ordine.'], 404);
        }

        return response()->json([
            'parcel_id' => $order->brt_parcel_id,
            'tracking_number' => $order->brt_tracking_number,
            'tracking_url' => $order->brt_tracking_url,
            'status' => $order->status,
            'departure_depot' => $order->brt_departure_depot,
            'arrival_depot' => $order->brt_arrival_depot,
            'service_type' => $order->brt_service_type,
        ]);
    }

    /**
     * publicTracking — Ricerca pubblica di tracking, senza autenticazione.
     *
     * PERCHE': Permette a chiunque di cercare lo stato di una spedizione inserendo un codice.
     *   Cerca in ordine: brt_parcel_id, brt_tracking_number, brt_numeric_sender_reference, ID ordine.
     * COME LEGGERLO: 1) Cerca per parcel_id  2) Se non trovato, cerca per tracking_number
     *   3) Se non trovato, cerca per numeric_sender_reference  4) Se non trovato, cerca per ID ordine
     *   5) Mappa lo stato in italiano  6) Restituisce dati minimi (no dati utente)
     * COME MODIFICARLO: Per aggiungere un criterio di ricerca, inserire un nuovo blocco "if (!$order)".
     * COSA EVITARE: Non esporre dati dell'utente (email, nome) — e' un endpoint pubblico.
     */
    public function publicTracking(Request $request)
    {
        $request->validate([
            'code' => 'required|string|max:100',
        ]);

        $code = trim($request->code);

        // 1. Cerca per brt_parcel_id (codice BRT sulla lettera di vettura)
        $order = Order::where('brt_parcel_id', $code)->first();

        // 2. Se non trovato, cerca per brt_tracking_number (numero di collo BRT)
        if (!$order) {
            $order = Order::where('brt_tracking_number', $code)->first();
        }

        // 3. Se non trovato, cerca per brt_numeric_sender_reference
        if (!$order) {
            $order = Order::where('brt_numeric_sender_reference', $code)->first();
        }

        // 4. Se non trovato, cerca per ID ordine (rimuovendo eventuali prefissi come "SF-" o "#")
        if (!$order) {
            $cleanCode = preg_replace('/^(SF-|#|sf-)/i', '', $code);
            if (is_numeric($cleanCode)) {
                $order = Order::where('id', (int) $cleanCode)
                    ->whereNotNull('brt_parcel_id')
                    ->first();
            }
        }

        if (!$order) {
            return response()->json([
                'found' => false,
                'message' => 'Nessuna spedizione trovata con il codice inserito.',
                'brt_tracking_url' => 'https://vas.brt.it/vas/sped_det_show.hsm?refnr=' . urlencode($code) . '&tiession=',
            ]);
        }

        // Mappa degli stati con descrizione italiana
        $statusMap = [
            'pending' => ['label' => 'In attesa', 'description' => 'Ordine in attesa di pagamento.'],
            'processing' => ['label' => 'In lavorazione', 'description' => 'Pagamento ricevuto, preparazione in corso.'],
            'completed' => ['label' => 'Completato', 'description' => 'Ordine pagato, in attesa della generazione etichetta.'],
            'in_transit' => ['label' => 'In transito', 'description' => 'Il pacco e\' stato affidato al corriere BRT ed e\' in viaggio.'],
            'delivered' => ['label' => 'Consegnato', 'description' => 'Il pacco e\' stato consegnato.'],
            'in_giacenza' => ['label' => 'In giacenza', 'description' => 'Il pacco e\' in giacenza presso il corriere.'],
            'payment_failed' => ['label' => 'Pagamento fallito', 'description' => 'Il pagamento non e\' andato a buon fine.'],
            'cancelled' => ['label' => 'Annullato', 'description' => 'L\'ordine e\' stato annullato.'],
        ];

        $rawStatus = $order->getAttributes()['status'] ?? 'pending';
        $statusInfo = $statusMap[$rawStatus] ?? ['label' => $rawStatus, 'description' => ''];

        // Costruiamo l'URL di tracking: priorita' al tracking_number, poi parcel_id
        $trackingRef = $order->brt_tracking_number ?: $order->brt_parcel_id;
        $fallbackTrackingUrl = $trackingRef
            ? 'https://vas.brt.it/vas/sped_det_show.hsm?refnr=' . urlencode($trackingRef) . '&tiession='
            : null;

        return response()->json([
            'found' => true,
            'order_id' => $order->id,
            'status' => $statusInfo['label'],
            'status_description' => $statusInfo['description'],
            'raw_status' => $rawStatus,
            'brt_parcel_id' => $order->brt_parcel_id,
            'brt_tracking_number' => $order->brt_tracking_number,
            'brt_tracking_url' => $order->brt_tracking_url ?: $fallbackTrackingUrl,
            'created_at' => $order->created_at ? $order->created_at->setTimezone('Europe/Rome')->format('d/m/Y H:i') : null,
        ]);
    }

    /**
     * Cerca i punti PUDO (Pick Up Drop Off) vicini a un indirizzo.
     * I PUDO sono punti di ritiro/consegna come tabaccai, edicole, negozi convenzionati
     * dove l'utente puo' ritirare o lasciare i pacchi.
     */
    public function pudoSearch(Request $request)
    {
        $data = $request->validate([
            'address' => 'nullable|string',
            'zip_code' => 'nullable|string|required_without:city',
            'city' => 'nullable|string|required_without:zip_code',
            'country' => 'nullable|string',
            'max_results' => 'nullable|integer|min:1|max:50',
        ]);

        $address = trim((string) ($data['address'] ?? ''));
        $zipCode = preg_replace('/\D/', '', (string) ($data['zip_code'] ?? ''));
        $city = trim((string) ($data['city'] ?? ''));

        if ($zipCode === '' && $city === '') {
            return response()->json([
                'success' => false,
                'error' => "Inserisci almeno citta o CAP per cercare i punti PUDO.",
            ], 422);
        }

        // L'API PUDO di BRT richiede il codice paese in formato ISO Alpha-3 (es. ITA, DEU, FRA)
        $result = $this->pudo->getPudoByAddress(
            $address,
            $zipCode,
            $city,
            $data['country'] ?? 'ITA',
            (int) ($data['max_results'] ?? 50)
        );

        if (isset($result['pudo']) && is_array($result['pudo'])) {
            $result['pudo'] = array_values(array_filter(array_map(function ($point) {
                $provider = strtoupper((string) ($point['provider'] ?? 'BRT'));
                $point['provider'] = 'BRT';
                return $provider === 'BRT' ? $point : null;
            }, $result['pudo'])));
        }

        return response()->json($result);
    }

    /**
     * Cerca i punti PUDO vicini a delle coordinate GPS (latitudine e longitudine).
     * Utile quando l'utente condivide la propria posizione.
     */
    public function pudoNearby(Request $request)
    {
        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'max_results' => 'nullable|integer|min:1|max:50',
        ]);

        $result = $this->pudo->getPudoByCoordinates(
            (float) $request->latitude,
            (float) $request->longitude,
            (int) ($request->max_results ?? 50)
        );

        if (isset($result['pudo']) && is_array($result['pudo'])) {
            $result['pudo'] = array_values(array_filter(array_map(function ($point) {
                $provider = strtoupper((string) ($point['provider'] ?? 'BRT'));
                $point['provider'] = 'BRT';
                return $provider === 'BRT' ? $point : null;
            }, $result['pudo'])));
        }

        return response()->json($result);
    }

    /**
     * Mostra i dettagli di un punto PUDO specifico (orari, indirizzo completo, ecc.).
     */
    public function pudoDetails(string $pudoId)
    {
        $result = $this->pudo->getPudoDetails($pudoId);
        return response()->json($result);
    }

    /**
     * Test di creazione spedizione BRT (solo admin).
     * Invia una richiesta di test all'API BRT con dati forniti dal form,
     * senza creare un ordine reale nel database.
     * Restituisce la risposta completa dell'API per debug.
     */
    public function testCreate(Request $request)
    {
        $request->validate([
            'consignee_name' => 'required|string|max:255',
            'consignee_address' => 'required|string|max:255',
            'consignee_city' => 'required|string|max:255',
            'consignee_zip' => 'required|string|max:10',
            'consignee_province' => 'required|string|max:2',
            'consignee_country' => 'required|string|max:2',
            'consignee_email' => 'nullable|email',
            'consignee_phone' => 'nullable|string|max:20',
            'weight_kg' => 'required|integer|min:1',
            'parcels' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:255',
        ]);

        $result = $this->shipment->testCreateShipment($request->all());

        return response()->json($result);
    }

    /**
     * Invia l'email con l'etichetta BRT all'utente.
     * Se l'invio fallisce, non blocca il flusso (registra solo l'errore nei log).
     */
    private function sendLabelEmail(Order $order): void
    {
        try {
            $order->loadMissing('user');
            if ($order->user && $order->user->email) {
                \Illuminate\Support\Facades\Mail::to($order->user->email)
                    ->send(new \App\Mail\ShipmentLabelMail($order));
            }
        } catch (\Exception $e) {
            Log::error('Failed to send BRT label email', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
