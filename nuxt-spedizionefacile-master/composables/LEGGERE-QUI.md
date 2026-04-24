# Composables - Puntatore Locale

Questa guida locale non e' piu' autorevole: i composable vivi vanno letti a
partire dalle docs canoniche e dai boundary reali del frontend.

Per orientarti senza duplicare documentazione, parti da qui:

- [../../docs/FRONTEND_STRUCTURE.md](../../docs/FRONTEND_STRUCTURE.md)
- [../../docs/FEATURE_BOUNDARIES.md](../../docs/FEATURE_BOUNDARIES.md)
- [../../docs/DESIGN_SYSTEM.md](../../docs/DESIGN_SYSTEM.md)

Entry point locali consigliati:

1. `useShipmentStepPageOrchestration.js`
2. `useCart.js`
3. `usePayment.js`
4. `useAuth.js`
5. `../stores/shipmentFlowStore.ts`

Regola pratica:

- `composables/` = logica stateful e boundary di feature
- `stores/` = stato condiviso minimo
- `docs/` = source of truth documentale

Se trovi informazioni in conflitto tra questo file e `docs/`, vale sempre
`docs/`.
