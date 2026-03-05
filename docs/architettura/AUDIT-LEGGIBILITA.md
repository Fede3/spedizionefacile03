# Audit Leggibilita del Codice — SpediamoFacile

Data audit: 2026-02-16
Fase: 0 (Inventario)

Livelli di severita:
- **CRITICO** — Problema che puo causare bug, confusione grave, o rende il codice ingestibile
- **IMPORTANTE** — Problema che rallenta chi legge/modifica il codice
- **CONSIGLIATO** — Miglioramento desiderabile ma non urgente

---

## 1. Stile Naming

### 1.1 Variabili — Mismatch camelCase vs snake_case

**Severita: IMPORTANTE**

Il frontend (Nuxt/JS) usa camelCase, il backend (Laravel/PHP) usa snake_case.
Questo e coerente con le convenzioni dei rispettivi linguaggi.

Tuttavia, ci sono punti di confusione dove i due mondi si incontrano:

| Dove | Problema | File |
|------|----------|------|
| Frontend invia `serviceData` (camelCase) | Backend lo rinomina in `service_data` (snake_case) | `CartController.php:305-307`, `OrderController.php:127-129` |
| Campo DB `single_price` (centesimi) | Frontend lo invia in euro, backend converte | `CartController.php:327`, `OrderController.php:164` |
| Store usa `shipmentDetails` (camelCase) | API accetta `shipment_details` (snake_case) | `userStore.js:48` vs `SessionController.php:109` |
| `originAddressData` nello store | API accetta `origin_address` | `userStore.js:70` vs `CartController.php:443` |

**Nota**: La conversione `serviceData` -> `service_data` e ripetuta identica in 3 punti (CartController store, CartController update, OrderController createDirectOrder). E un pattern copia-incolla.

### 1.2 File — Naming inconsistente dei composables

**Severita: CONSIGLIATO**

| File | Pattern |
|------|---------|
| `composables/useCart.js` | camelCase (corretto) |
| `composables/useSession.js` | camelCase (corretto) |
| `composables/useAdmin.js` | camelCase (corretto) |
| `composables/UseAdminImage.js` | **PascalCase** (inconsistente) |
| `composables/usePriceBands.js` | camelCase (corretto) |
| `composables/useSmartValidation.js` | camelCase (corretto) |

`UseAdminImage.js` dovrebbe essere `useAdminImage.js` per coerenza con gli altri composables.

### 1.3 Route naming — Mix di stili nelle URL API

**Severita: CONSIGLIATO**

Le rotte API usano prevalentemente kebab-case, ma ci sono eccezioni:

| Rotta | Stile | Nota |
|-------|-------|------|
| `/api/session/first-step` | kebab-case | OK |
| `/api/create-direct-order` | kebab-case | OK |
| `/api/stripe/create-payment-intent` | kebab-case | OK |
| `/api/guest-cart` | kebab-case | OK |
| `/api/stripe/mark-order-completed` | kebab-case | OK |
| `/api/empty-cart` | kebab-case con DELETE | OK ma inconsistente con `POST /api/empty-cart` che usa DELETE |

Le rotte sono generalmente coerenti. Nessun problema critico.

### 1.4 Campi database vs frontend

**Severita: IMPORTANTE**

| Campo DB (backend) | Campo frontend | Problema |
|---------------------|----------------|----------|
| `single_price` (centesimi) | `single_price` (euro) | Stesso nome, unita diversa. Confusione garantita |
| `weight_price` (centesimi nel DB) | `weight_price` (euro nel frontend) | Stesso nome, unita diversa |
| `volume_price` (centesimi nel DB) | `volume_price` (euro nel frontend) | Stesso nome, unita diversa |
| `subtotal` (centesimi nel DB) | Mostrato in euro nel frontend | OK, ma la conversione e sparsa ovunque |

Il problema principale: `single_price` e `weight_price`/`volume_price` hanno lo **stesso nome** in frontend e backend ma **unita diverse** (euro vs centesimi). La conversione `* 100` e `/ 100` e distribuita in molti punti del codice.

---

## 2. Funzioni Lunghe (oltre 50 righe)

**Severita: IMPORTANTE**

