# Deploy — SpediamoFacile Backend Laravel

Documento operativo per il rilascio in produzione / staging.

## Sentry (error tracking)

### Variabili .env richieste

| Variabile | Obbligatoria | Valore tipico | Note |
| --- | --- | --- | --- |
| `SENTRY_LARAVEL_DSN` | Si (produzione) | `https://xxx@o0.ingest.sentry.io/yyy` | Creare progetto Laravel su sentry.io |
| `SENTRY_RELEASE` | Si (produzione) | `abc1234` (GIT SHA breve) | Popolato da CI, fallback automatico a HEAD |
| `SENTRY_TRACES_SAMPLE_RATE` | No | `0.1` | Default 10%. In caso di quota stretta: `0.05` |
| `SENTRY_PROFILES_SAMPLE_RATE` | No | `0.0` | Lasciare off salvo debug mirati |
| `SENTRY_TEST_ROUTE_ENABLED` | No | `false` | Attivare temporaneamente per test post-deploy |

### Installazione pacchetto

```bash
cd laravel-spedizionefacile-main
composer require sentry/sentry-laravel
php artisan sentry:publish --dsn="$SENTRY_LARAVEL_DSN"
```

La pubblicazione del config NON sovrascrive `config/sentry.php` gia' presente in repo (la pubblicazione va eseguita SOLO la prima volta su un ambiente nuovo, poi rimossa).

### Test integrazione post-deploy

1. Abilitare temporaneamente la test route in produzione:
   ```bash
   # Sul server:
   echo "SENTRY_TEST_ROUTE_ENABLED=true" >> .env
   php artisan config:clear
   ```
2. Visitare `https://spediamofacile.it/_test-sentry`.
3. In Sentry dashboard verificare che:
   - L'evento appaia entro 30 secondi;
   - Il tag `release` corrisponda al GIT SHA del deploy;
   - Il tag `environment` sia `production`;
   - NON siano presenti email o IP in chiaro nel payload.
4. Disabilitare la test route:
   ```bash
   sed -i '/SENTRY_TEST_ROUTE_ENABLED/d' .env
   php artisan config:clear
   ```

### Notifica release da CI

Lo script `scripts/deploy-notify-sentry.sh` informa Sentry del nuovo rilascio e associa i commit. Esempio di step in `.github/workflows/deploy.yml`:

```yaml
- name: Notify Sentry
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: spediamofacile
    SENTRY_PROJECT: laravel-backend
    SENTRY_ENVIRONMENT: production
    SENTRY_RELEASE: ${{ github.sha }}
  run: bash laravel-spedizionefacile-main/scripts/deploy-notify-sentry.sh
```

Token Sentry (scope `project:releases`): creare da https://sentry.io/settings/account/api/auth-tokens/.

### PII Sanitization (GDPR)

`config/sentry.php#before_send` maschera automaticamente:

- Campi form: `password`, `password_confirmation`, `token`, `api_key`, `secret`, `stripe_*`, `email`, `phone`, `codice_fiscale`, `partita_iva`, `iban`, `card_number`, `cvv`.
- Header: `Authorization`, `Cookie`, `X-CSRF-TOKEN`.
- Query string: `?token=`, `?password=`, `?api_key=`, `?secret=` sostituiti con `[FILTERED]`.
- User context: NON inviato `email`; solo `id` + `role`.
- Request IP: hashato (sha256 primi 12 char) tramite `SentryContext` middleware.

### Rollback

```bash
composer remove sentry/sentry-laravel
rm config/sentry.php app/Http/Middleware/SentryContext.php
# Rimuovere da bootstrap/app.php:
#  - use di SentryContext
#  - $middleware->append(SentryContext::class)
#  - $exceptions->report(...)
# Rimuovere da app/Providers/AppServiceProvider.php:
#  - Queue::failing(...) block
# Rimuovere da routes/web.php:
#  - Route /_test-sentry
```

## Backup & Restore Postgres (Sprint 7.5)

### Strategia
- **Frequenza**: daily alle 03:00 UTC (`render.yaml` → cron `spedizionefacile-backup`).
- **Storage**: Backblaze B2, bucket `spedizionefacile-backups`, chiave `daily/backup-YYYYMMDD-HHMMSS.sql.gz`. Costo ~$0.006/GB/mese (5x meno di S3).
- **Retention**: 30 giorni (`RETENTION_DAYS` env, modificabile). I file piu' vecchi sono eliminati dal cron stesso.
- **RPO**: 24h (max dati persi = 1 giornata). **RTO**: ~1h (download + restore staging + switch DNS).

### Variabili richieste (Render dashboard)

| Variabile | Dove | Valore |
| --- | --- | --- |
| `B2_APPLICATION_KEY_ID` | Cron `spedizionefacile-backup` | Backblaze → App Keys → Key ID |
| `B2_APPLICATION_KEY` | Cron `spedizionefacile-backup` | Backblaze → App Keys → Application Key |
| `B2_BUCKET` | gia' in render.yaml | `spedizionefacile-backups` |
| `RETENTION_DAYS` | gia' in render.yaml | `30` |

