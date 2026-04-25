# PIANO DI SEMPLIFICAZIONE — SpediamoFacile

**Data**: 25 aprile 2026
**Obiettivo**: portare la repo a livello "manuale agency mid-tier" senza rompere niente, senza riscrivere
**Tempo stimato**: 5 settimane di housekeeping mirato (1 dev senior full-time, oppure 8 settimane mid-time)
**Filosofia**: bisturi, non accetta. Refactor incrementale guidato dai test.

> Vedi prima [`AUDIT_PROFONDO.md`](./AUDIT_PROFONDO.md) per la diagnosi su cui questo piano si basa.

---

## 0. Filosofia operativa

### Principi non negoziabili

1. **Zero rewrite.** Niente "ricominciamo da capo questa parte". Il dominio è ben modellato, va conservato.
2. **Test verdi prima e dopo ogni step.** I 102 test esistenti sono il salvagente. Se rompi un test, rollback.
3. **Una cosa alla volta.** Ogni PR/commit fa UNA modifica, non bundle. Diff piccoli, review semplice.
4. **Strangler pattern.** Per ogni god-composable che si trasforma in store Pinia: lo store nuovo coesiste con il vecchio composable, le pagine migrano una alla volta, il vecchio si elimina solo quando tutti i caller sono migrati.
5. **Niente "feature flag" interni.** Sono altro debito.
6. **Verificare con preview MCP** dopo ogni modifica visibile (regola in `CLAUDE.md`).

### Cosa NON fare (errori comuni in refactor di repo medie)

- ❌ **NON riscrivere il backend.** È a 8/10, va solo curato (policies + jobs).
- ❌ **NON migrare a Vue 3 Options API.** Sei già su Composition API.
- ❌ **NON cambiare framework** (no migrazione a Next.js o altro).
- ❌ **NON cambiare paradigma DB** (no migrazione MySQL → MongoDB ecc.).
- ❌ **NON eliminare le ADR.** Sono il documento più prezioso che hai.
- ❌ **NON consolidare i namespace BE** `Services/{Brt,Pricing,Invoice}` — sono fatti bene.
- ❌ **NON toccare la struttura test.** È già textbook.
- ❌ **NON pushare big-bang refactor.** PR sotto le 500 righe sempre.

---

## 1. Mappa generale degli interventi

```
                                 IMPATTO BUSINESS
                          basso                        alto
                            ┌─────────┬─────────┐
                  alto      │  D      │   A     │
                            │         │         │
                            ├─────────┼─────────┤
   COMPLESSITÀ TECNICA      │  C      │   B     │
                  basso     │         │         │
                            └─────────┴─────────┘

A) Composables → Pinia stores       (alto/alto)   ★ Priorità 1
B) Doc cleanup + fix discrepanze    (basso/alto)  ★ Priorità 2 (quick win)
C) Encoding UTF-8 + 66 CSS consolidamento (basso/medio) Priorità 3
D) Policies + Jobs + Form Requests  (alto/medio)  Priorità 4
```

---

## 2. Roadmap a fasi (5 settimane)

### FASE 0 — Sicurezza prima di toccare (giorno 1)

**Obiettivo**: garantire che il refactor non introduca regressioni.

| Task | Tempo | Output |
|---|---|---|
| 0.1 — Run `npm run test:e2e` + `php artisan test` → baseline verde | 30 min | Snapshot stato test (file `BASELINE.txt` con 102 verdi) |
| 0.2 — Coverage report BE + FE | 1h | `coverage/` per identificare aree scoperte |
| 0.3 — Snapshot visivi Playwright (`tests/e2e/visual-regression.spec.ts-snapshots/`) refresh | 30 min | Snapshot aggiornati |
| 0.4 — Branch dedicato `refactor/2026-q2-housekeeping` | 5 min | Working area isolata |
| 0.5 — Tag git `v-pre-refactor-2026-04-25` su main | 5 min | Punto di rollback assoluto |

