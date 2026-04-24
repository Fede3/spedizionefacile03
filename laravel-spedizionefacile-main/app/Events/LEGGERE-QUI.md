# Events - Puntatore Locale

Questa guida locale non e' piu' autorevole: gli eventi vanno letti nel loro
boundary reale, non come catalogo isolato.

Per partire nel modo giusto:

- [../../../docs/BACKEND_STRUCTURE.md](../../../docs/BACKEND_STRUCTURE.md)
- [../../../docs/FEATURE_BOUNDARIES.md](../../../docs/FEATURE_BOUNDARIES.md)

Reading order locale consigliato:

1. `OrderPaid.php`
2. `../Listeners/GenerateBrtLabel.php`
3. `../Providers/EventServiceProvider.php`

Regola pratica:

- `Events/` annuncia
- `Listeners/` reagisce
- `docs/` decide il boundary corretto

Se trovi informazioni in conflitto tra questo file e `docs/`, vale sempre
`docs/`.
