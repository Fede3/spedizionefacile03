# Archive — v2 Consolidamento (2026-04-25)

## Pacchetto 2: tagli safe rapidi

### Pagine archiviate
- `pages/termini-condizioni.vue` (16 LOC) — redirect 301 già gestito da `nuxt.config.ts` routeRules `/termini-condizioni → /termini-e-condizioni`. Pagina duplicata.
- `pages/riepilogo.vue` (528 LOC) — trampolino legacy che faceva redirect a `/la-tua-spedizione/2?step=pagamento`. Nessun link pubblico usa più `/riepilogo`.
- `pages/account/ordini/[id].vue` (35 LOC) — redirect orfano a `/account/spedizioni/[id]`. Non linkato da nessuna sidebar.
- `pages/autenticazione/` (cartella vuota) — eliminata, era residuo di refactor precedente.

### Componenti archiviati
- `components/sf/SfAlert.vue` (108 LOC) — primitive alert mai usata da nessun componente. Eventuale futuro alert si farà con Nuxt UI `<UAlert>`.
- `components/shipment/OrderStatusBadge.vue` (96 LOC) — duplicato di `AdminStatusBadge`. Le pagine usano sempre quest'ultimo.
- `components/account/AccountDashboardAdmin.vue` (~300 LOC) — dead code legacy. La dashboard admin attuale è in `pages/account/amministrazione/index.vue` con `AdminConsoleAnalytics` lazy-loaded.

## Reattivazione

Nessuno di questi file dovrebbe servire. In caso di dubbio:
1. `mv _archive/v2-consolidamento-2026-04-25/<file> nuxt-spedizionefacile-master/<destinazione>`
2. `npm run dev` + verifica preview

## Date di purga definitiva
- Pianificato: **2026-10-25** (6 mesi). Se non ripristinato, può essere rimosso definitivamente.
