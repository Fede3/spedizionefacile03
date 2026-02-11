# TuttoInsieme Monorepo

Questo repository contiene:

- **Backend Laravel** in `laravel-spedizionefacile-main`
- **Frontend Nuxt** in `nuxt-spedizionefacile-master`

## Avvio con GitHub Codespaces (solo UI, senza terminale)

1. **Crea un Codespace**  
   - Vai su GitHub → *Code* → *Codespaces* → *Create codespace on main*.

2. **Attendi la configurazione automatica**  
   - Lo script `scripts/avvia-tutto.sh` installa le dipendenze mancanti e avvia Laravel (8000) e Nuxt (3000).

3. **Apri il sito**  
   - Apri il link della porta **3000** dalla scheda *Ports* del Codespace.

### Se vedi errore 502 sulla porta 3000

- Aspetta 20-40 secondi e ricarica la pagina: Nuxt può impiegare qualche secondo al primo avvio.
- Se resta 502, dal Codespace usa **Command Palette → Codespaces: Rebuild Container** e riapri la porta **3000**.
- Il backend API deve rispondere sulla porta **8000**; se 8000 è su e 3000 no, il problema è solo nel processo Nuxt e il rebuild lo riallinea.

4. **Backend collegato automaticamente**  
   - `NUXT_PUBLIC_API_BASE` viene costruita usando `CODESPACE_NAME` e `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN`, così il frontend usa l’URL pubblico della porta 8000.

## API Portafoglio (backend)

Il backend espone gli endpoint seguenti (base URL = `NUXT_PUBLIC_API_BASE`):

- `GET /api/wallet/balance` → saldo calcolato dai movimenti confermati.
- `GET /api/wallet/movements` → lista movimenti.
- `POST /api/wallet/top-up` → ricarica (idempotente).
- `POST /api/wallet/payment` → pagamento (idempotente, crea movimento in stato `pending`).
- `POST /api/wallet/payment-confirmation` → conferma pagamento tramite riferimento.

La logica è idempotente: lo stesso `idempotency_key` non crea movimenti duplicati e il saldo deriva sempre dai movimenti confermati.

## Soluzione definitiva con Cloudflare Tunnel (gratis)

Se Codespaces termina i minuti o non vuoi usare Netlify/Render, puoi pubblicare **frontend e backend** con Cloudflare Tunnel.

### Cosa fa questa soluzione

- Usa `scripts/avvia-cloudflare.ps1` (Windows PowerShell) per avviare Laravel (8000) e Nuxt (3000).
- Crea due URL pubblici `trycloudflare.com`:
  - uno per il backend API
  - uno per il frontend sito
- Imposta automaticamente `NUXT_PUBLIC_API_BASE` sul tunnel backend, così registrazione/login/form e chiamate API puntano all’URL giusto.

### Passi rapidi (Codespaces)

1. Apri Codespace sul branch aggiornato.
2. Esegui script unico:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\avvia-cloudflare.ps1`
3. Copia il link mostrato come **Frontend pubblico** e aprilo.

### Note importanti

- Gli URL `trycloudflare.com` sono comodi e gratuiti, ma possono cambiare al riavvio.
- Se vuoi URL stabili “per sempre”, crea un tunnel Cloudflare dal dashboard Zero Trust e associa due hostname (es. `app.tuodominio.it` e `api.tuodominio.it`) verso le porte 3000/8000.
- Non inserire mai token o credenziali nel repository: usa variabili ambiente nel provider/ambiente di esecuzione.


### Diagnostica automatica (quando non si connette)

Se usi Cloudflare Tunnel, `http://127.0.0.1:8787` può essere la porta metrics di `cloudflared`; se invece usi Caddy locale, `8787` è il sito principale.

Esegui questo comando unico per raccogliere tutto lo stato in automatico:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\raccogli-stato.ps1
```

Il comando crea `tmp-diagnostica/report.txt`: incolla quel file e possiamo capire subito dove si blocca (frontend, backend o tunnel) senza altri passaggi manuali.


## Avvio locale consigliato (Caddy su 8787)

Se stai già vedendo il sito su `http://127.0.0.1:8787`, questa è la modalità corretta: origine unica per frontend + API.

1. Avvio automatico completo:

```bash
powershell -ExecutionPolicy Bypass -File .\scripts\avvia-locale.ps1
```

2. Apri il sito:

- `http://127.0.0.1:8787`

Lo script avvia Nuxt (3000), Laravel (8000) e Caddy (8787) se disponibile.

### Bundle automatico di supporto (Windows)

Per condividere tutto in un colpo solo (config + log + check HTTP), esegui in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\support-bundle.ps1
```

Output atteso: `OK: creato ...support_bundle_*.zip`

> Nota sicurezza: il bundle copia solo file di configurazione di esempio (`.env.example`), non i tuoi `.env` reali.
