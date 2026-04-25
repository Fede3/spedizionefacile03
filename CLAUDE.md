# CLAUDE.md — Istruzioni per Claude Code in questo repo

> Questo file viene letto automaticamente da Claude Code (versione CLI/SDK)
> all'apertura del progetto. Contiene convenzioni che valgono per TUTTE le
> sessioni AI sulla repo.

## Stack
- Frontend: `nuxt-spedizionefacile-master/` (Nuxt 4.1 + Vue 3.5 + Pinia 3 + Tailwind 4 + Nuxt UI 4)
- Backend: `laravel-spedizionefacile-main/` (Laravel 11 + Sanctum 4 + Stripe 18 + BRT REST 3.x)
- Docs essenziali: `docs/` (22 docs + 3 ADR + ARCHITECTURE_MAP.md per overview visiva)

## Quickstart
- Setup completo: `docs/QUICKSTART.md` (15 min)
- Onboarding dev: `docs/ONBOARDING.md` (30 min)
- Mappa visuale: `docs/ARCHITECTURE_MAP.md`

## Convenzioni codice
- **Prezzi**: backend in cents (`MyMoney` / moneyphp). Frontend usa `formatPrice()` che divide per 100.
- **Auth**: Sanctum SPA cookie + CSRF. Usa `useSanctumClient()` per chiamate API, NON $fetch raw.
- **Routes API**: `/api/*` prefix automatico per `routes/api/*.php`. Webhooks BRT su `/webhooks/brt/tracking` (web.php, NO `/api`).
- **Componenti**: configurato `pathPrefix: false` — componenti accessibili col loro nome file (es. `<ServizioGrid>`, non `<ServiziServizioGrid>`).
- **Palette**: teal `#095866` + arancione `#E44203` + neutri. **Mai blu** (no `blue-*`, `indigo-*`, `sky-*`, `slate-*` Tailwind).
- **Tokens CSS**: in `assets/css/main.css` (vedi `--color-brand-*`). Preferire `var(--token, #fallback)` a hex hardcoded.

## CSS architecture (importante — evita bug visivi)
Alcuni CSS sono caricati SOLO da pagine/componenti specifici (code-splitting route-specific):
- `shipment-step.css` → solo `pages/la-tua-spedizione/[step].vue`
- `preventivo.css` → solo `components/Preventivo.vue`
- `autenticazione.css` → solo `components/auth/AuthOverlayModal.vue` + pages auth (`login`, `registrazione`, `recupera-password`, `aggiorna-password`, `verifica-email`)
- `contatti.css`, `servizi.css`, `homepage-servizi.css` → solo pagine/componenti corrispondenti

**REGOLA**: se scrivi una classe CSS **condivisa** tra componenti che possono vivere su pagine diverse (es. pill button, segmented control, form field), NON metterla in un CSS route-specific. Mettila in:
- `assets/css/components/sf-segment.css` (segmented + flow CTA + btn-compact già qui)
- `assets/css/main.css` (tokens globali)
- un nuovo file in `assets/css/components/` importato da `main.css`

Esempio vissuto: `.sf-shared-segment*` era solo in `shipment-step.css` → il segmented "Pacco/Pallet/Valigia" nell'homepage era senza stile. Spostato in `components/sf-segment.css` ora funziona ovunque.

**Come capire se una classe va globale**: grep il nome della classe fuori dal suo CSS di definizione. Se è usata in `components/` NON del dominio del CSS (es. classe in `shipment-step.css` usata da `auth/`), va spostata in globale.

## Test
- Frontend: `npx playwright test tests/e2e/*.spec.ts` (28 specs)
- Backend: `php artisan test` (52 test files)
- Build: `npm run build` deve essere verde

## Regole AI
- Mai `git commit` senza permesso esplicito utente
- Italiano per tutto (commenti, doc, output)
- Verifica con preview MCP dopo ogni modifica visibile
- Max 3 agent paralleli
- Riferimento standard UX: Awwwards / Baymard / NN Group

## Riferimenti
- `docs/README.md` — indice navigabile completo
- `docs/SECURITY.md` — baseline OWASP
- `docs/GOLIVE_CHECKLIST.md` — checklist deploy
- `docs/GDPR_COMPLETO.md` — compliance GDPR
