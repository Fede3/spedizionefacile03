# Glossario di Dominio - SpediamoFacile

Vocabolario dei termini usati nel codice.
Per ogni termine: significato, dove si trova e possibili fonti di confusione.

---

## Preventivo

**Significato:**
Calcolo del prezzo stimato per una spedizione.
L'utente inserisce tipo di collo, peso, dimensioni e citta'.
Il sistema calcola il prezzo in base alle **fasce** di peso e volume.

**Dove si usa:**
- `nuxt: components/Preventivo.vue` -- componente con calcolo lato frontend
- `nuxt: components/Homepage/PreventivoRapido.vue` -- versione compatta nella homepage
- `nuxt: pages/preventivo.vue` -- pagina dedicata al preventivo
- `laravel: app/Http/Controllers/SessionController.php` -- calcolo lato server (metodo `firstStep`)
- `nuxt: composables/useSession.js` -- gestione dati sessione preventivo

**Attenzione:**
Il prezzo viene calcolato sia nel frontend che nel backend.
Il calcolo che fa fede e' sempre quello del backend (in `SessionController`).
Il frontend calcola un'anteprima, il backend ricalcola al salvataggio.

---

## Fascia (Price Band)

**Significato:**
Intervallo di peso o volume con un prezzo associato.
Ci sono 7 fasce peso e 7 fasce volume.
Il prezzo finale e' il **maggiore** tra fascia peso e fascia volume.

**Dove si usa:**
- `laravel: app/Models/PriceBand.php` -- modello con campi `type`, `min_value`, `max_value`, `base_price`, `discount_price`
- `laravel: app/Http/Controllers/SessionController.php` -- metodo `findBandPrice()` cerca la fascia giusta
- `laravel: app/Http/Controllers/PriceBandController.php` -- CRUD admin delle fasce
- `laravel: app/Http/Controllers/PublicPriceBandController.php` -- endpoint pubblico con cache 60 min
- `nuxt: composables/usePriceBands.js` -- caricamento fasce nel frontend

**Attenzione:**
I prezzi nel modello `PriceBand` sono in **centesimi** (890 = 8,90 euro).
I valori `min_value` e `max_value` sono in kg per il peso, in m3 per il volume, con 4 decimali.
Il `SessionController` converte da centesimi a euro dividendo per 100.

---

## Supplemento CAP90

**Significato:**
Sovrapprezzo di +2,50 euro applicato quando il CAP di partenza o destinazione inizia con "90" (zone della Sicilia).
Si applica per ciascun indirizzo: se entrambi iniziano con "90", il supplemento e' +5,00 euro.

**Dove si usa:**
- `laravel: app/Http/Controllers/SessionController.php` -- metodo `firstStep()`, righe con `str_starts_with($cap, '90')`
- `nuxt: components/Preventivo.vue` -- funzione `checkPrices()` applica lo stesso supplemento lato frontend

**Attenzione:**
Il controllo e' su `str_starts_with`, quindi vale per tutti i CAP che iniziano con 90 (90xxx).

---

## Pacco (Package)

**Significato:**
Un singolo collo da spedire.
Ha tipo, peso, tre dimensioni (lunghezza, larghezza, altezza), quantita' e prezzo.

**Dove si usa:**
- `laravel: app/Models/Package.php` -- modello con `package_type`, `weight`, `first_size`, `second_size`, `third_size`, `quantity`, `single_price`
- `laravel: app/Http/Controllers/CartController.php` -- CRUD pacchi nel carrello
- `nuxt: components/Preventivo.vue` -- form di inserimento pacchi

**Attenzione:**
`single_price` e' il prezzo totale per quel collo (prezzo unitario moltiplicato per la quantita').
`single_price` nel database e' in **centesimi**. `weight_price` e `volume_price` sono in **euro**.
I tipi validi sono: **Pacco**, **Pallet**, **Valigia**.

---

## Pallet

**Significato:**
Tipo di collo per spedizioni di grandi dimensioni.
Una pedana di legno con merce sopra, usata per trasporti industriali.

**Dove si usa:**
- `nuxt: components/Preventivo.vue` -- opzione nel selettore tipo collo
- `laravel: app/Models/Package.php` -- campo `package_type` con valore "Pallet"

**Attenzione:**
Nessuna confusione particolare. Segue le stesse regole di prezzo degli altri tipi.