**Output Fase 0**: rete di sicurezza pronta. Si può rompere e tornare indietro.

---

### FASE 1 — Quick wins gratis (giorno 2-3)

**Obiettivo**: ottenere percezione "repo più pulita" senza toccare il codice business.

#### 1.1 — Fix discrepanze README/ARCHITECTURE/codice (4h)

| Discrepanza | Fix |
|---|---|
| README dice "Nuxt 3" → è Nuxt 4.1.3 | Aggiorna README |
| README dice "Laravel 12" / ARCHITECTURE dice "Laravel 11" | Verifica `composer.json`, allinea |
| ARCHITECTURE dice "Sentry" + "Plausible" + "web-vitals" → non in deps | Rimuovi dalla doc OPPURE aggiungi al codice (vedi Fase 4.4) |
| ARCHITECTURE: "userStore singleton" → reale "shipmentFlowStore" | Aggiorna nome in doc |
| ARCHITECTURE: routing `/admin/orders/[id]` → reale `/account/amministrazione/ordini` | Aggiorna esempio |

**Strumento**: lettura sequenziale di README + ARCHITECTURE + ONBOARDING + DESIGN_SYSTEM e correzione.

**Output**: doc che dice la verità. Junior che la legge non si confonde.

#### 1.2 — Encoding UTF-8 normalization (30 min)

```bash
# Script Node ad-hoc o iconv per convertire Win-1252 → UTF-8 senza BOM
# I file colpiti hanno "â†’" invece di "→" nei commenti.
```

Identificazione file affetti: `grep -rl "â†" --include="*.js" --include="*.ts" --include="*.vue"`.

Fix: script `scripts/normalize-encoding.mjs` che:
1. Legge ogni file colpito
2. Converte da Win-1252 a UTF-8
3. Sostituisce le sequenze rotte note (`â†’` → `→`, `Ã²` → `ò`, ecc.)
4. Salva senza BOM

**Output**: codice leggibile correttamente in tutti gli editor.

#### 1.3 — Doc cleanup (4h)

**Operazione manuale**:
1. Spostare in `docs/archive/2026-04-PRE-REFACTOR/` tutti i 90 file di `docs/archive/` attuali
2. Lista dei doc VIVI da tenere (12 file):
   - `docs/README.md`
   - `docs/QUICKSTART.md`
   - `docs/ONBOARDING.md`
   - `docs/ARCHITECTURE.md` (corretto in 1.1)
   - `docs/CONTRIBUTING.md`
   - `docs/FRONTEND_STRUCTURE.md`
   - `docs/BACKEND_STRUCTURE.md`
   - `docs/DESIGN_SYSTEM.md`
   - `docs/DEBUGGING.md`
   - `docs/FEATURE_BOUNDARIES.md`
   - `docs/operations/DEPLOY.md`
   - `docs/legal/SECURITY.md`
   - `docs/legal/GDPR.md`
   - `docs/adr/{001,002,003}.md` + `README.md`
   - `docs/AUDIT_PROFONDO.md` (questo audit)
   - `docs/PIANO_SEMPLIFICAZIONE.md` (questo piano)
3. Cancellare in toto `docs/archive/percorsi-didattici-legacy/` (4 sotto-livelli)
4. Cancellare `docs/archive/CODEX/` (ha senso solo storico, già su git history)
5. Cancellare `docs/archive/local-context/`, `docs/archive/TEAM_LOG/`, `docs/archive/root-history/`

**Output**: ~15 file `.md` vivi vs 120 attuali. Junior trova quello che cerca in 30 secondi.

#### 1.4 — Consolidare config infrastruttura (4h)

| Da | A |
|---|---|
| `render.yaml` + `render.staging.yaml` separati | Mantenere (Render richiede file separati) ma docs/operations/DEPLOY.md spiega quale è quale |
| `Caddyfile` | Spostare in `infra/caddy/Caddyfile` |
| `infra/` orfana | Diventa root di tutta l'infra |
| `laravel-spedizionefacile-main/docker/` | Lasciare (Laravel-specifico) ma menzionare in DEPLOY.md |