| File | Metodo | Righe | Cosa fa |
|------|--------|-------|---------|
| `CartController.php` | `store()` | ~135 (riga 351-486) | Aggiunge pacchi al carrello con logica duplicati, creazione indirizzi, servizi. Mischia validazione, ricerca duplicati, creazione record |
| `CartController.php` | `update()` | ~75 (riga 272-347) | Aggiorna pacco, indirizzi, servizi, PUDO. Mischia aggiornamento di 4 entita diverse |
| `CartController.php` | `index()` | ~55 (riga 48-102) | Carica carrello + auto-merge + pulizia invalidi + ricaricamento. Carica 3 volte gli stessi dati |
| `OrderController.php` | `createDirectOrder()` | ~120 (riga 112-235) | Crea ordine completo: indirizzi, servizi, ricalcolo prezzi, pacchi, COD, PUDO, relazioni. Troppo in un metodo |
| `OrderController.php` | `addPackage()` | ~80 (riga 253-344) | Aggiunge collo con ricalcolo prezzi hardcoded |
| `StripeController.php` | `createOrder()` | ~115 (riga 124-238) | Crea ordini dal carrello con raggruppamento per indirizzo, COD, PUDO |
| `StripeController.php` | `orderPaid()` | ~60 (riga 395-458) | Verifica pagamento, aggiorna stato, crea transazione, svuota carrello |
| `BrtService.php` | `createShipment()` | ~240 (riga 77-321) | Funzione piu lunga del progetto. Carica dati, valida, normalizza, prepara payload, invia, parsa risposta, estrae tracking |
| `BrtService.php` | `normalizeAddressForBrt()` | ~35 (riga 785-819) | Accettabile, ma chiama 4 sotto-funzioni |
| `BrtService.php` | `resolveCityFromLocations()` | ~90 (riga 867-959) | Ricerca citta con 5 strategie diverse. Potrebbe essere semplificata |
| `BrtService.php` | `testCreateShipment()` | ~100 (riga 327-427) | Duplica ~70% della logica di `createShipment()` |
| `BrtController.php` | `publicTracking()` | ~70 (riga 278-349) | Ricerca tracking per 4 campi diversi + costruzione risposta con mappa stati |
| `BrtController.php` | `createShipment()` | ~75 (riga 69-145) | Validazione + chiamata servizio + salvataggio 15 campi brt_* |
| `RefundController.php` | `requestCancellation()` | ~115 (riga 96-228) | Cancellazione BRT + rimborso Stripe/wallet + aggiornamento stato |
| `Preventivo.vue` | `<script setup>` | ~520 (riga 26-546) | Intero script del componente. Mischia logica prezzo, autocomplete, validazione, navigazione |

### Funzioni suggerite da estrarre:

- `CartController::store()` → estrarre `findDuplicate()`, `createPackageWithAddresses()`
- `OrderController::createDirectOrder()` → estrarre `calculateServerPrice()`, `detectCodService()`
- `BrtService::createShipment()` → estrarre `buildPayload()`, `parseResponse()`, `extractTrackingData()`
- `BrtService::testCreateShipment()` → riusare la logica di `createShipment()` con flag `isTest`
- `Preventivo.vue` → estrarre logica autocomplete in composable separato

---

## 3. Commenti Esistenti

### 3.1 File con intestazione standard (BUONI)

**Tutti i controller** hanno l'intestazione standard con SCOPO, COSA ENTRA, COSA ESCE, CHIAMATO DA, EFFETTI COLLATERALI, ERRORI TIPICI, DOCUMENTI CORRELATI.

File con intestazione completa e ben fatta:
- `SessionController.php` — Eccellente, con spiegazione fasce prezzo
- `CartController.php` — Eccellente
- `OrderController.php` — Eccellente
- `StripeController.php` — Eccellente
- `BrtController.php` — Eccellente
- `BrtService.php` — Eccellente
- `RefundController.php` — Eccellente
- `AdminController.php` — Eccellente
- `WalletController.php` — Eccellente
- `api.php` — Eccellente, con spiegazione middleware

