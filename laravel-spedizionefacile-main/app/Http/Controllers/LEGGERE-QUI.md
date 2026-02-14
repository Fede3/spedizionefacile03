# Controllers - Leggere Qui

Questa cartella contiene i controller del backend Laravel. Ogni controller gestisce un gruppo di funzionalita del sito, ricevendo le richieste dal frontend e restituendo risposte JSON.

## I 3 file principali

1. **StripeController.php** - Gestisce tutti i pagamenti con carta di credito (Stripe), la creazione degli ordini dal carrello, e la gestione delle carte salvate.
2. **CartController.php** - Gestisce il carrello per utenti loggati: aggiunta pacchi, modifica quantita, rimozione, svuotamento. Salva i dati nel database tramite la tabella `cart_user`.
3. **BrtController.php** - Gestisce la comunicazione con il corriere BRT: creazione spedizioni, generazione etichette PDF, tracking, e ricerca punti PUDO.

## Ordine di lettura consigliato

1. `SessionController.php` - Il punto di partenza: salva il preventivo in sessione
2. `CartController.php` - Come i pacchi entrano nel carrello
3. `StripeController.php` - Come avviene il pagamento e la creazione dell'ordine
4. `OrderController.php` - Come vengono gestiti gli ordini
5. `BrtController.php` - Come viene generata l'etichetta di spedizione

## Quale file modificare per...

| Esigenza | File |
|----------|------|
| Cambiare il calcolo del prezzo | `SessionController.php` (riga 64-100) e `OrderController.php` (riga 122-144) |
| Aggiungere un metodo di pagamento | `StripeController.php` |
| Modificare la logica del carrello | `CartController.php` (loggato) o `GuestCartController.php` (ospite) |
| Cambiare i dati inviati a BRT | `BrtController.php` + `../Services/BrtService.php` |
| Modificare la registrazione | `CustomRegisterController.php` |
| Modificare il login | `CustomLoginController.php` |
| Aggiungere funzionalita admin | `AdminController.php` |
| Modificare il portafoglio | `WalletController.php` |
| Modificare i codici referral | `ReferralController.php` |
| Modificare i prelievi commissioni | `WithdrawalController.php` |
| Aggiungere autocompletamento citta | `LocationController.php` |