Creazione bucket:
```bash
b2 bucket create spedizionefacile-backups allPrivate
b2 bucket update spedizionefacile-backups --lifecycle-rule \
  '{"daysFromUploadingToHiding":30,"daysFromHidingToDeleting":1,"fileNamePrefix":"daily/"}'
```

### Verifica ultimo backup
```bash
b2 ls b2://spedizionefacile-backups/daily/ | tail -5
# Output atteso: file ordinati per data, il piu' recente < 24h fa.
```

Alert consigliato (Sentry / UptimeRobot): ping HEAD sull'URL dashboard Render cron ogni giorno alle 04:00 UTC. Se lo status del cron "spedizionefacile-backup" non e' "succeeded", triggera alert.

### Test restore su staging
**Non eseguire mai su produzione.** Creare un DB staging (es. Render Postgres free) e puntarci `DATABASE_URL`:

```bash
# 1. Esporta DATABASE_URL del DB staging (NON produzione)
export DATABASE_URL="postgres://user:pass@staging-host:5432/staging_db"
export B2_APPLICATION_KEY_ID="<key_id>"
export B2_APPLICATION_KEY="<key>"

# 2. Scegli un backup recente
b2 ls b2://spedizionefacile-backups/daily/ | tail -1
# → backup-20260417-030000.sql.gz

# 3. Esegui restore
bash laravel-spedizionefacile-main/scripts/restore-from-backup.sh \
  backup-20260417-030000.sql.gz

# 4. Verifica integrita'
psql "$DATABASE_URL" -c "\dt"                                # lista tabelle
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"        # conteggio righe
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM shipments;"
```

Il restore script rifiuta `DATABASE_URL` che contiene `spedizionefacile-db` (nome del DB managed Render) salvo `FORCE_RESTORE=1`.

### Procedura disaster recovery
1. **Incident**: DB produzione corrotto / dati eliminati.
2. **Trigger**: team dichiara incident, valuta se restore (RTO 1h) o rollback applicativo (RTO 5min).
3. **Restore**:
   - Render Dashboard → crea nuovo Postgres "spedizionefacile-db-restored".
   - Export nuovo `DATABASE_URL` → eseguire `restore-from-backup.sh`.
   - Swap connection string nel web service (envVar `DB_HOST` ecc. da `spedizionefacile-db` a `spedizionefacile-db-restored`).
   - Redeploy web + worker → healthcheck verde.
4. **Postmortem**: documentare root cause, data loss window, azioni correttive.

### Rollback del sistema di backup
- Render Dashboard → servizio `spedizionefacile-backup` → **Suspend** (i file gia' su B2 restano).
- Revocare B2 application key → nessun upload possibile.

## Queue & Cache Redis (Sprint 7.6)

### Setup Render managed
- Render Key Value service `spedizionefacile-redis` (piano starter 25MB).
- Worker dedicato `spedizionefacile-queue` (servizio tipo `worker`) esegue `queue:work redis`.
- Web service `ENABLE_QUEUE_WORKER=false` → niente worker colocated (evita contention CPU con php-fpm).

### Flag queue:work (canonici)
```
--tries=3        retry max 3 volte (al 4° fallimento → jobs_failed)
--timeout=60     SIGTERM job dopo 60s
--max-jobs=1000  respawn worker dopo 1000 job (anti memory leak)
--max-time=3600  respawn dopo 1h (pickup nuovi deploy)
--sleep=3        idle 3s tra poll
```

### Test locale
```bash
# Terminale 1: Redis in Docker
docker compose up -d redis

# Terminale 2: worker
cd laravel-spedizionefacile-main
php artisan queue:work redis --tries=3 --timeout=60

# Terminale 3: dispatch job di prova
php artisan tinker
>>> \App\Jobs\ExampleJob::dispatch();
# → nel terminale 2 appare la riga "Processed: App\Jobs\ExampleJob"
```

### Monitoraggio job falliti
```bash
php artisan queue:failed              # lista failed jobs
php artisan queue:retry <uuid|all>    # retry manuale
php artisan queue:flush               # svuota failed_jobs (attenzione)
```

Sentry gia' configurato con `Queue::failing(...)` (vedi `app/Providers/AppServiceProvider.php`) invia automaticamente gli errori di job falliti.

### Fallback se Redis down
Sintomi: `RedisException: Connection refused` in tutti i dispatch.

Mitigazione **temporanea** (ripristina funzionalita' sync, job inline bloccano HTTP):
```bash
# Su Render → servizio web → Environment:
QUEUE_CONNECTION=sync   # invece di redis
CACHE_STORE=database    # invece di redis (usa tabella "cache")
# Redeploy. Risolvere Redis poi rollback a redis.
```

### Rollback del setup Redis
1. Render Dashboard → elimina servizi `spedizionefacile-redis` e `spedizionefacile-queue`.
2. Nel web service: `QUEUE_CONNECTION=sync`, `CACHE_STORE=file`, `SESSION_DRIVER=file`.
3. Redeploy.