**Tutti i composables** hanno intestazione:
- `useCart.js` — Buona, formato compatto
- `useSession.js` — Buona, formato compatto
- `usePriceBands.js` — Eccellente, elenca tutte le funzioni
- `useSmartValidation.js` — Eccellente, spiega il perche del pattern on-blur/on-input
- `useAdmin.js` — Buona
- `UseAdminImage.js` — Buona

**Store e componenti**:
- `userStore.js` — Buona intestazione
- `Preventivo.vue` — Eccellente blocco commento HTML con spiegazione completa

### 3.2 Commenti che spiegano "cosa" invece di "perche"

**Severita: CONSIGLIATO**

Molti commenti nel codice descrivono _cosa_ fa la riga (ovvio dal codice) invece di _perche_ lo fa. Esempi:

| File | Riga | Commento | Problema |
|------|------|----------|----------|
| `CartController.php` | 46 | `// Mostra il contenuto del carrello dell'utente` | "Cosa" — ovvio dal nome `index()` |
| `CartController.php` | 53 | `// Prendiamo gli ID dei pacchi presenti nel carrello dell'utente` | "Cosa" — ovvio dalla query |
| `CartController.php` | 519 | `// Rimuove un singolo pacco dal carrello e lo elimina dal database` | "Cosa" — ovvio dal nome `destroy()` |
| `SessionController.php` | 174-175 | `// Salviamo tutti i dati nella sessione per poterli recuperare dopo` | "Cosa" — ovvio |
| `StripeController.php` | 462 | `// Crea un profilo cliente su Stripe per l'utente, o restituisce quello esistente` | "Cosa" — ovvio dal nome `createOrGetCustomer()` |

**Nota**: Questo e un problema minore. Nella maggior parte dei casi i commenti sono utili, soprattutto per chi e alle prime armi. I commenti "cosa" non sono dannosi, sono solo meno utili dei commenti "perche".

### 3.3 Commenti buoni (modello da seguire)

Ottimi commenti che spiegano il "perche":

| File | Riga | Commento |
|------|------|----------|
| `BrtService.php` | 524 | `// withoutVerifying(): BRT usa un certificato self-signed nella chain SSL` |
| `BrtService.php` | 14 | `// BRT richiede: citta' in MAIUSCOLO, CAP a 5 cifre, provincia a 2 lettere` |
| `api.php` | 14-19 | Blocco che spiega _perche_ tutte le rotte sono in api.php |
| `RefundController.php` | 52 | `// Commissione di annullamento in centesimi (2 EUR = 200 centesimi)` |
| `usePriceBands.js` | 51-53 | `// Deduplica richieste concorrenti: se piu componenti chiamano loadPriceBands()...` |
| `userStore.js` | 17-20 | `// Debounce: evita troppe scritture consecutive su sessionStorage` |

---

## 4. Duplicazioni

### 4.1 Fasce prezzo hardcoded — 3 versioni diverse

**Severita: CRITICO**

Le fasce di prezzo sono hardcoded in **3 posti**, con **valori DIVERSI**:

**Versione 1 — `SessionController.php` (fallbackPrice)**
```
Peso: 0-2=8.90, 2-5=11.90, 5-10=14.90, 10-25=19.90, 25-50=29.90, 50-75=39.90, 75-100=49.90
Volume: 0-0.010=8.90, 0.010-0.020=11.90, ...
```

**Versione 2 — `OrderController.php` (createDirectOrder + addPackage)**
```
Peso: 0-2=9, 2-5=12, 5-10=18, >10=20
Volume: 0-0.008=9, 0.008-0.02=12, 0.02-0.04=18, >0.04=20
```

**Versione 3 — `usePriceBands.js` (FALLBACK_WEIGHT_BANDS)**
```
Peso: 0-2=890, 2-5=1190, 5-10=1490, 10-25=1990, 25-50=2990, 50-75=3990, 75-100=4990 (centesimi)
```

La versione nell'OrderController (v2) ha **fasce e prezzi completamente diversi** dalle altre versioni. Questo significa che un ordine creato direttamente (senza passare dal preventivo) avra un prezzo diverso.

Esempio concreto: un pacco da 8kg:
- `SessionController` (con DB vuoto): 14.90 EUR
- `OrderController::createDirectOrder`: 18 EUR
- `usePriceBands.js` (fallback): 14.90 EUR

