# Plugins - Leggere Qui

I plugin Nuxt si eseguono all'avvio dell'app, prima che le pagine vengano renderizzate. Il prefisso numerico (`00.`, `01.`) determina l'ordine di esecuzione. Il suffisso `.client.ts` significa "solo nel browser".

## File presenti

| File | Quando gira | Cosa fa |
|------|-------------|---------|
| **00.auth-ui-seed.ts** | SSR + Client | Legge il cookie `auth-ui-snapshot` per sapere subito se l'utente e loggato. Evita il flash "Accedi" → "Ciao Nome" al caricamento. |
| **00.sanctum-dynamic-url.client.ts** | Solo Client | Corregge l'URL base di Sanctum quando si usa un tunnel Cloudflare. In locale non cambia nulla. |
| **01.sanctum-bootstrap.client.ts** | Solo Client | Chiama `init()` di Sanctum per riallineare sessione e CSRF token. Necessario per nuove tab (middle-click) dove il bootstrap normale non parte. |
| **01.user-store-hydrate.client.ts** | Solo Client | Dopo il mount dell'app, chiama `userStore.hydrateFromSession()` per recuperare i dati del preventivo da sessionStorage. |

## Ordine di esecuzione

1. `00.auth-ui-seed.ts` — prepara snapshot auth (SSR-safe)
2. `00.sanctum-dynamic-url.client.ts` — corregge URL API se necessario
3. `01.sanctum-bootstrap.client.ts` — bootstrap autenticazione
4. `01.user-store-hydrate.client.ts` — ripristina stato preventivo dal browser

## Perche il prefisso numerico?

Nuxt esegue i plugin in ordine alfabetico. `00.*` parte prima di `01.*`, garantendo che l'auth sia pronta prima che lo store venga idratato.
