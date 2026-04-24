# Tawk.to — Guida di riattivazione

Archivio creato il **2026-04-20** (Ondata 1, agente O1-A3).
Motivo: semplificazione frontend. La live chat viene sostituita dal canale
email `supporto@spediamofacile.it` (+ `mailto:info@spediamofacile.it` già
presente nella pagina `/contatti` e nel footer).

---

## 1. Cos'era Tawk.to

[Tawk.to](https://www.tawk.to/) è un widget di live chat gratuito. L'integrazione
era client-only, no-op in locale (senza env var) e disattivato nelle rotte
`/account/amministrazione/**` (backoffice).

### URL dello script
```
https://embed.tawk.to/<NUXT_PUBLIC_TAWKTO_ID>/<NUXT_PUBLIC_TAWKTO_WIDGET_ID>
```

- `NUXT_PUBLIC_TAWKTO_ID` = property_id Tawk.to (es. `65f0abcd...`)
- `NUXT_PUBLIC_TAWKTO_WIDGET_ID` = widget_id (default: `default`)

### Dove era montato
- **Plugin**: `plugins/tawkto.client.ts` (client-only, auto-loaded da Nuxt)
- **Posizione widget**: bubble fissa in basso a destra (controllata lato dashboard Tawk.to)
- **Pagine**: tutte tranne `/account/amministrazione/**`
- **Visibility switching**: `Tawk_API.hideWidget()` / `showWidget()` su cambio rotta

---

## 2. Come riattivare

### Step 1 — Ripristinare il plugin
Copia il file dall'archivio al progetto:
```bash
cp _archive/frontend-simplification-2026-04-20/npm-packages/tawk-to/tawkto.client.ts.original \
   nuxt-spedizionefacile-master/plugins/tawkto.client.ts
```

### Step 2 — Ripristinare il runtimeConfig in `nuxt.config.ts`
Cerca il blocco:
```ts
// -- ARCHIVIATO 2026-04-20: Tawk.to live chat ...
// tawktoId: process.env.NUXT_PUBLIC_TAWKTO_ID || '',
// tawktoWidgetId: process.env.NUXT_PUBLIC_TAWKTO_WIDGET_ID || 'default',
// -- END ARCHIVIATO --
```
Scommentare le due righe e rimuovere i marker.

### Step 3 — Ripristinare le CSP in `nuxt.config.ts`
Ri-aggiungere nei rispettivi array in `security.headers.contentSecurityPolicy`:

- `script-src` (sia rama `production` sia `development`):
  aggiungere `'https://embed.tawk.to'` e `'https://*.tawk.to'` alla fine dell'array.

- `connect-src` (sia rama `production` sia `development`):
  aggiungere `'https://*.tawk.to'` e `'wss://*.tawk.to'` alla fine dell'array.

Vedi `nuxt.config-tawk-entries.md` in questa cartella per il diff esatto.

### Step 4 — Ripristinare le env vars in `.env.example`
Cerca il blocco commentato `# ── Tawk.to live chat ──` in
`nuxt-spedizionefacile-master/.env.example` e scommentare le due righe:
```bash
NUXT_PUBLIC_TAWKTO_ID=
NUXT_PUBLIC_TAWKTO_WIDGET_ID=default
```

### Step 5 — Configurare l'env di produzione
Nel `.env` di produzione (o nei secrets Coolify/Cloudflare) impostare:
```bash
NUXT_PUBLIC_TAWKTO_ID=<property_id_reale>
NUXT_PUBLIC_TAWKTO_WIDGET_ID=default
```

### Step 6 — Branding
Colore bubble/button e posizione: da dashboard Tawk.to →
**Administration → Widget Appearance**. Il plugin NON supporta override runtime.

### Step 7 — Test
- `npm run build` deve essere verde
- Homepage in produzione → bubble visibile in basso a destra
- `/account/amministrazione/dashboard` → bubble NASCOSTA
- Tornando fuori dall'admin → bubble riappare

---

## 3. Alternative considerate (2026-04-20)

- **Email-only**: `mailto:supporto@spediamofacile.it` — **scelta attuale**.
  Pro: zero script third-party, zero CSP, zero privacy banner, zero rumore dev.
  Contro: nessuna chat sincrona (ma `/contatti` ha form + turnstile).

- **Crisp, Intercom, Zendesk**: valutate in passato, escluse per costo/complessità.

- **Chat custom su Sanctum**: fuori scope — richiederebbe backend dedicato.

---

## 4. Contatti oggi attivi nel sito

Dopo la rimozione del widget, gli utenti trovano contatto su:

| Canale | Dove |
|---|---|
| `info@spediamofacile.it` | Footer, `/contatti` (hero pill + strip) |
| `supporto@spediamofacile.it` | FAQ (`pages/faq.vue`), `termini-e-condizioni` |
| `assistenza@spediamofacile.it` | `/reclami`, `/account/assistenza` |
| `+39 02 8295 4130` | Footer, `/contatti` |
| Form contatto | `/contatti` (POST `/api/contact` + Turnstile) |

Nessun utente resta senza un canale di contatto visibile.