Differenza: **3.10 EUR** sullo stesso pacco a seconda del percorso.

### 4.2 Conversione serviceData → service_data

**Severita: IMPORTANTE**

Questo blocco identico e ripetuto 3 volte:

```php
if (isset($servicesData['serviceData'])) {
    $servicesData['service_data'] = $servicesData['serviceData'];
    unset($servicesData['serviceData']);
}
```

Presente in:
- `CartController.php:305-307` (update)
- `CartController.php:373-375` (store)
- `OrderController.php:127-129` (createDirectOrder)

Dovrebbe essere un metodo helper o un trait condiviso.

### 4.3 Preparazione dati servizi — Blocco identico

**Severita: IMPORTANTE**

Questo blocco e ripetuto 3 volte:

```php
$servicesData['service_type'] = !empty($servicesData['service_type']) ? $servicesData['service_type'] : 'Nessuno';
$servicesData['date'] = $servicesData['date'] ?? '';
$servicesData['time'] = $servicesData['time'] ?? '';
```

Presente in:
- `CartController.php:369-371` (store)
- `CartController.php:302-304` (update)
- `OrderController.php:123-125` (createDirectOrder)

### 4.4 Logica PUDO — Salvare dati punto di ritiro

**Severita: IMPORTANTE**

La logica per salvare i dati PUDO nel service_data e ripetuta identica in:
- `CartController.php:380-385` (store)
- `CartController.php:310-319` (update)
- `OrderController.php:200-205` (createDirectOrder)
- `StripeController.php:187-196` (createOrder — lettura)

### 4.5 Logica merge pacchi identici

**Severita: IMPORTANTE**

La logica di raggruppamento/merge pacchi identici e duplicata con lievi variazioni:
- `CartController::autoMergePackages()` (riga 130-181)
- `CartController::mergeIdentical()` (riga 541-617)

Stessa logica (normalizza, crea chiave, raggruppa, unisci) ripetuta due volte con differenze minime nella costruzione della chiave (il primo include `address_number`, il secondo no).

### 4.6 Logica raggruppamento per indirizzo

**Severita: CONSIGLIATO**

Stessa logica di raggruppamento pacchi per indirizzo:
- `CartController::buildAddressGroups()` (riga 192-247)
- `StripeController::groupPackagesByAddress()` (riga 248-267)
- `StripeController::buildAddressKey()` (riga 274-301)

Tre implementazioni della stessa idea (raggruppare pacchi con stessi indirizzi).

### 4.7 Formato PUDO response — Mappa identica

**Severita: CONSIGLIATO**

In `BrtService.php`, la mappa per formattare i dati PUDO e identica in:
- `getPudoByAddress()` (riga 554-569)
- `getPudoByCoordinates()` (riga 608-623)

Stessa `array_map` con gli stessi 12 campi. Dovrebbe essere un metodo `formatPudoList()`.

### 4.8 Validazione prezzi — Frontend vs Backend

**Severita: CONSIGLIATO**

La validazione/calcolo prezzi e presente sia nel frontend che nel backend:
- Frontend: `Preventivo.vue:calcPriceWithWeight()`, `calcPriceWithVolume()`, `checkPrices()`
- Backend: `SessionController::firstStep()`, `OrderController::createDirectOrder()`

Questo e **corretto** (il backend deve sempre ricalcolare per sicurezza), ma le fasce devono essere allineate (vedi punto 4.1).

---

## 5. Scorciatoie Oscure

### 5.1 Numeri Magici

**Severita: CRITICO**

| File | Riga | Numero | Significato |
|------|------|--------|-------------|
| `OrderController.php` | 148-158 | `9, 12, 18, 20` | Prezzi in euro per 4 fasce (diverse dalle 7 fasce ufficiali!) |
| `OrderController.php` | 278-288 | `9, 12, 18, 20` | Stessi numeri magici ripetuti in `addPackage()` |
| `SessionController.php` | 70-86 | `8.90, 11.90, 14.90...` | Prezzi delle 7 fasce (hardcoded come fallback) |
| `SessionController.php` | 135-136 | `2.50` | Supplemento CAP 90 — spiegato nel commento ma non in costante |
| `Preventivo.vue` | 211 | `2.50` | Stesso supplemento CAP 90, duplicato nel frontend |
| `RefundController.php` | 52 | `200` | Commissione annullamento in centesimi — **ben fatto**, e una costante |
| `StripeController.php` | 368 | `50` | Importo minimo Stripe in centesimi — spiegato nel commento |
| `BrtService.php` | 1015 | `50` | Limite caratteri note BRT — spiegato nel commento |
| `usePriceBands.js` | 50 | `5 * 60 * 1000` | TTL cache 5 minuti — spiegato nel commento |
| `userStore.js` | 20 | `300` | Debounce 300ms — spiegato nel commento |

