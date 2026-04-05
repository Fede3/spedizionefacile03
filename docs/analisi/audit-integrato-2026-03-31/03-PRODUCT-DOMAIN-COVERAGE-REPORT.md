# Product Domain Coverage Report

Scope: BRT / PUDO / labels / documents / tracking / COD / invoice
Base: `HEAD/main`

## 1. Stato generale del dominio prodotto

Il dominio spedizioni e' oggi molto piu' completo di quanto descritto nella baseline iniziale del piano. La repo espone un flusso coerente che parte da ordine pagato, passa per generazione etichetta, e arriva fino a tracking, invoice, pickup e invio documenti.

Non e' ancora corretto dire "100% certificato" perche' manca la verifica runtime completa da questo ambiente, ma a livello di copertura strutturale il salto e' reale.

## 2. Copertura per sottodominio

| Sottodominio | Evidenze su HEAD | Stato | Nota |
|---|---|---|---|
| PUDO search | `routes/api.php:247-252`, `BrtController::pudoSearch`, `Brt/PudoService.php` | Implementato | pubblico, throttle, coerente con checkout guest |
| PUDO nearby | `routes/api.php:249-250` | Implementato | coperto lato API |
| PUDO details | `routes/api.php:251-252` | Implementato | coperto lato API |
| Create shipment | `routes/api.php:390-391`, `BrtController::createShipment` | Implementato | dominio spedizioni presente |
| Confirm shipment | `routes/api.php:392-393` | Implementato | presente |
| Delete shipment | `routes/api.php:394-395` | Implementato | presente |
| Label download | `routes/api.php:396-397` | Implementato | presente |
| Tracking order | `routes/api.php:398-399`, `TrackingService` | Implementato | presente anche tracking pubblico |
| Public tracking | `routes/api.php:233-236` | Implementato | buono per flusso ospite |
| Invoice PDF | `routes/api.php:359-360`, `InvoicePdfService.php`, `resources/views/pdf/invoice.blade.php` | Implementato | aggiunta forte rispetto alla baseline |
| Pickup flow | `routes/api.php:404-407`, `Brt/PickupService.php` | Implementato | presente ma non certificato runtime |
| Bordero | `routes/api.php:408-409`, `ShipmentExecutionService.php`, `BorderoPdfBuilder.php` | Implementato | presente |
| Send documents | `routes/api.php:410-411`, `ShipmentDocumentDispatcher.php`, `ShipmentDocumentsMail.php` | Implementato | presente |
| COD e servizi correlati | `OrderCreationService.php`, `ShipmentServicePricingService.php`, `AutomaticSupplementCalculator.php` | Implementato con riserva | copertura logica presente; richiede test e2e |

## 3. Coerenza del modello dati

### Segnali positivi
- `Order` contiene campi `brt_*` ricchi e ormai significativi:
  - `brt_tracking_number`
  - `brt_tracking_url`
  - `brt_label_base64`
  - `brt_pudo_id`
  - `brt_all_labels`
  - `brt_raw_response`
- `OrderCreationService.php:56-58` collega davvero i pacchi all'ordine con `quantity`
- `ShipmentService.php:32-33` usa la somma reale di peso e colli per il payload BRT
- `CartSurchargeCalculator.php` e `OrderCreationService.php` conoscono `selected_pudo` e `delivery_mode`

### Lettura
Il dominio non e' piu' soltanto "frontend che promette"; backend e modello dati sono ormai consapevoli di PUDO, multi-collo e documenti.

## 4. Flusso eventi

### Flusso dichiarato nel codice
- `EventServiceProvider.php:25-30`
  - `OrderPaid` -> `MarkOrderProcessing`
  - `OrderPaid` -> `GenerateBrtLabel`
  - `OrderPaid` -> `SendOrderConfirmation`
- `EventServiceProvider.php:36-38`
  - `ShipmentStatusChanged` -> `SendShipmentStatusEmail`

### Giudizio
Questo e' un miglioramento vero. L'architettura si sta muovendo verso un flusso eventi piu' chiaro, soprattutto per generazione etichetta, processing ordine e mail di conferma.

## 5. Problemi e gap reali

### 5.1 Bug funzionale confermato: conteggio colli nelle email
- `resources/views/emails/order-confirmation.blade.php:62-70`
- `resources/views/emails/shipment-status.blade.php:108-110`

Problema:
- le email usano `packages->count()`
- il dominio reale usa `quantity` come numero colli

Conseguenza:
- un ordine con 1 record e `quantity = 3` puo' mostrare una mail da 1 collo ma spedire 3 colli su BRT

### 5.2 Drift tra codice e commenti
- `SendOrderConfirmation.php` continua a descriversi come listener di `OrderCreated`
- `EventServiceProvider.php` lo registra su `OrderPaid`

Non e' un bug runtime certo, ma e' un problema di leggibilita' e manutenzione.

### 5.3 Dominio BRT ancora ibrido
Esistono ancora sia:
- `app/Services/BrtService.php`
- i servizi specializzati sotto `app/Services/Brt/*`

Questo e' utile per compatibilita', ma lascia il dominio in una forma ancora ibrida: parte moderna, parte wrapper legacy.

### 5.4 Rischi di sicurezza/manutenzione non chiusi del tutto
- `bootstrap/app.php:63-71` esclude ancora `api/*` dal controllo CSRF
- `app/Http/Middleware/SecurityHeaders.php:104-116` contiene ancora `unsafe-eval` nella CSP
- `app/Models/Order.php:81` lascia `brt_label_base64` nei campi fillable

Questi punti erano gia' evidenziati nei piani di sicurezza e non sono ancora completamente chiusi.

## 6. Certificazione runtime

### Cosa posso dire con alta confidenza
- il dominio e' coperto staticamente e in modo coerente
- le rotte e i servizi principali ci sono davvero
- la modellazione del flusso BRT/PUDO/documenti non e' piu' superficiale

### Cosa non posso ancora certificare da questo ambiente
- create/confirm/delete shipment contro backend attivo
- label generation completa
- pickup reale
- invoice e bordero in esecuzione vera
- send-documents end-to-end
- copertura test effettivamente passata in locale

## 7. Verdetto finale dominio prodotto

Giudizio netto:
- **copertura funzionale: buona**
- **maturita' architetturale: buona con aree ibride**
- **certezza runtime: ancora incompleta**

Il dominio BRT/PUDO/etichette/documenti e' una delle aree dove il progetto e' cresciuto di piu'. Il prossimo salto non e' aggiungere nuove route: e' certificare bene quello che gia' esiste e chiudere i bug residui.
