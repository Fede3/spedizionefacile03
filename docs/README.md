# Documentazione SpediamoFacile

Indice unico e canonico della documentazione attiva del monorepo.

Regola semplice:

- `docs/` = documentazione attiva e autorevole
- `archive/` = storico documentale e handoff superseded
- `../_archive/` = snapshot tecnici e materiale repo archiviato
- `../_LOG/` = evidenze locali, screenshot e probe
- root `README.md` = landing rapida della workspace

## Inizia qui

- [QUICKSTART.md](QUICKSTART.md) -> setup locale
- [ARCHITECTURE.md](ARCHITECTURE.md) -> panoramica di sistema
- [FEATURE_BOUNDARIES.md](FEATURE_BOUNDARIES.md) -> mappa delle feature core, dei boundary e delle superfici canoniche
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) -> grammatica UI condivisa
- [GLOSSARIO.md](GLOSSARIO.md) -> lessico di dominio

Ordine di lettura consigliato per onboarding rapido:

1. [QUICKSTART.md](QUICKSTART.md)
2. [ARCHITECTURE.md](ARCHITECTURE.md)
3. [FEATURE_BOUNDARIES.md](FEATURE_BOUNDARIES.md)
4. [FRONTEND_STRUCTURE.md](FRONTEND_STRUCTURE.md) oppure [BACKEND_STRUCTURE.md](BACKEND_STRUCTURE.md)
5. [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) se stai toccando UI

## Documenti canonici

- [ARCHITECTURE.md](ARCHITECTURE.md) -> panoramica attuale di sistema
- [FRONTEND_STRUCTURE.md](FRONTEND_STRUCTURE.md) -> struttura frontend reale
- [BACKEND_STRUCTURE.md](BACKEND_STRUCTURE.md) -> struttura backend reale
- [API_CONTRACT.md](API_CONTRACT.md) -> contratto API applicativo
- [FEATURE_BOUNDARIES.md](FEATURE_BOUNDARIES.md) -> dove entrano e dove finiscono funnel, payment, wallet, coupon/referral, account/admin
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) -> primitive e grammatica condivisa

## Riferimenti estesi

- [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) -> riferimento esteso e audit architetturale; utile, ma non la prima fonte canonica
- [ONBOARDING.md](ONBOARDING.md) -> percorso guidato per nuovi dev
- [VISUAL_REGRESSION.md](VISUAL_REGRESSION.md) -> baseline Playwright

## Non partire da qui

Questi documenti sono utili, ma non sono il primo ingresso consigliato:

- [API_CONTRACT.md](API_CONTRACT.md) -> reference applicativa; da leggere dopo i boundary e la struttura
- [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) -> mappa estesa/audit, non overview rapida
- [ROADMAP.md](ROADMAP.md) -> direzione e backlog, non source of truth del runtime
- [archive/](archive/) -> solo storico documentale
- [../_archive/](../_archive/) -> solo memoria tecnica del workspace

## Sviluppo

- [CONTRIBUTING.md](CONTRIBUTING.md) -> workflow, hook, branch, PR
- [DEBUGGING.md](DEBUGGING.md) -> troubleshooting e errori frequenti
- [FAQ_DEV.md](FAQ_DEV.md) -> domande ricorrenti
- [adr/](adr/) -> decisioni architetturali registrate
  - [001 - Autenticazione Sanctum SPA cookie-based](adr/001-sanctum-spa-auth.md)
  - [002 - Prezzi in cents con moneyphp/money](adr/002-moneyphp-cents.md)
  - [003 - Integrazione BRT diretta (no aggregator)](adr/003-brt-direct-integration.md)

## Operations

- [DEPLOY.md](DEPLOY.md) -> deploy produzione
- [SECURITY.md](SECURITY.md) -> policy sicurezza
- [GOLIVE_CHECKLIST.md](GOLIVE_CHECKLIST.md) -> checklist go-live e rollback
- [STRIPE_LIVE_SETUP.md](STRIPE_LIVE_SETUP.md) -> setup Stripe live
- [BRT_PRODUCTION_SETUP.md](BRT_PRODUCTION_SETUP.md) -> setup BRT production
- [PUDO_FALLBACK_SETUP.md](PUDO_FALLBACK_SETUP.md) -> fallback PUDO locale

## Legal & Compliance

- [LEGAL_GOLIVE_CHECKLIST.md](LEGAL_GOLIVE_CHECKLIST.md) -> blocker business/GDPR pre go-live
- [GDPR_COMPLETO.md](GDPR_COMPLETO.md) -> registro trattamenti e piano breach

## Progetto

- [../README.md](../README.md) -> landing workspace
- [../CHANGELOG.md](../CHANGELOG.md) -> storico release
- [ROADMAP.md](ROADMAP.md) -> roadmap e debito tecnico

## Storico

- [archive/](archive/) -> documenti storici, snapshot, handoff e materiale consolidato

Usare `archive/` per consultazione e recovery documentale, non come source of truth del codice vivo.
