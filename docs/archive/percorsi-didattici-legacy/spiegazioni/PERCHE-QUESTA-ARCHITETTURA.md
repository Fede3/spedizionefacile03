# Perche' questa architettura

Spiega le motivazioni dietro la scelta di Laravel + Nuxt come architettura del progetto.

---

## La scelta: due applicazioni separate

SpediamoFacile e' composto da due applicazioni:

- **Backend**: Laravel (PHP) - gestisce la logica, il database, le API esterne
- **Frontend**: Nuxt (Vue.js) - gestisce l'interfaccia utente nel browser

Comunicano tramite API REST (richieste HTTP con dati JSON).

---

## Perche' Laravel per il backend

### Ecosistema completo

Laravel offre tutto quello che serve per un'applicazione e-commerce di spedizioni:

- **Eloquent ORM** - Gestione semplice del database (modelli, relazioni, migrazioni)
- **Sanctum** - Autenticazione basata su sessioni, perfetta per SPA
- **Events/Listeners** - Sistema ad eventi per disaccoppiare la logica (pagamento → etichetta BRT)
- **HTTP Client** - Chiamate a servizi esterni (BRT, Stripe) con retry e timeout
- **Artisan** - Comandi CLI per migrazioni, cache, debug

### Velocita' di sviluppo

Laravel permette di creare rapidamente API REST con validazione, autorizzazione e formattazione dei dati.
Un controller con 5 metodi CRUD si scrive in poche righe.

### Comunita' e documentazione

Laravel e' il framework PHP piu' usato al mondo. Trovare soluzioni ai problemi e' facile.

---

## Perche' Nuxt per il frontend

### Rendering lato server (SSR)

Nuxt puo' renderizzare le pagine sul server prima di inviarle al browser.
Questo migliora:

- **SEO** - Google vede pagine complete con contenuto
- **Performance** - La prima pagina si carica piu' velocemente
- **Social sharing** - I metadati OpenGraph sono disponibili subito

### Routing automatico

Nuxt genera le rotte automaticamente dalla struttura delle cartelle.
Non serve configurare un router manualmente: `pages/chi-siamo.vue` diventa `/chi-siamo`.

### Nuxt UI

La libreria di componenti Nuxt UI fornisce pulsanti, form, modali, toast e altri componenti pronti all'uso.
Riduce enormemente il tempo di sviluppo dell'interfaccia.

### Composable

I composable (come `useCart.js` e `useSession.js`) permettono di riutilizzare la logica tra pagine diverse senza duplicazione di codice.

---

## Perche' non un monolite Laravel+Blade

Un'architettura monolitica (Laravel con template Blade) sarebbe piu' semplice ma:

- **Interattivita' limitata** - Le pagine si ricaricano ad ogni azione
- **UX inferiore** - L'esperienza utente non e' fluida come una SPA
- **Difficile da scalare** - Frontend e backend sono accoppiati

Con Nuxt come SPA (Single Page Application):

- La navigazione e' istantanea (senza ricaricamento pagina)
- L'interfaccia e' piu' reattiva (carrello, form multi-step)
- Frontend e backend possono essere sviluppati e deployati indipendentemente

---

## Perche' Caddy come reverse proxy

Caddy risolve un problema fondamentale: le due applicazioni girano su porte diverse (3001 e 8000), ma i cookie di autenticazione funzionano solo sullo stesso dominio.

Caddy:
- Unifica tutto sulla porta 8787
- Instrada `/api/*` al backend e il resto al frontend
- Gestisce automaticamente HTTPS in produzione
- Configurazione minima (poche righe nel Caddyfile)

---

## Perche' SQLite

SQLite e' stato scelto per semplicita':

- **Nessun server separato** - Il database e' un singolo file
- **Zero configurazione** - Funziona subito, senza installare MySQL o PostgreSQL
- **Facile da trasportare** - Basta copiare il file per avere un backup completo
- **Sufficiente per il carico** - Per il volume di traffico previsto, SQLite e' piu' che adeguato

Se il volume cresce significativamente, la migrazione a MySQL/PostgreSQL e' semplice perche' Laravel astrae il database tramite Eloquent.

---

## Perche' Sanctum per l'autenticazione

Laravel Sanctum e' stato scelto perche':

- **Sessioni basate su cookie** - Piu' sicure dei JWT per le SPA
- **CSRF protection** - Protezione automatica contro attacchi cross-site
- **Semplice** - Nessun token da gestire manualmente nel frontend
- **Integrazione nativa** - Funziona perfettamente con Laravel e con `nuxt-auth-sanctum`

Il modulo `nuxt-auth-sanctum` gestisce automaticamente:
- Il cookie CSRF
- Il login/logout
- Il recupero dei dati utente
- Il redirect alle pagine protette
