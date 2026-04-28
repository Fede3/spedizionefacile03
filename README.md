# SpediamoFacile

Intermediazione spedizioni BRT: preventivo, funnel ordine, wallet, account cliente, admin console.

## Stack (v2.0 monolite)

- **Backend + frontend**: Laravel 11 + Inertia 2 + Vue 3.5 + Tailwind 4 + Vite 5
- **DB**: SQLite (dev) / Postgres (prod)
- **Pagamenti**: Stripe Checkout hosted + Bonifico + Wallet
- **Corriere**: BRT REST 3.x (etichette, tracking, PUDO)
- **Test**: PHPUnit (backend) + Playwright (E2E)

## Setup (~10 minuti)

```bash
git clone <repo>
cd spedizionefacile/apps/api
composer install
npm install
cp .env.example .env && php artisan key:generate
php artisan migrate:fresh --seed
npm run build              # production
# OPPURE per dev:
npm run dev &              # Vite HMR
php artisan serve          # Laravel :8000
```

Apri http://localhost:8000.

## Documentazione

- [`CLAUDE.md`](CLAUDE.md) — convenzioni + regole AI
- [`docs/ONBOARDING.md`](docs/ONBOARDING.md) — primo giorno dev (~20 min)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — panoramica + diagrammi
- [`docs/operations/DEPLOY.md`](docs/operations/DEPLOY.md) — pipeline produzione
- [`docs/legal/SECURITY.md`](docs/legal/SECURITY.md) — baseline OWASP
- [`docs/legal/GDPR_COMPLETO.md`](docs/legal/GDPR_COMPLETO.md) — compliance

## Convenzioni

- **Italiano** per stringhe utente, **English** per identifier
- **Palette**: teal `#095866` + arancione `#E44203` (mai blu)
- **Prezzi**: backend in cents, frontend mostra `(cents/100).toFixed(2) + ' €'`
- **Auth**: sessione Laravel + Inertia shared props (zero composable FE)

## License

Proprietario — vedi [`LICENSE`](LICENSE).