---

## Valigia

**Significato:**
Tipo di collo per bagagli personali.
Usato tipicamente per spedizioni di valigie prima o dopo un viaggio.

**Dove si usa:**
- `nuxt: components/Preventivo.vue` -- opzione nel selettore tipo collo
- `laravel: app/Models/Package.php` -- campo `package_type` con valore "Valigia"

**Attenzione:**
Nessuna confusione particolare. Segue le stesse regole di prezzo degli altri tipi.

---

## Carrello (Cart)

**Significato:**
Raccolta temporanea di pacchi che l'utente vuole spedire.
Esiste in due varianti: carrello database (utenti loggati) e carrello sessione (ospiti).

**Dove si usa:**
- `laravel: app/Http/Controllers/CartController.php` -- carrello per utenti autenticati (salva in DB tramite tabella pivot `cart_user`)
- `laravel: app/Http/Controllers/GuestCartController.php` -- carrello per ospiti (salva in sessione)
- `nuxt: composables/useCart.js` -- gestione unificata lato frontend
- `nuxt: pages/carrello.vue` -- pagina del carrello

**Attenzione:**
Il carrello utente usa la tabella pivot `cart_user` per collegare utente e pacchi.
Il carrello ospite usa la sessione e si perde alla chiusura del browser.
`CartController.index()` esegue auto-merge di pacchi identici.

---

## Articolo (Article)

**Significato:**
Contenuto editoriale del sito: guide informative o pagine servizio.
Funziona come un CMS semplice con titolo, slug, sezioni e FAQ.

**Dove si usa:**
- `laravel: app/Models/Article.php` -- modello con campi `title`, `slug`, `type` ("guide" o "service"), `sections`, `faqs`
- `laravel: app/Http/Controllers/ArticleController.php` -- CRUD admin
- `laravel: app/Http/Controllers/PublicArticleController.php` -- lettura pubblica
- `nuxt: pages/guide/[slug].vue` -- pagina singola guida
- `nuxt: pages/servizi/[slug].vue` -- pagina singola servizio

**Attenzione:**
Non confondere con il termine generico "articolo" usato in e-commerce.
Qui **Article** e' un contenuto editoriale (guide, servizi), non un prodotto in vendita.

---

## Ordine (Order)

**Significato:**
L'entita' che rappresenta una spedizione pagata.
Contiene lo stato, il subtotale, i dati BRT e il collegamento ai pacchi tramite tabella pivot `package_order`.

**Dove si usa:**
- `laravel: app/Models/Order.php` -- modello con costanti di stato e campi `brt_*`
- `laravel: app/Http/Controllers/OrderController.php` -- gestione ciclo vita ordine
- `laravel: app/Http/Controllers/StripeController.php` -- creazione ordine dopo pagamento
- `nuxt: pages/account/spedizioni/[id].vue` -- dettaglio ordine lato utente

**Attenzione:**
`subtotal` e' in **centesimi** (1000 = 10,00 euro).
Nel codice "ordine" e "spedizione" sono usati in modo intercambiabile, ma nel database l'entita' e' `Order`.

---

## Spedizione

**Significato:**
L'intero processo di invio dei colli.
Nel codice non esiste un modello "Spedizione" separato: la spedizione **e' l'ordine** (`Order`).

**Dove si usa:**
- `nuxt: pages/account/spedizioni/` -- sezione utente dove vede le sue spedizioni
- `laravel: app/Models/Order.php` -- l'ordine rappresenta la spedizione

**Attenzione:**
L'utente vede "le mie spedizioni", ma nel database sono record nella tabella `orders`.
"Spedizione" e' il termine utente, "Ordine" e' il termine tecnico. Si riferiscono alla stessa cosa.

---

## Spedizione configurata (Saved Shipment)

**Significato:**
Template riutilizzabile di una spedizione gia' compilata.
L'utente salva una configurazione (indirizzi, pacchi, servizio) per riutilizzarla in futuro senza reinserire i dati.

**Dove si usa:**
- `laravel: app/Http/Controllers/SavedShipmentController.php` -- CRUD spedizioni salvate
- `nuxt: pages/account/spedizioni-configurate.vue` -- pagina di gestione

**Attenzione:**
Una spedizione configurata non e' un ordine. Non ha stato, non e' pagata.
E' solo un template da cui creare un nuovo carrello.

