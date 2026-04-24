# infra/caddy — Configurazioni Caddy per ambienti non-dev

Il reverse proxy locale di sviluppo usa il `Caddyfile` nella **root repo**
(default: `http://127.0.0.1:8787` verso frontend+backend). Questa cartella
contiene invece le varianti usate in altri contesti.

## File

### `Caddyfile.example`
Template minimale di riferimento. Copialo come `Caddyfile` in root e personalizza
se hai bisogno di un setup dev diverso da quello di default.

### `Caddyfile.production`
Configurazione per ambiente **produzione** self-hosted (VPS / server dedicato).
Include:
- Redirect HTTPS automatico (Caddy gestisce i certificati Let's Encrypt)
- Security headers (HSTS, X-Frame-Options, CSP base)
- Rate limiting sulle rotte sensibili (`/api/login`, `/api/register`)
- Proxy separato a Nuxt (porta 3000) e Laravel (porta 8000)

Da usare SOLO su server production. Non eseguire in locale.

### `Caddyfile.trycloudflare`
Configurazione per esporre il dev locale via **Cloudflare Tunnel** (`trycloudflare.com`).
Utile per condividere un link online con testers o per webhook di terze parti
(es. Stripe, BRT) che devono raggiungere il backend locale.

Avvio:
```bash
caddy run --config infra/caddy/Caddyfile.trycloudflare
cloudflared tunnel --url http://127.0.0.1:8787
```

## Note

- Il `Caddyfile` di default in root e' **tracked** e caricato automaticamente da
  `caddy run` eseguito dalla root.
- Per deployment su Render.com, NON si usa Caddy (Render gestisce il proxy).
  Le config rilevanti sono in `render.yaml` e `render.staging.yaml`.
