# Models - Leggere Qui

Questa cartella contiene i **modelli Eloquent** di Laravel.
Ogni modello rappresenta una tabella del database e definisce campi, relazioni e regole di business.

---

## 1. Cosa contiene questa cartella

17 modelli PHP, ciascuno corrispondente a una tabella del database.

Categorie principali:
- **Spedizione** -- Package, PackageAddress, Service, Order
- **Utente** -- User, UserAddress, BillingAddress
- **Pagamenti** -- Transaction, WalletMovement, Coupon
- **Referral** -- ReferralUsage, WithdrawalRequest, ProRequest
- **Contenuti** -- Article, Location, Setting
- **Prezzi** -- PriceBand

---

## 2. Ordine consigliato per capire

Segui il flusso dei dati, dalla registrazione alla spedizione:

1. **User.php** -- Chi usa il sistema e con quali ruoli (User, Partner Pro, Admin)
2. **Package.php** -- Il pacco da spedire: tipo, peso, dimensioni, prezzo
3. **PackageAddress.php** -- Da dove e verso dove (indirizzo partenza e destinazione)
4. **Service.php** -- Tipo di servizio scelto (standard, express) con data e orario ritiro
5. **Order.php** -- L'ordine che raggruppa pacchi, stato e dati BRT
6. **Transaction.php** -- Il pagamento dell'ordine (carta, bonifico)
7. **WalletMovement.php** -- I movimenti del portafoglio virtuale
8. **PriceBand.php** -- Le fasce di prezzo per peso e volume

---

## 3. File principali e responsabilita'

| Modello | Tabella DB | Responsabilita' |
|---------|-----------|-----------------|
| **Order.php** | `orders` | Ordine di spedizione. Contiene lo stato, il subtotale (centesimi), i campi BRT (etichetta, tracking, PUDO), i campi rimborso. Costanti per gli stati. |
| **User.php** | `users` | Utente registrato. Dati personali, ruolo, codice referral. Metodi `walletBalance()`, `commissionBalance()`, `isAdmin()`, `isPro()`. |
| **Package.php** | `packages` | Singolo collo. Tipo (Pacco, Pallet, Valigia), peso, 3 dimensioni, quantita', prezzo. Collegato a indirizzi e servizio. |
| **PackageAddress.php** | `package_addresses` | Indirizzo specifico di un pacco (partenza o destinazione). Nome, via, citta', CAP, provincia, telefono. |
| **UserAddress.php** | `user_addresses` | Rubrica indirizzi dell'utente. Indirizzi salvati per riutilizzo. |
| **BillingAddress.php** | `billing_addresses` | Indirizzo di fatturazione dell'utente. |
| **Service.php** | `services` | Servizio di spedizione. Tipo (standard, express, economy), data ritiro, orario ritiro, dati aggiuntivi (JSON). |
| **Transaction.php** | `transactions` | Tentativo di pagamento. Totale (centesimi), ID Stripe, tipo (card, bank_transfer), stato (succeeded, failed). |
| **WalletMovement.php** | `wallet_movements` | Movimento portafoglio. Tipo (credit/debit), importo (**in euro**), fonte (stripe, commission, withdrawal). |
| **PriceBand.php** | `price_bands` | Fascia di prezzo. Tipo (weight/volume), range min/max, prezzo base e scontato (centesimi). |
| **Coupon.php** | `coupons` | Buono sconto. Codice, percentuale, stato attivo/disattivo. |
| **ReferralUsage.php** | `referral_usages` | Traccia quando un codice referral viene utilizzato. |
| **WithdrawalRequest.php** | `withdrawal_requests` | Richiesta prelievo commissioni Partner Pro. Importo, stato (pending, approved, rejected, completed). |
| **ProRequest.php** | `pro_requests` | Richiesta per diventare Partner Pro. Richiede approvazione admin. |
| **Article.php** | `articles` | Contenuto editoriale (guide o servizi). Titolo, slug, sezioni JSON, FAQ JSON. |
| **Location.php** | `locations` | Localita' italiana. CAP, nome citta', sigla provincia. Per autocompletamento. |
| **Setting.php** | `settings` | Impostazione chiave-valore. Metodi statici `get()` e `set()`. |
| **ContactMessage.php** | `contact_messages` | Messaggio dal modulo contatti. |

---

## 4. Compiti comuni e dove intervenire

| Esigenza | File da modificare |
|----------|-------------------|
| Aggiungere un campo all'utente | `User.php` (array `$fillable`) + nuova migrazione DB |
| Aggiungere un campo al pacco | `Package.php` (array `$fillable`) + nuova migrazione DB |
| Aggiungere uno stato all'ordine | `Order.php` (costante + metodo `getStatus`) |
| Modificare il calcolo del saldo | `User.php` (metodo `walletBalance`) |
| Modificare il calcolo commissioni | `User.php` (metodo `commissionBalance`) |
| Aggiungere un campo all'indirizzo pacco | `PackageAddress.php` (array `$fillable`) + migrazione |
| Aggiungere un campo all'indirizzo utente | `UserAddress.php` (array `$fillable`) + migrazione |
| Cambiare la logica indirizzo predefinito | `UserAddress.php` (metodo `boot`) |
| Aggiungere una nuova impostazione | `Setting.php` (usa `Setting::get('chiave')` e `Setting::set('chiave', 'valore')`) |
| Aggiungere campi alle fasce prezzo | `PriceBand.php` (array `$fillable`) + migrazione |

**Nota sulle unita' di misura:**

| Campo | Unita' |
|-------|--------|
| `Order.subtotal` | centesimi |
| `Transaction.total` | centesimi |
| `Package.single_price` | centesimi |
| `PriceBand.base_price` | centesimi |
| `PriceBand.discount_price` | centesimi |
| `Order.cod_amount` | centesimi |
| `Order.cancellation_fee` | centesimi |
| `WalletMovement.amount` | **euro** |
| `WithdrawalRequest.amount` | **euro** |
| `Package.weight_price` | **euro** |
| `Package.volume_price` | **euro** |

---

## 5. Collegamenti ai tutorial e alle guide

- [Tutorial 04 - Primo cambiamento](../../../../docs/tutorial/04-PRIMO-CAMBIAMENTO.md) -- aggiungere un campo al profilo utente
- [Guida: Aggiungere un campo](../../../../docs/guide/AGGIUNGERE-CAMPO.md) -- procedura generica per qualsiasi modello
- [Riferimento: Modelli e database](../../../../docs/riferimento/MODELLI-DATABASE.md) -- tutti i campi e le relazioni
- [Riferimento: Stati ordine](../../../../docs/riferimento/STATI-ORDINE.md) -- transizioni degli stati
- [Glossario dominio](../../../../docs/architettura/GLOSSARIO-DOMINIO.md) -- significato dei termini usati nei modelli
