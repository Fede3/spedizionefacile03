# Controllers/Admin - Puntatore Locale

Questa guida locale non e' piu' autorevole: i controller admin vanno letti come
boundary HTTP di superfici gia' mappate nelle docs canoniche.

Per orientarti bene:

- [../../../../../docs/BACKEND_STRUCTURE.md](../../../../../docs/BACKEND_STRUCTURE.md)
- [../../../../../docs/FEATURE_BOUNDARIES.md](../../../../../docs/FEATURE_BOUNDARIES.md)
- [../../routes/api/README.md](../../routes/api/README.md)

Entry point locali consigliati:

1. `OrderManagementController.php`
2. `DashboardController.php`
3. `UserManagementController.php`

Regola pratica:

- controller admin = boundary HTTP operativo
- service = business logic vera
- docs canoniche = `docs/`

Se trovi informazioni in conflitto tra questo file e `docs/`, vale sempre
`docs/`.
