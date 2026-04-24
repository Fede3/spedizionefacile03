# Architecture & Code Quality Matrix

## 1. Quadro generale

Il refactor ha funzionato meglio dove ha trasformato file-pagina e controller monolitici in moduli con ownership chiara. Ha funzionato meno bene dove la complessita' e' stata spostata in composables o CSS molto grandi senza un secondo pass di semplificazione.

## 2. Matrice moduli principali

| Modulo | Evidenza su HEAD | Esito | Lettura |
|---|---|---|---|
| Shipment step | `pages/la-tua-spedizione/[step].vue` a `219` righe | Buono con riserva | la pagina e' finalmente un orchestratore; parte della complessita' e' finita nei composables |
| Riepilogo | `pages/riepilogo.vue` a `159` righe | Buono | split riuscito, struttura piu' leggibile |
| Account Pro | `pages/account/account-pro.vue` `534 -> 130` | Buono | refactor riuscito e leggibile |
| Portafoglio | `pages/account/portafoglio.vue` `148` | Buono | vista alleggerita; resta da vedere la UX runtime |
| Admin Prezzi | `pages/account/amministrazione/prezzi.vue` `2178 -> 266` | Parziale forte | page ottima, ma `useAdminPrezzi.js` e' ancora enorme |
| Preventivo | `components/Preventivo.vue` `273` | Medio-buono | componente piu' piccolo, ma resta molto peso nei composables e nei CSS |
| Checkout | page alleggerita ma `useCheckout.js` `924` | Parziale | buon split, ma ancora troppo debito nel composable |
| BRT backend | `ShipmentService.php 257`, `PudoService.php 218`, `BrtController.php 285` | Buono | dominio piu' separato e leggibile |
| Stripe backend | `StripeController.php 213` | Buono | grande miglioramento rispetto allo storico |
| Root / repo structure | docs piu' ordinate, ma root ancora rumorosa | Parziale | migliorata ma non ancora pulita al livello promesso |

## 3. File realmente migliorati

### Refactor riusciti
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/prezzi.vue`
- `nuxt-spedizionefacile-master/pages/account/account-pro.vue`
- `nuxt-spedizionefacile-master/pages/riepilogo.vue`
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php`
- `laravel-spedizionefacile-main/app/Services/Brt/ShipmentService.php`
- `laravel-spedizionefacile-main/app/Services/Brt/PudoService.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/BrtController.php`

### Refactor solo parzialmente risolti
- `nuxt-spedizionefacile-master/composables/useAdminPrezzi.js`
- `nuxt-spedizionefacile-master/composables/useShipmentStepValidation.js`
- `nuxt-spedizionefacile-master/composables/useAddressForm.js`
- `nuxt-spedizionefacile-master/composables/useCheckout.js`
- `nuxt-spedizionefacile-master/composables/usePreventivo.js`
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- `nuxt-spedizionefacile-master/assets/css/preventivo.css`

## 4. Hotspot ancora troppo grandi su HEAD

### Frontend
| File | Righe | Lettura |
|---|---:|---|
| `assets/css/main.css` | 1479 | troppo design system e fix insieme |
| `assets/css/shipment-step.css` | 1412 | lo step 2 continua a concentrare molto debito UI |
| `composables/useAdminPrezzi.js` | 1163 | vero monolite spostato dal page file |
| `assets/css/preventivo.css` | 1039 | styling molto stratificato |
| `composables/useShipmentStepValidation.js` | 1011 | validazione e stato ancora troppo densi |
| `composables/useAddressForm.js` | 967 | ownership mista tra dati, ui e side effects |
| `composables/useCheckout.js` | 924 | troppo cross-cutting in un solo composable |
| `composables/usePreventivo.js` | 878 | logica ancora pesante |

### Backend core
| File | Righe | Lettura |
|---|---:|---|
| `routes/api.php` | 573 | ancora molto grande per responsabilita' e sicurezza |
| `app/Http/Controllers/CartController.php` | 398 | non drammatico, ma resta denso |
| `app/Services/EuropePriceEngineService.php` | 394 | complesso per natura, da isolare bene |
| `app/Services/InvoicePdfService.php` | 380 | dimensione accettabile ma da monitorare |
| `app/Http/Controllers/OrderController.php` | 370 | ancora parecchia orchestrazione |
| `app/Http/Controllers/SessionController.php` | 367 | peso ancora alto sul preventivo/sessione |

## 5. Duplicazioni e incoerenze residue

### Duplicazioni tecniche aperte
- `nuxt-spedizionefacile-master/utils/shipmentServicePricing.js`
- `nuxt-spedizionefacile-master/utils/utils/shipmentServicePricing.js`
- `nuxt-spedizionefacile-master/utils/shipmentFlowState.js`
- `nuxt-spedizionefacile-master/utils/utils/shipmentFlowState.js`

Queste copie sono un segnale chiaro di consolidamento incompleto.

### Naming incoerente
- `nuxt-spedizionefacile-master/composables/UseAdminImage.js`

### Route/view duplicate o ambigue lato frontend
- `pages/account/indirizzi.vue`
- `pages/account/indirizzi/index.vue`
- `pages/account/spedizioni/[id].vue`
- `pages/account/spedizioni/[spedizione].vue`
- `pages/login.vue` e `pages/autenticazione.vue`

Il problema non e' solo estetico: duplica comportamenti, test e aspettative UX.

## 6. Junior readability

### Dove siamo andati bene
- pagine principali meno monolitiche
- servizi backend BRT piu' leggibili
- piu' componenti e composables con ownership visibile
- documentazione interna buona e ampia

### Dove non siamo ancora al target promesso
- il junior capisce meglio i confini dei moduli, ma non sempre i dettagli interni
- i file sopra le `800-1000` righe restano non adatti al target "5 minuti per file"
- la presenza di doppioni `utils/` e route simili aumenta il carico cognitivo

## 7. Debito tecnico residuo prioritizzato

### Priorita' alta
1. spezzare `useAdminPrezzi.js`
2. spezzare `useShipmentStepValidation.js`
3. consolidare `shipmentServicePricing` e `shipmentFlowState`
4. eliminare alias/doppioni di route account
5. ridurre `shipment-step.css` e `preventivo.css`

### Priorita' media
1. ridurre `useCheckout.js`
2. ridurre `usePreventivo.js`
3. snellire `routes/api.php` con gruppi piu' netti
4. rinominare `UseAdminImage.js`

### Priorita' bassa
1. consolidare altri CSS secondari
2. pulizia ulteriore dei commenti legacy
3. razionalizzazione dei file preview/supporto

## 8. Giudizio finale architetturale

Il refactor e' riuscito nelle zone in cui ha **sostituito** file ingestibili con moduli leggibili. Dove invece ha solo **spostato** volume in un layer nuovo, il beneficio c'e' ma e' incompleto.

Giudizio finale:
- architettura: migliorata davvero
- qualità del codice: migliorata davvero
- semplicità junior-first: ancora parziale