**Output**: 1 sezione `docs/operations/DEPLOY.md` che spiega tutto in 1 pagina.

**📊 Fine Fase 1**: 1 settimana, zero rischio, repo già percepita come "meno caotica".

---

### FASE 2 — Pinia migration (settimane 2-3)

**Obiettivo**: estrarre stato dai god-composables in store Pinia con strangler pattern.

#### Strategia generale

Per ogni god-composable da migrare:
1. **Identifico stato** (le `ref()` esposte) vs **azioni** (funzioni esposte)
2. Creo `stores/<dominio>Store.ts` con stato + azioni
3. Il vecchio composable diventa un thin wrapper: `useCart()` → ritorna `useCartStore()`
4. Test esistenti continuano a passare (stessa API)
5. Pagine nuove usano direttamente lo store, pagine vecchie passano per il wrapper
6. Quando tutte le pagine sono migrate, elimino il wrapper e il composable

#### Ordine di migrazione (priorità per impatto)

| # | Composable | Righe | → Store target | Tempo | Rischio |
|---|---|---|---|---|---|
| 2.1 | `useAuth.js` | 700 | `stores/authStore.ts` | 2 g | 🟢 Basso (auth è ben isolato) |
| 2.2 | `useCart.js` | 820 | `stores/cartStore.ts` + `useCartView()` thin | 3 g | 🟠 Medio (3 composable nello stesso file) |
| 2.3 | `useFunnel.js` | 714 | `stores/funnelStore.ts` (espande il `shipmentFlowStore` esistente) | 3 g | 🟠 Medio |
| 2.4 | `usePayment.js` | 718 | `stores/paymentStore.ts` + thin composable | 2 g | 🟠 Medio (Stripe state) |
| 2.5 | `useAdminPrezzi.js` | 1426 | `stores/admin/prezziStore.ts` | 3 g | 🟢 Basso (admin isolato) |
| 2.6 | `useAddressBook.js` | 621 | `stores/addressBookStore.ts` | 2 g | 🟢 Basso |
| 2.7 | `usePudo.js` | 912 | `stores/pudoStore.ts` | 2 g | 🟠 Medio (BRT API) |
| 2.8 | `useLocation.js` | 743 | `stores/locationStore.ts` | 2 g | 🟢 Basso (autocomplete) |

**Totale Fase 2**: ~19 giorni. Ogni store < 250 righe (vs il god-composable originale).

#### Esempio concreto: estrazione `useCart.js` → `cartStore.ts`

**PRIMA** (`composables/useCart.js`, 820 righe):
```js
export function useCart() {
  const cart = ref({ data: [], meta: {...} })
  const billing = reactive({...})
  const wallet = ref({...})
  // ... 800 altre righe ...
  return { cart, billing, wallet, initCheckoutPage, ... }
}
export function useCartOperations() { /* alias */ }
export function useCarrello() { /* logica diversa */ }
```

**DOPO** (`stores/cartStore.ts`, ~250 righe):
```ts
export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const meta = ref<CartMeta>({...})
  const billing = reactive({...})
  // azioni
  async function init() { /* ... */ }
  async function applyCoupon(code: string) { /* ... */ }
  return { items, meta, billing, init, applyCoupon, /* ... */ }
})
```

**+ thin wrapper retro-compat** (`composables/useCart.ts`, ~30 righe):
```ts
export function useCart() {
  const store = useCartStore()
  // espone API legacy mappata sullo store
  return { cart: computed(() => store.items), ...storeToRefs(store), initCheckoutPage: store.init }
}
// Le altre due funzioni (useCartOperations, useCarrello) restano per ora, da deprecare
```

**Pages migrano gradualmente**: la pagina `checkout.vue` usa `useCartStore()` direttamente, la pagina `carrello.vue` continua con `useCarrello()` finché non viene migrata anche lei.