---

## Etichetta (Label)

**Significato:**
Documento PDF con codice a barre da stampare e attaccare al pacco.
Generata dalle API BRT dopo il pagamento dell'ordine.

**Dove si usa:**
- `laravel: app/Models/Order.php` -- campo `brt_label_base64` (PDF codificato in base64)
- `laravel: app/Http/Controllers/BrtController.php` -- metodo `downloadLabel()`
- `laravel: app/Listeners/GenerateBrtLabel.php` -- generazione automatica dopo evento `OrderPaid`

**Attenzione:**
Il campo `brt_label_base64` e' molto grande (PDF intero codificato).
Escluderlo dalle query di lista per non rallentare le performance.

---

## Tracking (Tracciamento)

**Significato:**
Sistema per seguire dove si trova il pacco durante il trasporto.
BRT fornisce un URL di tracking e un numero di tracking.

**Dove si usa:**
- `laravel: app/Models/Order.php` -- campi `brt_tracking_url`, `brt_tracking_number`
- `laravel: app/Http/Controllers/BrtController.php` -- metodi `tracking()`, `publicTracking()`
- `nuxt: pages/traccia-spedizione.vue` -- pagina pubblica di tracciamento

**Attenzione:**
`brt_tracking_number` e' il numero collo BRT (campo `parcelNumberFrom` nella risposta API).
`brt_tracking_url` e' il link completo al sito BRT per il tracciamento pubblico.

---

## PUDO (Pick Up Drop Off)

**Significato:**
Punto di ritiro convenzionato con BRT.
Tabaccai, edicole, negozi dove il destinatario puo' ritirare il pacco invece di riceverlo a domicilio.

**Dove si usa:**
- `laravel: app/Models/Order.php` -- campo `brt_pudo_id`
- `laravel: app/Http/Controllers/BrtController.php` -- metodi `pudoSearch()`, `pudoNearby()`
- `laravel: app/Services/BrtService.php` -- metodo `getPudoByAddress()`

**Attenzione:**
Il termine "Fermopoint" **non** e' usato nel codice. Il progetto usa sempre "PUDO" e le API BRT native.

---

## Contrassegno (COD - Cash On Delivery)

**Significato:**
Modalita' di pagamento in cui il destinatario paga al momento della consegna.
Il corriere incassa l'importo e lo versa al mittente.

**Dove si usa:**
- `laravel: app/Models/Order.php` -- campi `is_cod` (booleano) e `cod_amount` (centesimi)
- `laravel: app/Models/Service.php` -- campo `service_data` puo' contenere dati contrassegno
- `laravel: app/Services/BrtService.php` -- aggiunta servizio COD nel payload BRT
- `nuxt: pages/servizi/pagamento-alla-consegna.vue` -- pagina informativa

**Attenzione:**
`cod_amount` e' in **centesimi** (5000 = 50,00 euro).
`is_cod` e' un booleano: true = pagamento alla consegna attivo.

---

## Accredito (Credit)

**Significato:**
Movimento in entrata nel portafoglio.
Puo' essere una ricarica (da Stripe), una commissione referral, o un rimborso.

**Dove si usa:**
- `laravel: app/Models/WalletMovement.php` -- campo `type` con valore "credit"

**Attenzione:**
Non confondere con "credito Stripe". Qui accredito e' sempre un movimento interno al portafoglio.

---

## Rimborso (Refund)

**Significato:**
Restituzione del denaro all'utente dopo l'annullamento di un ordine.
Puo' avvenire su Stripe (carta) o sul portafoglio.
Viene applicata una commissione di 2,00 euro.

**Dove si usa:**
- `laravel: app/Http/Controllers/RefundController.php` -- logica di rimborso e cancellazione BRT
- `laravel: app/Models/Order.php` -- campi `refund_status`, `refund_amount`, `refund_method`, `cancellation_fee`

**Attenzione:**
Un ordine in stato `in_transit` non e' rimborsabile (il pacco e' gia' partito).
Solo gli stati `processing` e `completed` sono rimborsabili.
La commissione di annullamento (`cancellation_fee`) e' in centesimi (200 = 2,00 euro).

---

## Portafoglio (Wallet)

