# AUDIT PROFONDO — SpediamoFacile

**Data**: 25 aprile 2026
**Tipo**: code review oggettiva, prima visione esterna
**Metodo**: lettura del codice reale, non solo metriche

> Questo documento è una valutazione onesta della repo come la farebbe una agency esterna chiamata a fare due diligence. Niente sconti, niente cattiverie gratuite, solo dati e interpretazione.

---

## 1. Contesto: che tipo di sito è davvero

SpediamoFacile è **tre prodotti in uno**:

| Prodotto interno | Cosa fa | Complessità intrinseca |
|---|---|---|
| **E-commerce/checkout** | Carrello, Stripe (3DS), bonifico, wallet, coupon, fatturazione | 🟠 Media-alta (soldi, idempotenza) |
| **Funnel di configurazione** | Preventivo → servizi → indirizzi → pagamento (5 step) | 🟠 Media-alta (state machine, validation cross-step) |
| **Pannello admin** | Ordini, utenti, prezzi, servizi, bonifici, impostazioni | 🟡 Media (CRUD complesso) |
| **Integrazione corriere** | BRT REST: PUDO, etichette, tracking, webhook | 🔴 Alta (sistema esterno, idempotenza, retry) |
| **Account utente** | Indirizzi, ordini, fatture, wallet, referral, carte salvate | 🟡 Media (CRUD) |

**Verdetto contesto**: il dominio è oggettivamente **mid-complex**. Non è un blog (semplice), non è un ERP (estremo). È un **e-commerce verticale con integrazione corriere**. La complessità di base che NESSUNA agency potrebbe ridurre è circa il 60-70% di quello che si vede oggi.

---

## 2. Cosa serve DAVVERO per un sito di questo tipo

### Benchmark esterno (cosa farebbe una agency mid-tier 5-8 dev su un brief identico):

```
TARGET MANUALE
├── Frontend (Nuxt + Pinia)
│   ├── Pages: 30-40
│   ├── Components: 80-120 (max 300 righe)
│   ├── Stores Pinia: 6-10 (cart, auth, user, funnel, admin, wallet, ui)
│   ├── Composables: 10-15 (hook puri max 200 righe)
│   ├── CSS files: 1-3 (tokens + globals via Tailwind)
│   └── TOTALE: ~22.000 righe in TypeScript

├── Backend (Laravel + DDD)
│   ├── Controllers thin: 35-45 (max 200 righe)
│   ├── Services per dominio: 20-30 (Brt/, Pricing/, Invoice/, Cart/)
│   ├── Action classes: 20-25 (use case singoli)
│   ├── Form Requests: 30-40 (uno per endpoint scrivente)
│   ├── API Resources: 20-25 (uno per Model esposto)
│   ├── Policies: 10-15 (uno per Model owned)
│   ├── Jobs: 8-12 (Mail, PDF, BRT sync, dashboard)
│   ├── Events/Listeners: 10-15
│   └── TOTALE: ~20.000 righe

├── Test
│   ├── Feature: 60-80
│   ├── Unit: 30-50
│   ├── E2E: 20-30
│   └── TOTALE: ~90-120 file

└── Doc
    ├── README.md (overview)
    ├── ARCHITECTURE.md (mappa)
    ├── ONBOARDING.md (junior in 1 settimana)
    ├── CONTRIBUTING.md (regole)
    ├── DEPLOY.md (pipeline)
    ├── adr/ (3-5 decisioni)
    └── TOTALE: ~10 file vivi
```

**Totale stimato manuale**: ~42.000 righe di codice, ~10 file di doc.

---

## 3. Cosa c'è davvero in questa repo (misurato, non stimato)

```
ATTUALE
├── Frontend (~33.000 righe)
│   ├── Pages: 50 (~+25%)
│   ├── Components: 165 (~+40%)
│   ├── Stores Pinia: 1 (-90%)         ← problema strutturale
│   ├── Composables: 30+ giganti       ← problema strutturale
│   ├── CSS files: 66 (+560%)          ← problema strutturale
│   ├── TS coverage: 26% (60 TS / 174 JS)  ← problema strutturale
│   └── 12 file >500 righe (max 1426)

├── Backend (~30.000 righe)
│   ├── Controllers: 59 (+30%)
│   ├── Services: 42 (+50%, ma DDD ben fatto)
│   ├── Actions: 5 (-75%)              ← sottoutilizzato
│   ├── Form Requests: 10 (-66%)       ← sottoutilizzato
│   ├── API Resources: 8 (-65%)        ← sottoutilizzato
│   ├── Policies: 2 (-85%)             ← rischio sicurezza
│   ├── Jobs: 2 (-80%)                 ← operazioni sincrone
│   ├── Events/Listeners: 14 ✓
│   └── 4 file >500 righe (max 785)

├── Test (~102 file, struttura textbook)
│   ├── Feature/{Auth,Cart,Orders,Payments,Pricing,Security,...}
│   ├── Feature/Characterization (golden master, raro!)
│   ├── Unit/{Models,Services,Resources,Brt}
│   └── Frontend e2e + unit ✓

└── Doc (~120 file .md)
    ├── 4 ADR ✓
    ├── 90 in archive/ (storico, ipertrofico)
    └── 26 vivi (struttura ok ma sopra il necessario)
```

