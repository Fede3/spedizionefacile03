# Feature archiviate il 2026-04-20

Queste feature sono state rimosse dal progetto attivo per semplificare la codebase.
**NON sono state eliminate**: i file sono qui, pronti per essere rimessi indietro se servono.

## Cosa c'è qui

### `api-pro/`
API pubblica per grandi clienti aziende (Amazon, e-commerce ecc.) + upload CSV in massa + documentazione Swagger.
- **Quando riattivarlo**: quando un cliente azienda ti chiede "avete un'API?" oppure "posso caricare tante spedizioni insieme?"
- **File**: controller Pro backend, pagine `/account/pro/*`, `public/openapi.yaml`, API docs controller

### `pwa-push/`
"Installa il sito come app" sul telefono + notifiche push sul cellulare.
- **Quando riattivarlo**: quando noti che gli utenti tornano settimanalmente e vogliono notifiche veloci invece delle email
- **File**: manifest.json, icone PWA, push subscription controller, VAPID command, plugin

### `scanner-qr/`
Scansione QR code dal cellulare per tracciare un pacco.
- **Quando riattivarlo**: difficile che serva mai. Gli utenti cliccano il link dall'email, non scansionano codici.
- **File**: componente Vue scanner

## Come rimettere indietro una feature

1. Copia i file da questa cartella alle loro posizioni originali (la struttura `backend/` / `frontend/` rispecchia quella del progetto)
2. Registra di nuovo le routes se presenti (vedi i commenti nei file `routes/api/*.php` del progetto attivo)
3. Rimetti i link nelle navigation (vedi `utils/accountNavigation*.ts`)
4. Esegui `php artisan migrate` se ci sono migration archiviate
5. `npm run build` per verificare che tutto compili

## Log rimozioni

- **2026-04-20**: archiviati API Pro + Bulk CSV + Swagger + PWA + Push + Scanner QR
