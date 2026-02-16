# Debugging: errori comuni e soluzioni

Questa guida raccoglie gli errori piu' comuni e come risolverli.

---

## Dove guardare i log

### Log backend Laravel

```bash
tail -f laravel-spedizionefacile-main/storage/logs/laravel.log
```

### Log frontend Nuxt

Nella console del browser (F12 > Console) e nel terminale dove gira `npm run dev`.

---

## Errori di autenticazione

### "Unauthenticated" (401)

**Causa**: la sessione e' scaduta o il cookie CSRF non e' valido.

**Soluzioni**:
1. Verifica che `SANCTUM_STATEFUL_DOMAINS` nel `.env` includa il dominio del frontend
2. Verifica che il frontend chiami prima `GET /sanctum/csrf-cookie`
3. Controlla che i cookie non siano bloccati dal browser

```env
SANCTUM_STATEFUL_DOMAINS=127.0.0.1:8787,localhost:8787
```

### "CSRF token mismatch" (419)

**Causa**: il token CSRF e' mancante o scaduto.

**Soluzioni**:
1. Il frontend deve chiamare `GET /sanctum/csrf-cookie` prima del login
2. Verifica che i cookie `XSRF-TOKEN` e `laravel_session` siano presenti (F12 > Application > Cookies)
3. In `nuxt.config.ts`, verifica la configurazione Sanctum

---

## Errori BRT

### "Errore indirizzo BRT: la citta' non corrisponde al CAP"

**Causa**: la combinazione citta'/CAP/provincia non corrisponde al database di routing BRT.

**Soluzioni**:
1. Verifica che i dati siano corretti (es. "Milano" con CAP "20121" e provincia "MI")
2. Il sistema normalizza automaticamente gli indirizzi, ma nomi troppo diversi possono fallire
3. Controlla la tabella `locations` nel database per i CAP corretti
4. Vedi [Errori BRT](../riferimento/ERRORI-BRT.md) per dettagli

### "BRT not configured"

**Causa**: `BRT_CLIENT_ID` non e' configurato nel `.env`.

**Soluzione**: configura le credenziali BRT. Vedi [Configurare BRT](CONFIGURARE-BRT.md).

### "Errore autenticazione BRT"

**Causa**: credenziali BRT errate.

**Soluzione**: verifica `BRT_CLIENT_ID` e `BRT_PASSWORD` nel `.env`.

### L'etichetta non viene generata

**Possibili cause**:
1. BRT non configurato (vedi sopra)
2. L'ordine ha gia' un'etichetta (`brt_parcel_id` non vuoto)
3. Errore nei dati dell'indirizzo
4. Timeout di connessione verso `api.brt.it`

**Come verificare**:
```bash
# Cerca nei log per l'ordine specifico
grep "order #42" laravel-spedizionefacile-main/storage/logs/laravel.log
```

---

## Errori di pagamento

### Il pagamento Stripe fallisce

**Possibili cause**:
1. Chiavi Stripe errate nel `.env`
2. Carta di credito rifiutata
3. Webhook non configurato

**Verifica**:
- Dashboard Stripe > Payments per lo stato del pagamento
- Log Laravel per errori nel `StripeController`

### L'ordine resta in "pending" dopo il pagamento

**Causa**: l'evento `OrderPaid` non viene lanciato.

**Soluzioni**:
1. Verifica che il webhook Stripe sia configurato e riceva le notifiche
2. Controlla che `EventServiceProvider` registri correttamente gli eventi
3. Verifica nei log se il listener `MarkOrderProcessing` viene eseguito

---

## Errori di database

### "SQLSTATE[HY000]: General error: 1 no such table"

**Causa**: le migrazioni non sono state eseguite.

**Soluzione**:
```bash
cd laravel-spedizionefacile-main
php artisan migrate
```

### "SQLSTATE[HY000]: General error: 1 table already exists"

**Causa**: si sta provando a ricreare una tabella esistente.

**Soluzione**: usa `php artisan migrate:status` per controllare lo stato delle migrazioni.

---

## Errori CORS

### "Access to fetch has been blocked by CORS policy"

**Causa**: il frontend sta facendo richieste a un dominio non autorizzato.

**Soluzioni**:
1. Verifica `CORS_ALLOWED_ORIGINS` nel `.env` del backend
2. Assicurati che il dominio del frontend sia incluso
3. Se usi Caddy, il CORS non dovrebbe essere un problema (stesso dominio)

```env
CORS_ALLOWED_ORIGINS=http://127.0.0.1:8787,http://localhost:8787
```

---

## Errori email

### Le email non arrivano

**Soluzioni**:
1. Per sviluppo: usa `MAIL_MAILER=log` e controlla i log
2. Per Resend: verifica l'API key e che il dominio sia verificato
3. Controlla i log per errori di invio

### "Failed to send BRT label email"

**Causa**: errore nell'invio dell'email con l'etichetta dopo il pagamento.

L'ordine e' comunque processato correttamente. L'etichetta e' salvata nel database e puo' essere scaricata manualmente.

---

## Errori frontend

### Schermo bianco / pagina vuota

**Possibili cause**:
1. Errore JavaScript nella console del browser
2. Il backend non e' raggiungibile
3. Le transizioni di pagina sono state abilitate (causano flash bianco)

**Soluzioni**:
1. Apri la console del browser (F12) e cerca errori rossi
2. Verifica che il backend sia avviato su `http://127.0.0.1:8000`
3. Le transizioni sono disabilitate nel `nuxt.config.ts` per questo motivo

### "Failed to fetch" o "Network Error"

**Causa**: il backend non e' raggiungibile.

**Soluzioni**:
1. Verifica che `php artisan serve` sia in esecuzione
2. Verifica `NUXT_PUBLIC_API_BASE` nel `.env` del frontend
3. Se usi Caddy, verifica che sia in esecuzione

---

## Comandi utili per il debug

```bash
# Stato delle migrazioni
php artisan migrate:status

# Pulisci tutte le cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Lista tutte le rotte registrate
php artisan route:list

# Verifica la configurazione email
php artisan tinker
> config('mail')

# Verifica la configurazione BRT
php artisan tinker
> config('services.brt')
```
