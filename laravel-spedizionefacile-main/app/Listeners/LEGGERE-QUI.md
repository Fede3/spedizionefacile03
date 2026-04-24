# Listeners - Puntatore Locale

Questa guida locale non e' piu' autorevole: i listener vanno letti insieme agli
eventi e al flow reale post-pagamento/post-ordine.

Per partire dai boundary corretti:

- [../../../docs/BACKEND_STRUCTURE.md](../../../docs/BACKEND_STRUCTURE.md)
- [../../../docs/FEATURE_BOUNDARIES.md](../../../docs/FEATURE_BOUNDARIES.md)

Reading order locale consigliato:

1. `../Events/OrderPaid.php`
2. `MarkOrderProcessing.php`
3. `GenerateBrtLabel.php`
4. `../Providers/EventServiceProvider.php`

Regola pratica:

- evento = annuncio
- listener = reazione
- service = business o adapter piu' pesante

Se trovi informazioni in conflitto tra questo file e `docs/`, vale sempre
`docs/`.
