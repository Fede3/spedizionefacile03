# Controllers/Admin - Leggere Qui

Questa cartella contiene i controller del **pannello di amministrazione**. Tutte le rotte qui richiedono autenticazione + ruolo Admin (middleware `auth:sanctum` + `CheckAdmin`).

## File principali

1. **OrderManagementController.php** - Lista ordini, cambio stato, lista spedizioni BRT, rigenerazione etichette, gestione PUDO.
2. **DashboardController.php** - Statistiche della dashboard admin (ordini, utenti, fatturato).
3. **UserManagementController.php** - Lista utenti, approvazione, cambio ruolo, cambio tipo utente, eliminazione.
4. **WalletManagementController.php** - Panoramica portafogli, movimenti utente, approvazione/rifiuto prelievi.
5. **ContentController.php** - Messaggi di contatto ricevuti, impostazioni generali del sito.
6. **CouponController.php** - CRUD coupon sconto (creazione, modifica, eliminazione).
7. **HomepageImageController.php** - Upload e recupero immagine homepage.
8. **ReferralStatsController.php** - Statistiche sul sistema referral.

## Come si usa

Tutti questi controller sono chiamati dal frontend Nuxt (pagine `/admin/*`). Le rotte sono definite in `routes/api.php` sotto il gruppo `prefix('admin')`.

## Quale file modificare per...

| Esigenza | File |
|----------|------|
| Aggiungere filtri alla lista ordini | `OrderManagementController.php` metodo `orders()` |
| Aggiungere statistiche alla dashboard | `DashboardController.php` |
| Cambiare la gestione utenti | `UserManagementController.php` |
| Gestire i prelievi commissioni | `WalletManagementController.php` |
| Gestire i contenuti del sito | `ContentController.php` |
