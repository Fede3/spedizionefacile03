# Middleware - Leggere Qui

I middleware sono controlli automatici eseguiti PRIMA di mostrare una pagina. Funzionano come guardiani: se l'utente non ha i permessi, viene reindirizzato altrove.

Si attivano con `definePageMeta({ middleware: ['nome-middleware'] })` nella pagina.

## File presenti

| File | Protegge | Redirect se non autorizzato |
|------|----------|----------------------------|
| **admin.js** | Pagine `/account/amministrazione/*` — solo utenti con ruolo "Admin" | → `/account` |
| **app-auth.ts** | Pagine `/account/*` — richiede login | → `/autenticazione` (con `?redirect=` per tornare dopo il login) |
| **shipment-validation.js** | Flusso spedizione (`/la-tua-spedizione`, `/riepilogo`, `/checkout`) — impedisce di saltare step | → step corretto |
| **email-verification.js** | Pagina `/verifica-email` — richiede parametri dal link email | → homepage |
| **update-password.js** | Pagina reset password — richiede token nell'URL | → homepage |

## Come funzionano lato SSR

`admin.js` e `app-auth.ts` controllano i cookie di sessione Laravel (`laravel_session`, `XSRF-TOKEN`) durante il rendering server. Se mancano, redirect immediato senza chiamare API.

## Ordine tipico

Per le pagine admin si combinano: `middleware: ['app-auth', 'admin']` — prima verifica login, poi verifica ruolo.