**Significato:**
Conto virtuale interno al sito.
L'utente ricarica con carta Stripe e usa il saldo per pagare le spedizioni.

**Dove si usa:**
- `laravel: app/Models/WalletMovement.php` -- ogni movimento e' un record con tipo "credit" o "debit"
- `laravel: app/Http/Controllers/WalletController.php` -- ricarica (`topUp`), pagamento (`payWithWallet`), saldo (`balance`)
- `laravel: app/Models/User.php` -- metodo `walletBalance()` calcola il saldo (somma credit - somma debit)
- `nuxt: pages/account/portafoglio.vue` -- pagina gestione portafoglio

**Attenzione:**
Gli importi in `WalletMovement` sono in **euro** (non centesimi), a differenza di `Transaction.total` e `Order.subtotal`.

---

## Ricarica (Top Up)

**Significato:**
Aggiunta di fondi al portafoglio tramite pagamento Stripe.
Crea un `WalletMovement` di tipo "credit" con source "stripe".

**Dove si usa:**
- `laravel: app/Http/Controllers/WalletController.php` -- metodo `topUp()`

**Attenzione:**
La ricarica passa per Stripe con `off_session: true` e `confirm: true`.
Richiede una carta gia' salvata (`payment_method_id`).

---

## Prelievo (Withdrawal)

**Significato:**
Richiesta di un Partner Pro di incassare le commissioni guadagnate.
Richiede approvazione dell'admin prima di essere eseguita.

**Dove si usa:**
- `laravel: app/Models/WithdrawalRequest.php` -- modello con stati "pending", "approved", "rejected", "completed"
- `laravel: app/Http/Controllers/WithdrawalController.php` -- creazione richiesta lato utente
- `laravel: app/Http/Controllers/AdminController.php` -- approvazione/rifiuto lato admin
- `nuxt: pages/account/prelievi.vue` -- pagina lato utente

**Attenzione:**
L'approvazione da parte dell'admin crea un `WalletMovement` di tipo "debit" con source "withdrawal".
Solo una richiesta pending alla volta per utente.

---

## Sessione (Quote Session)

**Significato:**
Memoria temporanea lato server che conserva i dati del preventivo in corso.
Contiene: dettagli spedizione, lista pacchi, prezzo totale e passo corrente.

**Dove si usa:**
- `laravel: app/Http/Controllers/SessionController.php` -- salvataggio e lettura dati sessione
- `laravel: app/Http/Controllers/GuestCartController.php` -- carrello ospiti basato su sessione
- `nuxt: composables/useSession.js` -- lettura dati sessione dal frontend

**Attenzione:**
La sessione si perde quando il browser viene chiuso.
I dati della sessione **non** sono legati a un utente.
Quando l'utente si logga, i dati vanno trasferiti dal carrello sessione al carrello database.

---

## Servizio (Service)

**Significato:**
Tipo di spedizione scelto dall'utente.
Include tipo servizio (standard, express, economy), data di ritiro e orario di ritiro.
Puo' contenere dati aggiuntivi come l'importo del contrassegno.

**Dove si usa:**
- `laravel: app/Models/Service.php` -- modello con campi `service_type`, `date`, `time`, `service_data`
- `laravel: app/Services/BrtService.php` -- mappatura `service_type` ai codici servizio BRT
- `laravel: app/Http/Controllers/CartController.php` -- creazione servizio insieme al pacco

**Attenzione:**
Se `service_type` e' vuoto, i controller lo forzano a "Nessuno".
Il campo `service_data` e' un JSON che puo' contenere dati variabili (es. importo contrassegno).

---

## Stato ordine (Order Status)

**Significato:**
Lo stato corrente dell'ordine nel suo ciclo di vita.

