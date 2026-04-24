# Models - Puntatore Locale

Questa guida locale non e' piu' autorevole: i modelli vanno letti dentro i
boundary di business veri, non come catalogo isolato della cartella.

Per orientarti senza seguire documentazione storica o driftata:

- [../../../docs/BACKEND_STRUCTURE.md](../../../docs/BACKEND_STRUCTURE.md)
- [../../../docs/FEATURE_BOUNDARIES.md](../../../docs/FEATURE_BOUNDARIES.md)

Reading order locale consigliato:

1. `User.php`
2. `Order.php`
3. `Package.php`
4. `Transaction.php`
5. `WalletMovement.php`
6. `ReferralUsage.php`

Promemoria critico:

- `Order.subtotal` e `Transaction.total` restano in centesimi
- `WalletMovement.amount` e `WithdrawalRequest.amount` restano in euro
- campi, relazioni e invarianti business vanno verificati nel codice vivo

Se trovi informazioni in conflitto tra questo file e `docs/`, vale sempre
`docs/`.