**Totale attuale**: ~63.000 righe di codice, 120 file di doc.

**Differenza rispetto al manuale**:
- **+50% codice** (~21.000 righe in più)
- **+1100% doc** (~110 file in più)

---

## 4. ⚠️ Discrepanze gravi documentazione vs codice reale

Aprendo `README.md` e `docs/ARCHITECTURE.md` ho trovato **divergenze concrete** dal codice. Per un junior questo è il problema #1: legge la doc, le aspettative tradiscono.

| Affermazione doc | Realtà nel codice | Impatto junior |
|---|---|---|
| `README.md`: "Nuxt **3** + Vue 3" | `package.json`: Nuxt **4.1.3** | Comandi, sintassi, plugin diversi |
| `README.md`: "Laravel **12**" | `ARCHITECTURE.md`: "Laravel **11**" | Quale segue? |
| `ARCHITECTURE.md`: "Sentry browser SDK" + "sentry-php" | `package.json` + `composer.json`: **Sentry NON presente** | Junior cerca un setup che non esiste |
| `ARCHITECTURE.md`: "Plausible analytics, web-vitals" | Non rilevato in codice | Idem |
| `ARCHITECTURE.md`: "Pinia store `userStore` singleton" | Esiste `shipmentFlowStore`, **non** `userStore` | Junior cerca file che non c'è |
| `ARCHITECTURE.md`: routing `/admin/orders/[id]` | Reale: `/account/amministrazione/ordini` | Path completamente diverso |
| `README.md`: "Nuxt 3" struttura repo | Realtà: stack moderno Nuxt 4 + Tailwind 4 + Pinia 3 | Disallineato |

**Verdetto discrepanze**: la doc è stata scritta **una volta**, il codice è andato avanti, **nessuno ha aggiornato**. È peggio di non avere doc — la doc obsoleta confonde più del silenzio.

---

## 5. Analisi per layer

### 5.1 Backend Laravel — VOTO: 8.0/10

**Punti forti**:
- Namespace per dominio: `Services/Brt/`, `Services/Pricing/`, `Services/Invoice/`, `Services/Security/` → DDD pragmatico
- Routes splittate per dominio: `routes/api/{admin,auth,cart,orders,payments,public,shipment,...}.php` → eccellente
- `StripeCheckoutController.markOrderCompleted()` usa `DB::transaction(lockForUpdate)` + idempotency key → pattern enterprise
- Test in cartelle Feature/Unit con golden-master `tests/Feature/Characterization/`
- 25/26 model con `$fillable` esplicito (no mass assignment)
- ADR 001-002-003 documentano le scelte critiche (Sanctum, MoneyPhp, BRT diretto)
- Migration `encrypt_existing_stripe_account_ids`, `EmailEnumerationSecurityTest` → security curata in modo proattivo

**Debolezze**:
- **2 Policy per 26 Model** → autorizzazione sparsa nei controller. Audit di sicurezza richiede di leggere tutti i 59 controller invece di 15 Policy. Rischio: junior aggiunge endpoint e dimentica check ownership.
- **2 Job in queue** mentre ci sono `InvoicePdfService` (422 righe), `BrtBordereauGenerator` (773 righe), `OrderAwaitingBankTransferMail` (sync?) → operazioni potenzialmente blocking. Una richiesta che genera PDF + chiama BRT può prendere 3-5 secondi.
- **10 Form Request per 59 controller** → la maggior parte fa `$request->validate(...)` inline. Funziona ma:
  - non è testabile in isolamento
  - non riusabile tra create/update
  - `authorize()` sarebbe il posto naturale per spostare i check di Policy
- **5 Action classes** sono pochi. Il pattern Action (use-case singolo, invokeable) è il più clean per Laravel moderno e qui è sotto-utilizzato.
- **BRT tracking over-segmented**: 4 service `OrderBrtTracking{Lookup,Read,Lifecycle,Fulfillment}Service.php` — Lookup e Read fanno la stessa cosa (leggere tracking), Lifecycle e Fulfillment sono azioni opposte sullo stesso ciclo. Consolidabili in 2 service.

