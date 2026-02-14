# Models - Leggere Qui

Questa cartella contiene i modelli Eloquent di Laravel. Ogni modello rappresenta una tabella del database e definisce i campi, le relazioni con altri modelli, e le regole di business.

## I 3 file principali

1. **Order.php** - L'ordine di spedizione. Contiene lo stato dell'ordine, il subtotale, e tutti i campi BRT (etichetta, tracking, contrassegno). Ha le costanti degli stati possibili (PENDING, PROCESSING, IN_TRANSIT, ecc.).
2. **User.php** - L'utente registrato. Contiene i dati personali, il ruolo (User/Admin/Partner Pro), il codice referral, e i metodi per calcolare saldo portafoglio e commissioni.
3. **Package.php** - Il singolo pacco/collo da spedire. Contiene tipo, peso, dimensioni, prezzo, e i collegamenti a indirizzi di partenza/destinazione e servizio.

## Ordine di lettura consigliato

1. `User.php` - Chi usa il sistema e con quali ruoli
2. `Package.php` - Cosa viene spedito
3. `PackageAddress.php` - Da dove a dove
4. `Service.php` - Con quale tipo di servizio
5. `Order.php` - L'ordine che raggruppa tutto
6. `Transaction.php` - Come viene pagato
7. `WalletMovement.php` - Il portafoglio virtuale

## Quale file modificare per...

| Esigenza | File |
|----------|------|
| Aggiungere un campo all'utente | `User.php` (array `$fillable`) |
| Aggiungere un campo al pacco | `Package.php` (array `$fillable`) + migrazione DB |
| Aggiungere uno stato all'ordine | `Order.php` (costanti + metodo `getStatus`) |
| Modificare il calcolo del saldo | `User.php` (metodo `walletBalance`) |
| Modificare il calcolo commissioni | `User.php` (metodo `commissionBalance`) |
| Aggiungere un campo all'indirizzo | `PackageAddress.php` o `UserAddress.php` (array `$fillable`) |
| Cambiare la logica indirizzo predefinito | `UserAddress.php` (metodo `boot`) |
| Aggiungere una nuova impostazione | `Setting.php` (usa `Setting::get/set`) |
