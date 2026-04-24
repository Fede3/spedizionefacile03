# Beta Gate — Istruzioni di Riattivazione

**Archiviato**: 2026-04-20 (Ondata 1 O1-A5 frontend simplification)
**Motivo**: lancio pubblico completato, il gate beta non è più necessario.

## Cosa faceva

Limitava l'accesso al sito a una whitelist di email durante il soft-launch.
Utenti fuori whitelist venivano reindirizzati a `/beta-invite` per registrarsi.

## File archiviati (struttura originale preservata)

- `pages/beta-invite.vue` — landing per la richiesta invito beta
- `middleware/beta-gate.ts` — middleware route-level che blocca utenti non whitelistati
- `composables/useBetaAccess.ts` — logica whitelist + feature flag

## Come riattivare

1. **Ripristinare i file** dalle rispettive path originali:
   ```bash
   cp _archive/frontend-simplification-2026-04-20/features/beta-gate/pages/beta-invite.vue nuxt-spedizionefacile-master/pages/beta-invite.vue
   cp _archive/frontend-simplification-2026-04-20/features/beta-gate/middleware/beta-gate.ts nuxt-spedizionefacile-master/middleware/beta-gate.ts
   cp _archive/frontend-simplification-2026-04-20/features/beta-gate/composables/useBetaAccess.ts nuxt-spedizionefacile-master/composables/useBetaAccess.ts
   ```

2. **Ripristinare config `nuxt.config.ts`** (`runtimeConfig.public`):
   ```ts
   // Beta gate soft-launch. 'true' = solo email in betaEmails.
   betaMode: process.env.NUXT_PUBLIC_BETA_MODE ?? 'false',
   betaEmails: process.env.NUXT_PUBLIC_BETA_EMAILS ?? '',
   ```

3. **Riaggiungere `/beta-invite` a `sitemap.exclude`** in `nuxt.config.ts`:
   ```ts
   sitemap: { exclude: [ /* ... */ '/beta-invite', /* ... */ ] }
   ```

4. **(Opzionale) Re-registrare il middleware globale** in `nuxt.config.ts -> router.middleware`
   quando la build è per produzione beta. Vedi commento in testa a `beta-gate.ts`.

5. **Env vars da impostare** in `.env` (produzione):
   ```
   NUXT_PUBLIC_BETA_MODE=true
   NUXT_PUBLIC_BETA_EMAILS=email1@example.com,email2@example.com
   ```

6. Lasciato intatto `public/robots.txt -> Disallow: /beta-invite` (no-op se la pagina non esiste,
   innocuo se viene ripristinata).

## Backend dependencies

Nessuna. Il gate è 100% frontend: Sanctum user email vs CSV whitelisted.

## Note

- Il form di registrazione invito era uno **stub**: la submit era un `console.log` + setTimeout.
  Va collegato a un endpoint backend reale prima della riattivazione in produzione.
