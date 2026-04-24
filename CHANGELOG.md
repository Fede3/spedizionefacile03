# CHANGELOG

All notable changes to this project are documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] - 2026-04-24 — Go-live Production

### Added
- Stripe live integration con webhook idempotency
- BRT production integration (intermediario diretto)
- Sentry FE+BE error tracking + performance monitoring
- Web Vitals tracking (LCP/INP/CLS/FCP/TTFB)
- Plausible + GA4 Consent Mode v2 analytics
- Health check endpoint /api/health (4 services)
- Database backup daily B2 + retention 30gg
- Redis queue + cache production
- CI/CD GitHub Actions (build + test + deploy)
- Husky pre-commit + commit-msg conventional commits
- Visual regression Playwright 45 snapshot baseline
- Unit tests services (63 test, 12 services)
- E2E critical paths (42 test, 10 spec)
- 10 SF atomic components library (SfButton/Card/Input/Badge/Icon/EmptyState/Skeleton/Toast/Tooltip/Modal)
- 174 design tokens main.css
- TrustBadges + NewsletterSignup components
- 4 error pages Laravel custom (404/500/503/403)
- Feedback widget beta (FeedbackWidget.vue)
- Beta whitelist middleware
- Docs 8 file: QUICKSTART, ARCHITECTURE, CONTRIBUTING, FRONTEND_STRUCTURE, BACKEND_STRUCTURE, API_CONTRACT, ONBOARDING, DEBUGGING
- Print CSS ordini/fatture/bordero

### Changed
- CSP production senza unsafe-inline script-src
- OAuth state da cookie a session + PKCE SHA256
- Email enumeration protection (response identico + timing normalization)
- File upload security (ImageSanitizer GD + FormRequest)
- Stripe account_id + customer_id encrypted at rest
- Composables 20+ migrati .js → .ts con 21 interfaces
- SeoMeta coverage 100% pagine public
- useCanonical dinamico 20 pagine
- JSON-LD 6 schema (LocalBusiness, Organization, BreadcrumbList, Service, Article, FAQPage)
- Docker Apache → PHP-FPM alpine + nginx sidecar + supervisord
- Queue worker Redis 2 procs supervisor
- AuthOverlay modal rebuilt (fix bordo, overlay, chiusura inaspettata)
- Pagine Guide/Traccia/Contatti/Servizi rewrite allineate Prototipo

### Fixed
- Security blockers 5/5 (Stripe encryption, CSP, OAuth, Email enum, File upload)
- Prerender bug h3 getResponseHeader (partial, mitigato)
- T3.6.5 preservato byte-identical durante split [step].vue

### Removed
- Blu Tailwind completamente (palette ferrea teal+arancione+neutri)
- Hex hardcoded CSS regole (318 → 0)
- 5.984 righe CODEX_*/TEAM_LOG archiviati
- 1.7MB build logs (13 file + pw-last.log)
- 9 file orfani 1434 righe (useRiepilogo, AccountProSkeleton, Skeleton, 5 riepilogo/*, OrderSummary)

### Security
- 5/5 security blockers chiusi
- CSP production hardened (report-only 48h → enforce)
- OAuth PKCE SHA256 + state session-based timing-safe hash_equals
- Password reset generic response + timing jitter 200-300ms
- Image upload GD re-encoding strippa EXIF + magic byte check

[1.0.0]: https://github.com/Boop91/spedizionefacile/releases/tag/v1.0.0