**Conclusione BE**: codice **professionale di un senior Laravel**. Le debolezze sono di "ricoperture mancanti" (policies, jobs, form requests), non di disegno errato.

### 5.2 Frontend Nuxt — VOTO: 5.5/10

**Punti forti**:
- Stack all'avanguardia: Nuxt 4.1.3, Tailwind 4, Pinia 3, Nuxt UI 4, Vitest 4
- `features/shipment-flow/` con 7 file ben separati (flow/validation/submit/persistence/pageState/presentation/cartEdit) → **questo è DDD frontend ben fatto**
- `nuxt-security` + `nuxt-auth-sanctum` + `@nuxtjs/turnstile` → CSP, auth cookie, bot protection già configurati
- Test E2E con Playwright + visual regression (`tests/e2e/visual-regression.spec.ts-snapshots/`)

**Debolezze strutturali**:

#### A) God-composables (12 file >500 righe)

```
1426  composables/useAdminPrezzi.js
1326  composables/usePreventivo.js
 912  composables/usePudo.js
 820  composables/useCart.js (esporta TRE composable diversi, alias retro-compat)
 754  composables/useShipmentStepServices.js
 743  composables/useLocation.js
 718  composables/usePayment.js
 714  composables/useFunnel.js
 700  composables/useAuth.js
 639  composables/useShipmentForm.js
 621  composables/useAddressBook.js
 564  composables/useAdminPages.js
```

**Diagnosi**: il dev ha usato i **composables come store**. Pinia è in deps con UN solo store (`shipmentFlowStore`). Questo significa:
- Niente DevTools per ispezionare lo stato → debug più lento
- Niente HMR granulare → un cambio piccolo ricarica tutto
- Niente test unit del solo store → testare richiede setup Vue
- Stato sparso in più composable senza source of truth → bug "qual è la verità?"

**Causa probabile**: un solo dev che è cresciuto con la code-base. Quando il file `useCart.js` è arrivato a 400 righe non si è fermato a fare il refactor in store. È andato avanti fino a 820. Capita ai team di una persona.

#### B) TypeScript fantasma (26% adoption)

```
60 file TS  vs  174 file JS
```

`package.json` ha `vue-tsc`, script `typecheck`, `types/index.ts`. Nei composables critici (cart, auth, payment) tutto è JavaScript con JSDoc. Risultato: **paghi il typecheck CI senza ottenere autocompletion sui composables veri**. Il `shipmentFlowStore.js` ha JSDoc impeccabile, ma non è la stessa cosa che TS.

**Decisione binaria mancante**: o tutto TS, o togli `vue-tsc` dal CI per onestà.

#### C) 66 CSS file vs Tailwind 4 + Nuxt UI 4

Hai BOTH installati ma i CSS sono BEM-like custom (`sf-*.css`). Esempi misurati:
- `assets/css/components/sf-admin-user-table.css` (7.4 KB)
- `assets/css/components/sf-admin-order-table.css` (6.9 KB)
- → **pattern identico** (empty state + mobile cards + desktop grid). 670 LOC che diventano 1 file.
- `sf-segment.css` (8.6 KB) usato in 6 pagine → giusto consolidare, ma ora caricato globalmente non lazy
- `sf-service-card.css` (19 KB) richiamato da 7 component-type → potenziale grandi guadagni con `@apply` Tailwind