| Stato | Significato | Rimborsabile |
|-------|-------------|--------------|
| `pending` | In attesa di pagamento | no |
| `processing` | Pagamento ricevuto, in lavorazione | si (con commissione 2 euro) |
| `payment_failed` | Pagamento fallito | no |
| `in_transit` | Pacco in viaggio | no (gia' partito) |
| `completed` | Spedizione conclusa | si (con commissione 2 euro) |
| `delivered` | Pacco consegnato | no |
| `cancelled` | Annullato dall'utente | stato terminale |
| `refunded` | Rimborso completato | stato terminale |

**Dove si usa:**
- `laravel: app/Models/Order.php` -- costanti `PENDING`, `PROCESSING`, `IN_TRANSIT`, ecc.
- `laravel: app/Models/Order.php` -- metodo `getStatus()` traduce in italiano

**Attenzione:**
Lo stato `in_giacenza` appare nella traduzione ma non ha una costante dedicata.
Non confondere `completed` (spedizione conclusa dal lato SpediamoFacile) con `delivered` (pacco consegnato al destinatario).

---

## Transazione (Transaction)

**Significato:**
Un singolo tentativo di pagamento per un ordine.
Un ordine puo' avere piu' transazioni (es. un tentativo fallito e poi uno riuscito).

**Dove si usa:**
- `laravel: app/Models/Transaction.php` -- modello con campi `total`, `ext_id`, `type`, `status`
- `laravel: app/Http/Controllers/StripeController.php` -- creazione dopo pagamento

**Attenzione:**
`total` e' in **centesimi** (1250 = 12,50 euro).
`type` indica il metodo: "card", "bank_transfer", "paypal".
`ext_id` e' l'ID del PaymentIntent Stripe.

---

## Coupon

**Significato:**
Buono sconto con codice alfanumerico e percentuale di sconto.
Viene applicato al momento del pagamento.

**Dove si usa:**
- `laravel: app/Models/Coupon.php` -- modello con campi `code`, `percentage`, `active`
- `laravel: app/Http/Controllers/CouponController.php` -- verifica e calcolo sconto
- `nuxt: pages/account/amministrazione/coupon.vue` -- gestione admin

**Attenzione:**
Il coupon ha priorita' rispetto al codice referral.
Se si usa un coupon, lo sconto referral non si applica.

---

## Referral (Codice Amico)

**Significato:**
Sistema di passaparola. Un Partner Pro condivide un codice di 8 caratteri.
Chi lo usa riceve uno sconto del 5%. Il Partner Pro guadagna una commissione del 5%.

**Dove si usa:**
- `laravel: app/Models/User.php` -- campi `referral_code`, `referred_by`
- `laravel: app/Models/ReferralUsage.php` -- tracciamento utilizzi
- `laravel: app/Http/Controllers/ReferralController.php` -- applicazione e calcolo

**Attenzione:**
Il codice referral viene generato automaticamente (8 caratteri) alla creazione di un utente con ruolo "Partner Pro".

---

## Partner Pro

**Significato:**
Utente con ruolo speciale (`role = "Partner Pro"`).
Ha un codice referral e guadagna commissioni sugli ordini di chi usa il suo codice.

**Dove si usa:**
- `laravel: app/Models/User.php` -- campo `role`, metodo `isPro()`
- `laravel: app/Http/Controllers/ProRequestController.php` -- richiesta per diventare Pro
- `nuxt: pages/account/account-pro.vue` -- pagina stato Pro

**Attenzione:**
Per diventare Pro serve inviare una richiesta e ottenere l'approvazione dell'admin.
Il campo `role` non e' in `$fillable` per sicurezza: va impostato manualmente.

---

## Localita' (Location)

**Significato:**
Record con CAP, nome citta' e sigla provincia.
Usato per l'autocompletamento degli indirizzi nel frontend.

**Dove si usa:**
- `laravel: app/Models/Location.php` -- modello con `postal_code`, `place_name`, `province`
- `laravel: app/Http/Controllers/LocationController.php` -- ricerca per nome o CAP

**Attenzione:**
La tabella `locations` e' precaricata con tutte le localita' italiane.
Un CAP puo' corrispondere a piu' citta' (zone rurali con CAP condiviso).

---

## Impostazione (Setting)

**Significato:**
Coppia chiave-valore per configurazioni dinamiche del sito.
Permette di modificare credenziali e opzioni senza toccare il file `.env`.

**Dove si usa:**
- `laravel: app/Models/Setting.php` -- metodi statici `Setting::get('key')` e `Setting::set('key', 'value')`
- `laravel: app/Http/Controllers/SettingsController.php` -- configurazione Stripe dal pannello admin

**Attenzione:**
Tutti i valori sono stringhe. La conversione al tipo corretto e' responsabilita' del chiamante.
Le chiavi principali: `stripe_key`, `stripe_secret`, `stripe_test_mode`, `brt_customer_id`, `brt_username`, `brt_password`.
