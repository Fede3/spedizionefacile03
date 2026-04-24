# Checklist Sicurezza Deploy — SpediamoFacile

## Database
- [ ] Migrare a MySQL/PostgreSQL managed (NO SQLite in produzione)
- [ ] Abilitare encryption at rest
- [ ] Configurare SSL/TLS per connessioni DB
- [ ] Impostare backup automatici giornalieri
- [ ] Configurare IP whitelisting per accesso DB
- [ ] APP_KEY diverso da sviluppo (genera con: php artisan key:generate)

## Credenziali
- [ ] Stripe keys in .env (mai in codice)
- [ ] BRT credentials in .env
- [ ] DB password forte
- [ ] MAIL password in .env

## Headers di sicurezza (già configurati)
- [x] CSP headers (nuxt-security + SecurityHeaders.php)
- [x] HSTS (backend su HTTPS)
- [x] X-Content-Type-Options, X-Frame-Options
- [x] Rate limiting su tutti gli endpoint

## GDPR
- [x] Cookie consent con reject
- [x] Privacy checkbox registrazione
- [x] Data export endpoint
- [x] Delete account endpoint
- [ ] Registro trattamenti dati (documento formale)
- [ ] DPIA (Data Protection Impact Assessment)
- [ ] Piano breach notification (72h)

## Produzione
- [ ] CORS ristretto al dominio reale
- [ ] Queue worker attivo (supervisor)
- [ ] Cron scheduler attivo
- [ ] Error monitoring (Sentry/Bugsnag)
- [ ] SSL certificate
- [ ] CDN per assets statici