#### KPI Fase 2

| Metrica | Pre | Target post |
|---|---|---|
| Composables > 500 righe | 12 | 0-2 |
| Store Pinia | 1 | 8-10 |
| Test verdi | 102 | 102 (zero regression) |
| Lint warning | (baseline) | <= baseline |

**📊 Fine Fase 2**: frontend ha state management moderno. Junior può usare DevTools Pinia per ispezionare lo stato.

---

### FASE 3 — TypeScript adoption (settimana 4, parziale)

**Obiettivo**: smettere di pagare il typecheck senza ottenerne i benefici.

#### Decisione binaria preliminare

Hai 3 opzioni:

| Opzione | Pro | Contro | Consigliato? |
|---|---|---|---|
| **A) TS completo** (codemod massivo) | Best of class | 2 settimane di lavoro | ✅ Se hai 1 senior full-time |
| **B) TS solo nei nuovi store** (Fase 2) + composables nuovi | Pragmatic, basso effort | Restano file JS legacy | ✅ Per team a tempo limitato |
| **C) Tutto JS** (rimuovi vue-tsc) | Onesto, basso rischio | Perdi autocompletion | ❌ Solo se ti arrendi |

**Raccomandazione**: **Opzione B**. È quello che fa la maggior parte delle agency.

#### Implementazione Opzione B

| Task | Tempo |
|---|---|
| 3.1 — Tutti gli store creati in Fase 2 sono già `.ts` | (incluso in Fase 2) |
| 3.2 — `tsconfig.json` con `strict: true` ma `allowJs: true` | 30 min |
| 3.3 — Convert `types/index.ts` → `types/api.ts` + `types/domain.ts` con tipi ricchi (Order, Cart, Address, ecc.) | 1 g |
| 3.4 — Code style: nuovo file = `.ts`. File legacy `.js` invariato | (regola in CONTRIBUTING.md) |
| 3.5 — `.eslintrc` con regola "no-implicit-any" sui `.ts` | 30 min |
| 3.6 — Eventuale: convertire 5 composables piccoli a `.ts` come esempio (`useFormatPrice`, `useDebounce`, ecc.) | 2h |

**Output**: TS coverage sale dal 26% al ~50% nel giro di 6 mesi naturalmente, perché ogni feature nuova è in TS.

---

### FASE 4 — Backend hardening (settimana 4-5)

**Obiettivo**: chiudere i 4 gap del backend identificati nell'audit.

#### 4.1 — Policies (3 giorni)

**Target**: 1 Policy per ogni Model "owned" o sensibile.

| Model | Policy da creare | Motivazione |
|---|---|---|
| `Order` | `OrderPolicy` (view, update, cancel, refund) | Già la più sensibile |
| `Address` (UserAddress) | `AddressPolicy` (view, update, delete) | Owned by user |
| `BillingAddress` | `BillingAddressPolicy` | Idem |
| `Cart` | `CartPolicy` (view, update) | Cart_user pivot |
| `WalletMovement` | `WalletPolicy` (view, request_withdrawal) | Soldi |
| `Invoice` | `InvoicePolicy` (view, download) | Documenti |
| `PushSubscription` | `PushSubscriptionPolicy` | (se rimasta) |
| `SavedShipment` | `SavedShipmentPolicy` | Owned |
| `Coupon` | `CouponPolicy` (admin only) | Admin scope |
| `Service` | `ServicePolicy` (admin only) | Admin scope |
| `User` | `UserPolicy` (admin scope) | Admin |

**Pattern**:
1. `php artisan make:policy OrderPolicy --model=Order`
2. Implemento `view`, `update`, `cancel`, `refund` con `$user->id === $order->user_id || $user->isAdmin()`
3. In `AppServiceProvider::boot()` registro `Gate::policy(Order::class, OrderPolicy::class)`
4. Nei controller sostituisco i check manuali con `$this->authorize('update', $order)`
5. Test: aggiungo `tests/Unit/Policies/OrderPolicyTest.php` con casi positivi/negativi

