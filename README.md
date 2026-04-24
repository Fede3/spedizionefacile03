# SpediamoFacile Monorepo

Workspace monorepo di **SpediamoFacile**, piattaforma di intermediazione spedizioni BRT con:

- preventivo rapido e funnel ordine one-page
- pagamenti carta, bonifico, wallet e PayPal
- account cliente e console admin
- tracking, documenti, etichette e integrazione BRT
- coupon/referral e wallet

Questo file e' una **landing pulita della repo**.  
La documentazione canonica vive in [`docs/README.md`](docs/README.md).

## Come leggere la repo

La root e' una **workspace shell**, non il posto dove capire tutto il prodotto.

- `nuxt-spedizionefacile-master/` -> frontend Nuxt vivo
- `laravel-spedizionefacile-main/` -> backend Laravel vivo
- `docs/` -> documentazione canonica e attiva
- `_archive/` -> snapshot tecnici, refactor superseded, materiale archiviato del workspace
- `docs/archive/` -> storico documentale e handoff non piu' canonici
- `_LOG/` -> evidenze locali di test, screenshot e probe
- `output/`, `_data/` -> artefatti operativi e dati locali di supporto
- `scripts/` -> tooling locale e automazioni di supporto

Output locali strutturati:

- `output/runtime-state/` -> URL preview, porte e stato runtime locali
- `output/scratch/` -> scratch e dump temporanei non autorevoli
- `scripts/local-tools/claude/` -> launcher Claude locali non runtime

Regola pratica:

- **codice runtime** = frontend + backend
- **fonte documentale** = `docs/`
- **storico e output** = fuori dal percorso canonico del prodotto

## Inizia qui

- [`docs/README.md`](docs/README.md) -> indice documentale ufficiale
- [`docs/QUICKSTART.md`](docs/QUICKSTART.md) -> setup locale
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) -> panoramica di sistema
- [`docs/FEATURE_BOUNDARIES.md`](docs/FEATURE_BOUNDARIES.md) -> mappa delle feature core e dei boundary reali
- [`docs/FRONTEND_STRUCTURE.md`](docs/FRONTEND_STRUCTURE.md) -> struttura frontend reale
- [`docs/BACKEND_STRUCTURE.md`](docs/BACKEND_STRUCTURE.md) -> struttura backend reale
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) -> grammatica UI condivisa

Se devi orientarti rapidamente, l'ordine consigliato e' questo:

1. [`docs/README.md`](docs/README.md)
2. [`docs/QUICKSTART.md`](docs/QUICKSTART.md)
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
4. [`docs/FEATURE_BOUNDARIES.md`](docs/FEATURE_BOUNDARIES.md)
5. [`docs/FRONTEND_STRUCTURE.md`](docs/FRONTEND_STRUCTURE.md) oppure [`docs/BACKEND_STRUCTURE.md`](docs/BACKEND_STRUCTURE.md)

## Scope core launch

Il core launch che questa repo deve tenere perfettamente funzionante e' questo:

- quick quote / preventivo rapido
- funnel canonico `/la-tua-spedizione/[step]`
- ordine -> pagamento -> documenti -> account/admin
- pagamenti: carta, bonifico, wallet, PayPal
- tracking / PUDO / BRT
- wallet
- coupon/referral reali
- account cliente
- admin operativo

Funzioni fuori dal core launch:

- reclami dedicati
- SDI / fatturazione elettronica avanzata
- spedizioni salvate
- superfici duplicate o legacy non canoniche

## Avvio locale

Per l'avvio locale e le procedure operative usa:

- [`docs/QUICKSTART.md`](docs/QUICKSTART.md)
- [`docs/DEBUGGING.md`](docs/DEBUGGING.md)
- [`docs/DEPLOY.md`](docs/DEPLOY.md)

Non usare questo file come manuale operativo lungo: il suo scopo e' solo orientare rapidamente.

## Nota sulla documentazione

La repo contiene molto storico utile.  
Lo storico non va perso, ma **non deve essere confuso con il codice vivo**.

Per questo:

- `docs/` contiene la documentazione canonica
- `docs/archive/` contiene storico documentale e audit superseded
- `_archive/` contiene snapshot tecnici e materiale repo non piu' vivo
- `_LOG/`, `output/`, `_data/` contengono artefatti di lavoro locale o verifiche

Shortcut pratico:

- per capire il prodotto attuale: `docs/`
- per ricostruire una scelta storica: `docs/archive/`
- per recuperare codice o refactor superseded: `_archive/`
- per prove locali, screenshot e audit: `_LOG/`

## Nota per agenti e tooling

[`CLAUDE.md`](CLAUDE.md) e' un documento operativo per agenti/tooling e continuita di sessione.  
Non e' la documentazione prodotto principale: per quella, partire sempre da [`docs/README.md`](docs/README.md).