I numeri magici piu problematici sono i prezzi in `OrderController.php` (righe 148-158 e 278-288), che contengono **valori diversi** dalle fasce ufficiali e non sono ne costanti ne letti dal DB.

### 5.2 Variabili con nomi poco chiari

**Severita: CONSIGLIATO**

| File | Variabile | Significato reale |
|------|-----------|-------------------|
| `CartController.php:134` | `$normalize` | Funzione di normalizzazione testo (nome OK ma e una lambda) |
| `CartController.php:138-140` | `$o, $d, $s` | origin, destination, service — abbreviazioni troppo corte |
| `CartController.php:562-565` | `$o, $d, $s` | Stesse abbreviazioni ripetute in `mergeIdentical()` |
| `BrtService.php:329` | `$numericSenderReference` | `time() % 1000000000` — perche questo calcolo? |
| `Preventivo.vue:158` | `newPackage` | E un ref globale allo script, ma ha vita solo in `selectPackageType()` |
| `Preventivo.vue:185` | `myPack` | Salvato in `calcPriceWithWeight` e `calcPriceWithVolume`, ma mai letto altrove |

### 5.3 Ternari complessi e condizioni annidate

**Severita: CONSIGLIATO**

| File | Riga | Espressione | Problema |
|------|------|-------------|----------|
| `BrtController.php:87` | `$rawStatus = $order->getRawOriginal('status') ?? $order->getAttributes()['status'] ?? 'pending'` | Triplo fallback per leggere lo status. Non e chiaro perche servano 3 modi diversi |
| `BrtController.php:88` | `!in_array($rawStatus, [Order::COMPLETED, 'completed', 'processing'])` | Usa sia la costante `Order::COMPLETED` che la stringa `'completed'`. Ridondante o necessario? |
| `StripeController.php:89` | `$order->status = $request->payment_type === 'bonifico' ? Order::PENDING : Order::COMPLETED` | Ternario semplice ma riga lunga — OK |
| `usePriceBands.js:130-134` | Calcolo `discountPercent` | Ternario annidato con 3 livelli di fallback |

### 5.4 Comportamenti impliciti

**Severita: IMPORTANTE**

| File | Comportamento | Perche e un problema |
|------|--------------|---------------------|
| `CartController::index()` | Chiama `autoMergePackages()` ad ogni GET del carrello | Effetto collaterale su una lettura. Chi legge il codice non si aspetta che un GET modifichi il DB |
| `CartController::index()` | Elimina pacchi "invalidi" ad ogni GET | Stesso problema — pulizia automatica su ogni lettura |
| `OrderController::index()` | Chiama `cleanupEmptyOrders()` ad ogni GET degli ordini | Effetto collaterale su una lettura |
| `CartController.php:327` | `$singlePriceCents = (int) round(($packageData['single_price'] ?? 0) * 100)` | La conversione euro->centesimi e nascosta in mezzo al codice. Facile da non vedere |
| `BrtService.php` | `createShipment()` chiama `loadMissing()` | Il metodo si carica i dati da solo se non li trova. Conveniente ma nasconde la dipendenza |

### 5.5 Codice commentato/morto

**Severita: CONSIGLIATO**

`Preventivo.vue` contiene molti blocchi di codice commentato:

| Riga | Contenuto |
|------|-----------|
| 131 | `/* const getTodayDate = new Date()...` |
| 164-168 | Vecchio codice per immagine pacco |
| 346-357 | Vecchia chiamata DELETE per eliminare pacco dalla sessione |
| 485-496 | Blocco `onMounted` commentato |
| 747-760 | Vecchio bottone commentato |
| 799-815 | Altro vecchio bottone con `NuxtLink` |