**Output**: ogni Policy è un file di ~80 righe testabile. Audit di sicurezza passa da "leggi 59 controller" a "leggi 11 policy".

#### 4.2 — Jobs (2 giorni)

Operazioni da rendere queueable:

| Operazione attuale | → Job | Queue |
|---|---|---|
| `Mail::to(...)->send(new OrderAwaitingBankTransferMail)` sync | `Mail::to(...)->queue(...)` o Job esplicito | `emails` |
| Generazione PDF fattura (`InvoicePdfService`) | `GenerateInvoicePdfJob` | `default` |
| Sync BRT etichetta + tracking init | `CreateBrtShipmentJob` | `webhooks` |
| Update dashboard admin (se presente) | `RebuildAdminStatsJob` (cron) | `default` |
| Webhook BRT processing | `ProcessBrtWebhookJob` | `webhooks` |

**Pattern**:
1. Estraggo dal Service una classe `Job` con `ShouldQueue` + `tries=3` + `backoff=[60,180,600]`
2. Test in `tests/Feature/Jobs/...`
3. Configuro Horizon (opzionale) o queue worker dedicato

**Output**: checkout dell'utente da 3-5 secondi a < 1 secondo. PDF e BRT vanno in background.

#### 4.3 — Form Request progressivo (continuo, no scadenza)

**Regola per sviluppo futuro**: ogni nuovo endpoint scrivente nasce con FormRequest.

```php
// Esempio target
class UpdateOrderRequest extends FormRequest {
  public function authorize(): bool {
    return $this->user()->can('update', $this->route('order'));
  }
  public function rules(): array { return [...]; }
}
```

**Impatto**: validation centralizzata + autorizzazione uniforme + testabile.

**Numero target dopo 1 anno**: ~30-35 FormRequest (rispetto agli attuali 10).

#### 4.4 — Sentry (1 giorno)

**Backend**:
```bash
composer require sentry/sentry-laravel
php artisan sentry:publish --dsn=...
```

**Frontend**:
```bash
npm install @sentry/vue
# in plugins/sentry.client.ts
```

**Aggiungo a `.env.example`**: `SENTRY_LARAVEL_DSN=...`, `NUXT_PUBLIC_SENTRY_DSN=...`.

**Output**: error tracking attivo. Aggiorno `ARCHITECTURE.md` per riflettere la realtà (ora finalmente vera).

#### 4.5 — Consolidare 4 service BRT in 2 (1 giorno)

| Da | A |
|---|---|
| `OrderBrtTrackingLookupService` + `OrderBrtTrackingReadService` | `BrtTrackingService` |
| `OrderBrtTrackingLifecycleService` + `OrderBrtTrackingFulfillmentService` | `BrtShipmentLifecycleService` |

Test esistenti continuano a passare (stesso comportamento, classe rinominata via alias).

---

### FASE 5 — CSS consolidation (settimana 5)

**Obiettivo**: portare 66 file CSS a 5-10, sfruttando Tailwind 4 + Nuxt UI 4 già installati.

#### 5.1 — Audit CSS reale (1 g)

Per ogni file in `assets/css/components/`:
1. Quale componente lo importa?
2. Quante righe sono utility duplicate (margine, padding, color) → vanno via
3. Quante righe sono pattern unici → restano

#### 5.2 — Consolidamenti facili (2 g)

| Merge target | File coinvolti | Risparmio |
|---|---|---|
| `sf-admin-data-table.css` | `sf-admin-user-table.css` (7.4K) + `sf-admin-order-table.css` (6.9K) + sf-admin-spedizioni (estratto) | ~670 LOC |
| `sf-admin-filter-bar.css` (consolidato) | `sf-admin-filter-bar.css` + `sf-admin-order-filters.css` | ~150 LOC |
| `sf-account-shell.css` (lasciare) | (già unico, ok) | 0 |