**Causa probabile**: il dev voleva "design originale" (legittimo, è un feedback dell'utente in `CLAUDE.md`), ha rifatto BEM custom invece di usare Tailwind utility-first. Risultato: lavoro doppio.

#### D) Encoding rotto (mojibake)

I file `.js` hanno commenti italiani con caratteri rotti:
```js
// composables/useCart.js riga 3
//   - useCart()           â†’ checkout (ShipmentStepPagamento + useCheckout)
```

`â†’` è il rendering UTF-8 di una freccia `→` salvata come Windows-1252. **Sintomo di editor/encoding diverso tra dev**. Fix banale (script di normalizzazione UTF-8) ma sfregia l'estetica.

### 5.3 Documentazione — VOTO: 6.0/10

**Punti forti**:
- 4 ADR (Architecture Decision Records) — raro in progetti italiani, eccellente
- `CLAUDE.md` con convenzioni esplicite (cents, palette no-blue, CSS architecture rule, naming) — sopra la media
- `QUICKSTART.md`, `ONBOARDING.md`, `ARCHITECTURE.md` esistono
- ASCII flow diagrams in `ARCHITECTURE.md`

**Punti deboli**:
- **120 file `.md`** di cui 90 in `docs/archive/` (analisi-legacy/, checkpoints-2026-04/, CODEX/, percorsi-didattici-legacy/, root-history/, TEAM_LOG/)
- **3 discrepanze gravi** (sezione 4) tra README, ARCHITECTURE e codice reale
- Doc usata come "diario di lavoro" non come "manuale del prodotto"

### 5.4 Infrastruttura — VOTO: 6.5/10

**Punti forti**:
- Render.com (web + worker + cron + Redis + Postgres) → setup serio
- Caddy reverse proxy → HTTPS automatico
- Husky + commitlint + lint-staged + Conventional Commits → quality gate cross-progetto
- Pre-commit hooks attivi
- `.gitignore` curato (verificato: `_LOG/`, `.env`, vendor, node_modules, _archive locale tutti esclusi)

**Punti deboli**:
- Configurazione spalmata: `render.yaml` + `render.staging.yaml` + `Caddyfile` + `infra/` + `laravel-*/docker/` → 4 posti per capire come si deploya
- `nuxt.config.ts` + 7 `.env*` files (`.env`, `.env.example`, `.env.production`, `.env.production.example`, ecc.) → confusione su quale è source of truth

### 5.5 Test — VOTO: 8.0/10

**Punti forti**:
- 102 test totali in struttura textbook
- `tests/Feature/Characterization/` con golden master → indica team che sa cosa fa
- Sicurezza testata: `EmailEnumerationSecurityTest`, `OAuthStateSecurityTest`
- Frontend con visual regression Playwright

**Punti deboli**:
- Solo 2 test in `tests/Unit/Services/Brt/` mentre BRT ha 4+ service complessi (oltre 1500 righe non coperte da unit test)
- Frontend `tests/unit/composables/` esiste ma con 30+ composables giganti pochi test = bassa coverage reale

---

## 6. Le VERE cause della "grandezza" — diagnosi

La repo è grande del 50% rispetto al manuale **non perché il dominio è complesso** (è mid-complex giusto), ma per **5 cause architetturali identificate**:

| # | Causa | Quanto codice extra produce | Effort fix |
|---|---|---|---|
| 1 | **Pinia sotto-utilizzato** → composables giganti che fanno store | ~5.000 righe | Alto |
| 2 | **CSS BEM custom** invece di Tailwind utility | ~5.000 righe CSS | Medio |
| 3 | **Doc ipertrofica** + archive | ~110 file doc | Basso |
| 4 | **Mezzo TS / mezzo JS** + JSDoc parallelo | ~2.000 righe | Medio |
| 5 | **Boilerplate non-DRY** (admin pages duplicano table+filter+sort) | ~3.000 righe | Medio |
| | **TOTALE eliminabile senza perdere features** | **~15.000 righe + 110 doc** | |

**Conclusione**: il 24% del codice è **complessità accidentale eliminabile**.

---

## 7. Junior friendliness — analisi onesta

### Onboarding stimato (con la repo COSÌ COM'È):

| Profilo | Tempo prima di committare in autonomia | Fattori limitanti |
|---|---|---|
| Junior 0-2 anni | **3-4 settimane** | God-composables 1000+ righe, doc obsoleta, 5 file infra, mezzo TS |
| Mid 2-5 anni | **1 settimana** | Mappa mentale dei composables impegnativa |
| Senior 5+ anni | **3-4 giorni** | Nessuna friction, riconosce i pattern |

### Scenari reali di task junior:

**Scenario 1**: *"aggiungi campo `note_corriere` all'ordine"*
- File da modificare: **12** (model, migration, request, controller, service, resource, composable, store, page, component, test, ...)
- Tempo junior: **2-3 giorni**
- Tempo manuale: 1 giorno con 7 file

**Scenario 2**: *"sposta il bottone CTA del preventivo a destra in mobile"*
- File da modificare: 1 CSS + magari 1 vue
- Difficoltà: **🟢 Bassa** (questo è OK, qui la repo regge)

**Scenario 3**: *"fixami il bug di prezzi sbagliati nel checkout wallet+coupon"*
- File da capire prima di toccare: `useCart.js` (820 righe), `useCheckoutBilling.js`, `useCheckoutOrderContext.js`, `usePayment.js` (718), `WalletOrderLinkService`, `WalletOrderPaymentService`, `CartService`, `StripeCheckoutController`, `useCartPromoPreview.js`, `useCheckoutPromoPreview.js` → **10 file**
- Tempo junior: **1 settimana solo per capire**, poi 2-3 giorni per fixare
- Tempo manuale: 2-3 giorni totali

**Scenario 4**: *"aggiungi una nuova pagina admin 'spedizioni recenti'"*
- File da copia-incolla: `ordini.vue` (512 righe) → modifica → nuovo file
- Junior copia 512 righe e adatta. Mid si chiede "perché non c'è un `useAdminTable()` composable base?".
- Difficoltà: **🟠 Media** (manca il composable base, duplichi pattern)

### Verdetto junior: **3.4/5** dove dovrebbe essere **2/5**.

Non impossibile, ma frustrante e lento. Un junior **resta**, ma il primo mese impreca.

---

## 8. Cosa è "manuale" e cosa è "fai-da-te"

| Elemento | Manuale? | Note |
|---|---|---|
| Stack scelto (Nuxt 4 + Laravel 12 + Stripe + BRT) | ✅ Manuale | Scelte mainstream |
| Money in cents + MoneyPhp | ✅ Manuale | Best practice e-commerce |
| Sanctum SPA cookie | ✅ Manuale | Standard Laravel SPA |
| ADR per decisioni critiche | ✅ Manuale | Raro vederli, sopra standard |
| Routes split per dominio | ✅ Manuale | Pattern enterprise |
| Test Characterization (golden) | ✅ Manuale | Pattern di team senior |
| Husky + commitlint + Conv. Commits | ✅ Manuale | Quality gate professionale |
| Idempotency keys + lockForUpdate Stripe | ✅ Manuale | Pattern enterprise |
| **Pinia con 1 solo store** | ❌ Fai-da-te | Dovrebbero essere 6-10 |
| **Composables 1000+ righe** | ❌ Fai-da-te | Anti-pattern |
| **66 CSS BEM custom + Tailwind installato** | ❌ Fai-da-te | Sceglierne uno |
| **TypeScript dichiarato non praticato** | ❌ Fai-da-te | O tutto o niente |
| **Doc 120 file in archive** | ❌ Fai-da-te | Diario, non doc prodotto |
| **README dice Nuxt 3 ma è Nuxt 4** | ❌ Fai-da-te | Nessuno aggiorna doc |
| **2 Policy per 26 Model** | ❌ Fai-da-te | Auth sparso |
| **2 Job per operazioni sincrone pesanti** | ❌ Fai-da-te | Nessun async |

**Sintesi**: la **fondazione è manuale** (stack, soldi, auth, ADR, routes, test). Le **pratiche giorno-per-giorno** sono fai-da-te (composables, CSS, TS, doc). È il classico profilo di una repo nata bene e cresciuta in solitaria.

---

## 9. Verdetto onesto finale

> **"Il dominio è genuinamente complesso (e-commerce + corriere + admin), e in questo dominio la repo non è 'troppo grande': è giusto del 25-30% sopra il necessario.
>
> Il 70% del codice è strutturalmente corretto e non va toccato. Il 30% restante è complessità accidentale concentrata in 4 sintomi specifici (composables giganti, CSS frammentato, TS fantasma, doc obsoleta).
>
> Per un junior, oggi, è difficile (3.4/5). Con 5 settimane di housekeeping mirato diventa 2/5 (livello manuale).
>
> Non va riscritta. Va dimagrita con bisturi, non con accetta. Questo è un caso da refactor incrementale, non da rewrite."**

### Punteggio aggregato

| Area | Voto | Trend possibile in 5 sett. |
|---|---:|---|
| Backend | 8.0 | → 8.5 (con policies + jobs) |
| Frontend | 5.5 | → 7.5 (con Pinia + Tailwind) |
| Test | 8.0 | → 8.0 (già ok) |
| Sicurezza | 7.5 | → 8.5 (con policies + Sentry) |
| Documentazione | 6.0 | → 8.0 (cancellando 110 file) |
| Workflow / quality gates | 8.5 | → 8.5 (già ok) |
| Onboarding junior | 5.5 | → 7.5 (post refactor) |
| **MEDIA ATTUALE** | **7.0** | **→ 7.9** |

---

## 10. Riferimenti operativi

Per il **piano di intervento** (tempi, ordine, rischi): vedi [`PIANO_SEMPLIFICAZIONE.md`](./PIANO_SEMPLIFICAZIONE.md).

Per la **roadmap esistente**: vedi `_archive/` (locale) o memory `project_mega_piano_v2_2026-04-17`.

Per **ADR esistenti**: vedi `docs/adr/`.
