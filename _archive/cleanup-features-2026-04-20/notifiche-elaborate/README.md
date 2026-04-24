# Notifiche In-App Elaborate — Archivio

Stato: **GIA' ARCHIVIATO** — verifica eseguita il 2026-04-20.

## Dove si trovano i file

La feature "notifiche in-app elaborate" era gia' stata archiviata in una
cartella precedente durante l'Ondata 5 del programma di semplificazione frontend
(stesso giorno, 2026-04-20, runner "Agente O5"). Per evitare duplicazione, i
file NON sono stati copiati nuovamente qui.

Percorso reale dell'archivio:

```
_archive/frontend-simplification-2026-04-20/features/notifiche-in-app/
├── README_REATTIVAZIONE.md
└── pages/account/notifiche.vue    (746 LOC)
```

## Contenuto archiviato

| File | LOC | Ruolo |
|------|-----|-------|
| `pages/account/notifiche.vue` | 746 | Pagina elenco notifiche utente con filtri, mark-as-read, preferenze. |

Note:
- Non esistevano componenti dedicati (nessun `NotificationDropdown`,
  `NotificationList`, `NotificationCenter`, `NotificationBell`, ecc.).
- Non esistevano composables dedicati (nessun `useNotifications`,
  `useNotificationCenter`, ecc.).
- Non esisteva una campanella nella Navbar.
- L'unico entry point era la pagina `/account/notifiche` + link nel menu
  account (rimosso) + link nella sezione Notifiche di `AccountProfiloView.vue`
  (sostituito con placeholder "Via assistenza").

## Motivo rimozione (benchmark competitor)

I migliori intermediari BRT sul mercato (SpedirePro, PaccoFacile,
SpedireSubito) non offrono un sistema di notifiche in-app elaborato. Usano
esclusivamente email transazionali + eventuali banner in pagina. Il sistema
custom da ~746 LOC era un overhead non giustificato dal dominio.

Le notifiche operative (tracking BRT, conferma ordine, fattura pronta) sono
comunque inviate tramite email e webhook BRT, quindi nessuna funzione di
business e' stata persa.

## Riferimenti cleanup gia' eseguito

File modificati per la rimozione il 2026-04-20:

1. `nuxt-spedizionefacile-master/pages/account/notifiche.vue` — spostato
   nell'archivio frontend-simplification.
2. `nuxt-spedizionefacile-master/utils/accountNavigationGroups.ts` — rimossi
   item `{ label: 'Notifiche', to: '/account/notifiche', iconKey: 'bell' }`
   da `clientNavGroups` e `proNavGroups` (backup originale disponibile in
   `_archive/frontend-simplification-2026-04-20/nav-originale/`).
3. `nuxt-spedizionefacile-master/components/account/AccountProfiloView.vue` —
   sostituito il link attivo con una riga informativa "Notifiche email —
   Via assistenza" (placeholder semplice, `opacity-70`, nessun dropdown).

## Come riattivare la feature

Vedi istruzioni complete in
`_archive/frontend-simplification-2026-04-20/features/notifiche-in-app/README_REATTIVAZIONE.md`.

Riassunto:
1. `cp` del file `notifiche.vue` dall'archivio a
   `nuxt-spedizionefacile-master/pages/account/notifiche.vue`.
2. Aggiungere di nuovo gli item `Notifiche` in `accountNavigationGroups.ts`
   (`clientNavGroups` + `proNavGroups`).
3. Riattivare il link in `AccountProfiloView.vue`.
4. Verificare che l'endpoint backend `/api/notifications*` sia ancora live.
5. `npm run build` + smoke test su `/account/notifiche`.

## Perche' questa cartella esiste se vuota

Il task dell'operatore del 2026-04-20 cercava l'archivio sotto
`_archive/cleanup-features-2026-04-20/notifiche-elaborate/` (nomenclatura
diversa da quella usata in Ondata 5). Questo README serve da pointer per
evitare confusione: l'archiviazione e' gia' completa, i file sono nell'altra
cartella.