#### 5.3 — Pulire utility duplicate (2 g)

Per ogni file: ogni regola tipo `.foo { padding: 1rem; color: var(--color-brand-teal); }` diventa Tailwind `<div class="p-4 text-brand-teal">`.

**Strumento**: VS Code regex search + manual review.

#### 5.4 — File CSS finali target

```
assets/css/
├── main.css                       (reset + tokens + globals, ~200 righe)
├── tokens.css                     (variabili design, ~100 righe)
├── components/
│   ├── sf-admin-data-table.css   (consolidato admin tables)
│   ├── sf-admin-shell.css         (sidebar admin)
│   ├── sf-account-shell.css       (sidebar account)
│   ├── sf-segment.css             (segmented controls)
│   └── sf-service-card.css        (cards servizi shipment)
└── pages/
    ├── shipment-step.css          (route-specific funnel)
    └── homepage.css               (route-specific home)
```

**Da 66 a ~9 file**. ~5000 righe CSS in meno.

---

## 3. KPI di successo

Misurare PRIMA e DOPO ogni fase:

| KPI | Pre | Target post-refactor |
|---|---|---|
| Composables > 500 righe | 12 | ≤ 2 |
| Store Pinia | 1 | 8-10 |
| TS coverage (file) | 26% | ≥ 50% |
| File CSS in `assets/css/` | 66 | 9-12 |
| Doc `.md` vivi | 26 | 12-15 |
| Doc `.md` archive | 90 | 0 (cancellati) |
| Discrepanze README/code | 5+ | 0 |
| Mojibake encoding | 12+ file | 0 |
| Policies BE | 2 | 11 |
| Jobs queue BE | 2 | 8-10 |
| Form Request BE | 10 | 15+ (in crescita) |
| Test verdi | 102 | 102+ (no regression) |
| Tempo onboarding junior | 3-4 sett. | 1 sett. |
| Voto FE | 5.5/10 | 7.5/10 |
| Voto BE | 8.0/10 | 8.5/10 |
| Voto medio | 7.0/10 | 7.9/10 |

---

## 4. Calendario sintetico

```
Settimana 1: Fase 0 + Fase 1 (sicurezza + quick wins)
Settimana 2: Fase 2.1-2.4 (auth, cart, funnel, payment → Pinia)
Settimana 3: Fase 2.5-2.8 (admin, address, pudo, location → Pinia)
Settimana 4: Fase 3 (TS opzione B) + Fase 4.1-4.2 (Policies + Jobs)
Settimana 5: Fase 4.3-4.5 (FR, Sentry, BRT consol.) + Fase 5 (CSS)
```

**Buffer**: 1 settimana extra per imprevisti = 6 settimane realistiche.

---

## 5. Rischi e mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| Refactor rompe checkout | Bassa | Critico | Test E2E Playwright + golden master Characterization |
| Stato Pinia desincronizzato dopo Fase 2 | Media | Alto | Strangler pattern: thin wrapper retro-compat finché tutti i caller migrano |
| Junior che entra a metà refactor si confonde | Alta | Medio | Doc `MIGRATIONS.md` che traccia "X è stato spostato da A a B" |
| Tempo soffia oltre le 5 settimane | Alta | Basso | Buffer di 1 sett.; le ultime fasi (CSS, Sentry) sono opzionali se urge consegnare |
| Dipendenza Stripe rompe in Fase 4.4 (Sentry) | Bassa | Critico | Sentry non tocca codice business, solo capture errori |
| Encoding script corrompe file | Bassa | Alto | Backup git tag prima, dry-run su 1 file prima di batch |

---

## 6. Cosa fare quando il piano è completo

Dopo le 5-6 settimane:

