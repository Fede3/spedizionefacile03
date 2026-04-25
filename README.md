# SpediamoFacile

Monorepo della piattaforma **SpediamoFacile**: intermediazione spedizioni BRT con preventivo rapido, funnel ordine one-page, account cliente e console admin.

## Stack

- **Frontend**: Nuxt 4.1 + Vue 3.5 + Pinia 3 + Tailwind CSS 4 + Nuxt UI 4
- **Backend**: Laravel 11 + Sanctum 4 + PostgreSQL + Redis
- **Pagamenti**: Stripe 18 (carta, 3DS), bonifico, wallet
- **Spedizioni**: integrazione BRT REST 3.x (etichette, tracking, PUDO)
- **Test**: Playwright + Vitest (frontend), Pest/PHPUnit (backend)

## Struttura repo

```
.
├── nuxt-spedizionefacile-master/   Frontend Nuxt 4.1
├── laravel-spedizionefacile-main/  Backend Laravel 11
├── docs/                           Documentazione canonica
├── infra/                          Configurazioni infrastruttura
├── scripts/                        Tooling locale
├── .github/workflows/              CI/CD GitHub Actions
└── .husky/                         Pre-commit hooks
```

Tutto il resto (`_archive/`, `_LOG/`, `output/`, `_data/`, `docs/archive/`) è **gitignored**: contiene solo log/snapshot di lavoro locale, non parte del prodotto.

## Setup rapido

```bash
# 1. Clone + installa dipendenze root (husky + lint-staged)
git clone <repo-url>
cd spedizionefacile
npm install

# 2. Frontend
cd nuxt-spedizionefacile-master
npm install
cp .env.example .env
npm run dev   # http://localhost:3000

# 3. Backend (in altro terminale)
cd laravel-spedizionefacile-main
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve   # http://localhost:8000
```

Setup dettagliato: [`docs/QUICKSTART.md`](docs/QUICKSTART.md).

## Documentazione

Partire da [`docs/README.md`](docs/README.md) per l'indice completo. Documenti chiave:

- [`docs/QUICKSTART.md`](docs/QUICKSTART.md) — setup locale step-by-step
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — panoramica di sistema
- [`docs/FRONTEND_STRUCTURE.md`](docs/FRONTEND_STRUCTURE.md) — struttura Nuxt
- [`docs/BACKEND_STRUCTURE.md`](docs/BACKEND_STRUCTURE.md) — struttura Laravel
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — grammatica UI
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — convenzioni di sviluppo
- [`docs/legal/SECURITY.md`](docs/legal/SECURITY.md) — security baseline
- [`docs/operations/DEPLOY.md`](docs/operations/DEPLOY.md) — procedure di deploy

## Quality gates

- **CI**: lint + typecheck + build + test E2E + security audit (`.github/workflows/ci.yml`)
- **Pre-commit**: lint-staged (frontend) + Pint (backend) via Husky
- **Commit messages**: convenzionali (`feat:`, `fix:`, `chore:`...) verificati con commitlint

## Convenzioni

- **Italiano** per commenti, doc, commit message, output utente
- **Palette**: teal `#095866` + arancione `#E44203` (mai blu)
- **Prezzi**: backend in cents, frontend `formatPrice()` divide per 100
- **Auth**: Sanctum SPA cookie, usare `useSanctumClient()` per chiamate API

Dettagli completi: [`CLAUDE.md`](CLAUDE.md) (anche per agenti AI).

## License

Proprietario — vedi [`LICENSE`](LICENSE).
