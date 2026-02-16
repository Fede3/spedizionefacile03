# Controllers - Leggere Qui

Questa cartella contiene i **controller** del backend Laravel.
Ogni controller gestisce un gruppo di funzionalita', riceve le richieste dal frontend e restituisce risposte JSON.

---

## 1. Cosa contiene questa cartella

35 controller PHP, ciascuno dedicato a un'area funzionale del sito.

Categorie principali:
- **Preventivo e carrello** -- SessionController, CartController, GuestCartController
- **Pagamenti** -- StripeController, StripeWebhookController, WalletController, CouponController
- **Ordini e spedizioni** -- OrderController, BrtController, RefundController, SavedShipmentController
- **Autenticazione** -- CustomLoginController, CustomRegisterController, GoogleController, VerificationController, PasswordResetRequestController, ChangePasswordController
- **Utente** -- UserController, AddressController, UserAddressController, BillingAddressController
- **Admin** -- AdminController, SettingsController, PriceBandController, ArticleController, PublicArticleController, PublicPriceBandController
- **Altro** -- ContactController, LocationController, ReferralController, ProRequestController, WithdrawalController, StripeConnectController, PackageController

---

## 2. Ordine consigliato per capire

Segui il flusso dell'utente dal preventivo al pagamento:

1. **SessionController.php** -- Il punto di partenza: salva il preventivo in sessione
2. **CartController.php** -- Come i pacchi entrano nel carrello (utenti loggati)
3. **GuestCartController.php** -- Come funziona il carrello per gli ospiti (sessione)
4. **StripeController.php** -- Come avviene il pagamento e la creazione dell'ordine
5. **OrderController.php** -- Come vengono gestiti gli ordini dopo il pagamento
6. **BrtController.php** -- Come viene generata l'etichetta e comunicato con BRT
7. **RefundController.php** -- Come funzionano annullamenti e rimborsi

---

## 3. File principali e responsabilita'

| File | Responsabilita' |
|------|-----------------|
| **SessionController.php** | Gestisce la sessione del preventivo rapido. Calcola i prezzi in base a fasce peso/volume e supplemento CAP90. |
| **CartController.php** | CRUD del carrello per utenti autenticati. Salva pacchi, indirizzi e servizi nel database tramite tabella pivot `cart_user`. Auto-merge di pacchi identici. |
| **GuestCartController.php** | Carrello identico ma per ospiti non registrati. I dati vivono nella sessione server. |
| **StripeController.php** | Pagamenti con carta di credito via Stripe. Crea PaymentIntent, gestisce carte salvate, crea ordini dopo il pagamento. |
| **StripeWebhookController.php** | Riceve notifiche automatiche da Stripe (webhook). Aggiorna lo stato della transazione. |
| **WalletController.php** | Portafoglio virtuale: saldo, ricarica (topUp), pagamento (payWithWallet), lista movimenti. |
| **OrderController.php** | Gestione ciclo vita ordini. Lista ordini utente, dettaglio, cambio stato. |
| **BrtController.php** | Comunicazione con il corriere BRT: creazione spedizioni, generazione etichette PDF, tracking, ricerca PUDO. |
| **RefundController.php** | Annullamento ordini e rimborsi (Stripe o portafoglio). Cancellazione etichette BRT. Commissione di 2 euro. |
| **SavedShipmentController.php** | Spedizioni configurate: template riutilizzabili con indirizzi, pacchi e servizio pre-compilati. |
| **AdminController.php** | Dashboard admin: statistiche, lista ordini, gestione utenti, portafogli, prelievi. |
| **CouponController.php** | Verifica e calcolo sconto coupon. Il coupon ha priorita' sul referral. |
| **ReferralController.php** | Applicazione codice referral: sconto 5% all'acquirente, commissione 5% al Partner Pro. |
| **LocationController.php** | Autocompletamento indirizzi: ricerca citta' e CAP nella tabella `locations`. |
| **CustomLoginController.php** | Login con email e password. Trasferisce il carrello sessione al carrello database dopo il login. |
| **CustomRegisterController.php** | Registrazione nuovo utente con ruolo "User". |
| **GoogleController.php** | Login e registrazione tramite Google OAuth. |

---

## 4. Compiti comuni e dove intervenire

| Esigenza | File da modificare |
|----------|-------------------|
| Cambiare il calcolo del prezzo | `SessionController.php` (metodo `firstStep`, `findBandPrice`) |
| Aggiungere un metodo di pagamento | `StripeController.php` |
| Modificare la logica del carrello | `CartController.php` (utenti) o `GuestCartController.php` (ospiti) |
| Cambiare i dati inviati a BRT | `BrtController.php` + `../Services/BrtService.php` |
| Modificare la registrazione | `CustomRegisterController.php` |
| Modificare il login | `CustomLoginController.php` |
| Aggiungere funzionalita' admin | `AdminController.php` |
| Modificare il portafoglio | `WalletController.php` |
| Modificare i codici referral | `ReferralController.php` |
| Modificare i prelievi commissioni | `WithdrawalController.php` |
| Aggiungere autocompletamento citta' | `LocationController.php` |
| Modificare le regole di rimborso | `RefundController.php` |
| Gestire le fasce di prezzo | `PriceBandController.php` (admin) o `PublicPriceBandController.php` (pubblico) |
| Gestire i coupon | `CouponController.php` |

---

## 5. Collegamenti ai tutorial e alle guide

- [Tutorial 04 - Primo cambiamento](../../../../docs/tutorial/04-PRIMO-CAMBIAMENTO.md) -- come aggiungere un campo al profilo utente
- [Tutorial 05 - Secondo cambiamento](../../../../docs/tutorial/05-SECONDO-CAMBIAMENTO.md) -- come aggiungere un servizio alla spedizione
- [Tutorial 06 - Terzo cambiamento](../../../../docs/tutorial/06-TERZO-CAMBIAMENTO.md) -- come modificare il checkout
- [Guida: Modificare regole prezzo](../../../../docs/guide/MODIFICARE-REGOLA-PREZZO.md)
- [Guida: Configurare BRT](../../../../docs/guide/CONFIGURARE-BRT.md)
- [Guida: Configurare Stripe](../../../../docs/guide/CONFIGURARE-STRIPE.md)
- [Guida: Gestire stati ordine](../../../../docs/guide/GESTIRE-STATI-ORDINE.md)
- [Riferimento: API Endpoints](../../../../docs/riferimento/API-ENDPOINTS.md)
- [Glossario dominio](../../../../docs/architettura/GLOSSARIO-DOMINIO.md)