### Quality gates da aggiungere
1. **CI**: blocco PR se file `.vue` o `.ts` > 400 righe (ESLint custom rule `max-lines`)
2. **CI**: blocco PR se nuovo file `.css` > 100 righe (forza utility Tailwind)
3. **CI**: typecheck pulito (`vue-tsc --noEmit`) come gate
4. **CI**: regola "no-orphan-doc": ogni `.md` deve essere linkato da `docs/README.md`

### Documenti da scrivere DOPO

- `docs/MIGRATIONS.md` — log delle migrazioni di refactor (per junior che entra dopo)
- `docs/STATE_MANAGEMENT.md` — quando usare Pinia vs composable vs reactive locale
- `docs/CSS_GUIDELINES.md` — quando creare nuovo file CSS vs Tailwind utility (regola: file > 80 righe è candidato)

### Cosa NON aggiungere

- ❌ Storybook (overhead per piccolo team)
- ❌ Monorepo tool (Turborepo) finché non avete 3+ progetti
- ❌ GraphQL (l'API REST è ok per il dominio)
- ❌ Microservizi (siete in monolite ed è giusto)

---

## 7. Punti onesti: quando fermarsi

**La perfezione è nemica del bene.** Questo piano porta la repo da 7.0/10 a 7.9/10. Per arrivare a 9.0/10 servirebbe:
- Migrazione TS al 95% (1 mese in più)
- Storybook con design tokens (1 mese)
- Performance audit + ottimizzazioni Core Web Vitals (1-2 settimane)
- A11y audit completo WCAG AA (1 settimana)

**Vale la pena?** Per un sito di spedizioni con un team di 1-3 dev: **no**. Il ROI cala dopo 7.9/10. Meglio:
- Spedire feature business
- Curare il funnel (conversioni)
- Migliorare il marketing/SEO

**Quando rivedere il piano**: dopo 6 mesi di feature normali, se sono entrati 2-3 nuovi sviluppatori, valutare se la repo sta tenendo. Se sì, lasciarla così. Se no, una seconda passata mirata.

---

## 8. Riepilogo decisionale per il committente

| Domanda | Risposta |
|---|---|
| È necessario riscrivere? | **No.** Il dominio è ben modellato, va dimagrita. |
| Quanto tempo serve? | **5 settimane** (1 senior FT) o **8 settimane** (1 mid PT). |
| Si può rilasciare durante? | **Sì**, ogni fase è indipendente, ogni PR è atomica. |
| Il rischio è alto? | **Medio-basso.** I 102 test esistenti coprono il flow critico. Strangler pattern protegge. |
| Si può fare in produzione? | **Sì** con feature flag su nuove pagine, refactor in branch e merge a wave. |
| Junior può aiutare? | **Solo Fase 1** (doc cleanup, encoding fix). Fase 2-5 richiede senior/mid. |
| Si può spalmare nel tempo? | **Sì**: 1 fase ogni 2-3 mesi tra una feature e l'altra. Tempo totale aumenta a 6-9 mesi ma carico cognitivo basso. |

---

## 9. Riferimenti

- [`AUDIT_PROFONDO.md`](./AUDIT_PROFONDO.md) — diagnosi su cui questo piano è costruito
- [`adr/`](./adr/) — decisioni architetturali esistenti da rispettare
- [`CLAUDE.md`](../CLAUDE.md) — convenzioni di progetto (palette no-blue, italiano, ecc.)
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — workflow di sviluppo

---

## 10. Approvazione e go/no-go

Questo documento è una **proposta**. Prima di iniziare, decidere:

- [ ] Confermare le 5-6 settimane di tempo
- [ ] Confermare disponibilità di 1 senior (o 1 mid + 1 senior part-time per supervisione)
- [ ] Approvare la lista doc da cancellare (Fase 1.3)
- [ ] Confermare opzione TS (raccomandato: B)
- [ ] Confermare se Sentry va aggiunto (raccomandato: sì)
- [ ] Stabilire freeze del backlog feature durante Fase 2 (alternativamente: lavorare in branch lungo e merge a fine)

**Una volta confermato**: aprire issue per Fase 0, taggare repo, partire.