Sono ~40 righe di codice morto che aggiungono rumore visivo.

---

## 6. File senza intestazione standard

### 6.1 Stato attuale

La situazione e **ottima**: tutti i file principali hanno gia l'intestazione standard.

**Controller backend** — Tutti hanno l'intestazione con SCOPO, COSA ENTRA, COSA ESCE:
- Tutti i 35 controller in `app/Http/Controllers/` hanno l'intestazione

**Modelli** — Tutti hanno l'intestazione:
- `Order.php`, `Package.php`, `User.php`, `PriceBand.php`, `Article.php`

**Service** — Ha l'intestazione:
- `BrtService.php`

**Composables frontend** — Tutti hanno l'intestazione:
- `useCart.js`, `useSession.js`, `usePriceBands.js`, `useSmartValidation.js`, `useAdmin.js`, `UseAdminImage.js`

**Store** — Ha l'intestazione:
- `userStore.js`

**Componente chiave** — Ha il commento HTML iniziale:
- `Preventivo.vue`

**Route** — Ha l'intestazione:
- `api.php`

### 6.2 File che meriterebbero un'intestazione (non critico)

Questi file secondari non hanno intestazione standard ma non sono prioritari:

| File | Perche non prioritario |
|------|----------------------|
| `nuxt-spedizionefacile-master/middleware/*.js` | File piccoli (< 30 righe) |
| `nuxt-spedizionefacile-master/pages/*.vue` | Molte pagine, alcune sono semplici |
| `laravel-spedizionefacile-main/app/Http/Requests/*.php` | File di validazione, auto-esplicativi |
| `laravel-spedizionefacile-main/app/Http/Resources/*.php` | File di trasformazione, auto-esplicativi |
| `laravel-spedizionefacile-main/app/Listeners/*.php` | File di eventi, ma hanno nomi chiari |

---

## Riepilogo Priorita

### CRITICO (da risolvere prima)

1. **Fasce prezzo divergenti** (sez. 4.1) — `OrderController` ha fasce e prezzi completamente diversi da `SessionController` e dal frontend. Un ordine diretto costa diversamente da uno via preventivo. Questo e un bug logico.

2. **Numeri magici nei prezzi** (sez. 5.1) — I prezzi hardcoded in `OrderController.php:148-158` e `278-288` non corrispondono a nessuna tabella nel DB e non sono costanti. Se qualcuno cambia le fasce nel DB, questi valori restano diversi.

### IMPORTANTE (da risolvere nel breve termine)

3. **Conversione euro/centesimi implicita** (sez. 1.4) — `single_price` ha lo stesso nome ovunque ma unita diverse. Serve un naming chiaro (es. `single_price_cents` nel backend).

4. **Duplicazione logica servizi** (sez. 4.2, 4.3, 4.4) — Il blocco `serviceData -> service_data` e la preparazione servizi sono copia-incollati in 3 controller. Estrarre in un metodo o trait condiviso.

5. **Duplicazione merge pacchi** (sez. 4.5) — `autoMergePackages()` e `mergeIdentical()` fanno la stessa cosa con lievi differenze. Unificare.

6. **Effetti collaterali su GET** (sez. 5.4) — `CartController::index()` e `OrderController::index()` modificano il DB ad ogni lettura. Separare le operazioni di pulizia.

### CONSIGLIATO (quando c'e tempo)

7. **File naming inconsistente** (sez. 1.2) — Rinominare `UseAdminImage.js` in `useAdminImage.js`.

8. **Codice morto in Preventivo.vue** (sez. 5.5) — Rimuovere ~40 righe di codice commentato.

9. **Variabili abbreviate** (sez. 5.2) — Rinominare `$o, $d, $s` in `$origin, $destination, $service`.

10. **Duplicazione formato PUDO** (sez. 4.7) — Estrarre `formatPudoList()` in `BrtService.php`.

11. **Funzioni lunghe** (sez. 2) — Spezzare le funzioni oltre 100 righe, partendo da `BrtService::createShipment()` e `OrderController::createDirectOrder()`.
