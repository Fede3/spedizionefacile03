# Contributing — SpediamoFacile

Guida per contribuire al monorepo (Nuxt + Laravel). Leggi [QUICKSTART.md](./QUICKSTART.md) per setup iniziale e [ARCHITECTURE.md](./ARCHITECTURE.md) per capire il sistema.

## Setup iniziale

Alla prima clone devi installare le dipendenze root del workspace. Queste servono solo per i hook Git e il linting — non per il runtime dell'app.

```bash
# Dalla root del repo
npm install
```

Lo script `prepare` di Husky registra automaticamente i hook in `.git/hooks/`. Dopo `npm install` i hook sono attivi.

Per l'app frontend e backend valgono i rispettivi README:

- `nuxt-spedizionefacile-master/` → `npm install`
- `laravel-spedizionefacile-main/` → `composer install`

## Branch strategy — GitFlow-lite

```
main ────────────────●──────────●──────────●─── (tag v1.2.0)
                      \          \          \
develop ──●───●───●───●───●───●───●───●───●───●
           \       \               \
feature/    \       \               \
auth-reset   ●───●───●               \
                                      \
hotfix/                                 \
stripe-429 ─●───●                        \
                                          \
release/
1.3 ───────────────────────────────────────●───●
```

- **`main`** — solo release. Protected: no push diretti, solo merge da `release/*` o `hotfix/*` + tag semver.
- **`develop`** — branch integrazione. Tutte le feature mergiano qui. Deploy automatico staging.
- **`feature/<scope>-<short-desc>`** — nuove feature. Branch da `develop`, PR verso `develop`.
- **`hotfix/<scope>-<issue>`** — patch urgenti su prod. Branch da `main`, merge su `main` E `develop`, crea tag.
- **`release/<version>`** — prep release (changelog, version bump, regression test). Branch da `develop`, merge su `main`.

**Regole**:
- Un branch = una unita' di lavoro logica. Se la PR supera 500 LOC modificate, splittala.
- Mai rebase branch condivisi. `git rebase` solo su branch personali prima della PR.
- Niente merge di `develop` -> `feature/*` in continuo; aggiorna con rebase prima del push finale.

## Conventional Commits

I messaggi di commit devono seguire [Conventional Commits](https://www.conventionalcommits.org). `commit-msg` li valida via commitlint.

Formato:

```
<type>(<scope>): <subject>

<body opzionale>

<footer opzionale>
```

### Type ammessi

`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`, `ci`, `build`, `revert`.

### Scope ammessi

`auth`, `checkout`, `admin`, `brt`, `stripe`, `ui`, `ci`, `deps`, `funnel`, `cart`, `wallet`, `gdpr`, `security`, `a11y`, `seo`, `perf`, `docs`, `tests`, `preventivo`, `account`, `legal`, `homepage`.

Se ti serve un nuovo scope aggiornalo in `commitlint.config.js` nello stesso PR che lo introduce — non usare uno scope generico come workaround.

### Esempi

```
feat(checkout): aggiungi metodo di pagamento Klarna
fix(auth): ripristina chiusura inattesa del modal
docs(gdpr): aggiorna registro trattamenti per webhook Stripe
refactor(cart): estrai logica dedup su util
chore(deps): bump nuxt a 4.1.3
```

## Hook Git

### pre-commit (< 10s)

- **Nuxt**: `lint-staged` esegue ESLint (`--fix`) e Prettier solo sui file staged.
- **Laravel**: `vendor/bin/pint --dirty --test` verifica che i file PHP staged siano formattati.

Se il hook fallisce, l'errore dice esattamente quale comando lanciare (di norma `vendor/bin/pint --dirty`) oppure il file ESLint da correggere.

### commit-msg

Esegue `commitlint --edit` sul messaggio. Rifiuta commit con type/scope non validi o subject vuoto.

### pre-push (< 30s in media)

- **Nuxt**: `npm run typecheck` (vue-tsc).
- **Laravel**: `php artisan test --testsuite=Unit --stop-on-failure`.

Test di integrazione, E2E e build di produzione restano a CI.

## Bypass dei hook (solo emergenze)

In caso di emergenza operativa — hotfix in produzione, rollback, commit di risposta a incident — puoi bypassare i hook:

```bash
# Salta pre-commit + commit-msg
git commit --no-verify -m "fix(security): rollback release rotta"

# Salta pre-push
git push --no-verify
```

**Regole d'uso del bypass**:

1. Usalo solo se il blocco del hook è l'unico ostacolo al fix di un problema che sta già impattando gli utenti.
2. Apri immediatamente dopo un follow-up (issue o task) per rimettere in regola ciò che hai saltato — lint, format, typecheck o test.
3. Documentalo nella descrizione della PR con riga esplicita: `Bypass hook: <motivo>`.
4. Non usarlo come scorciatoia abituale: se il hook rallenta lo sviluppo, il fix è renderlo più veloce, non disattivarlo.

## PR workflow

### Template descrizione

Incolla in ogni PR:

```markdown
## Cosa cambia
<1-3 bullet che descrivono cosa fa la PR, non come>

## Perche'
<link issue o breve motivazione business/tecnica>

## Test
- [ ] Unit / feature test aggiunti o aggiornati
- [ ] Typecheck locale verde
- [ ] Smoke E2E manuale: <percorso testato>

## Rischio e rollback
<Basso/Medio/Alto + come fare rollback: revert commit? migration rollback?>

## Screenshot / demo
<solo se UI>
```

### Review

- Almeno **1 approvazione** per PR non critiche, **2** per cambi a core (`auth`, `checkout`, `payments`, `brt`, migrazioni DB).
- CI deve essere **verde** prima del merge: lint, typecheck, unit, E2E smoke.
- Reviewer designato dal CODEOWNERS (se presente) o assegnato in Slack `#dev`.

### Checklist code review

Reviewer verifica:

**Correttezza**
- [ ] Soluzione fa quello che dichiara (matching descrizione)
- [ ] Gestisce edge case (input vuoto, errore rete, timeout)
- [ ] Race conditions / idempotenza per webhook, job

**Sicurezza**
- [ ] Nessun segreto committato (scan .env, chiavi, token)
- [ ] Input validato (FormRequest lato Laravel, sanitize lato Nuxt)
- [ ] Authorization verificata (`$this->authorize(...)`, middleware, Policy)
- [ ] SQL injection: solo query parametrizzate / Eloquent, no raw concat
- [ ] XSS: `v-html` solo su contenuto sanitizzato con DOMPurify

**Performance**
- [ ] No N+1 (eager load `with()`)
- [ ] Query indici verificati (migration con index se needed)
- [ ] Bundle Nuxt non cresce > 5% senza motivo
- [ ] Nessun `console.log` / `dd()` / debug dimenticato

**Leggibilita'**
- [ ] Nomi chiari (no `foo`, `temp`, `data`)
- [ ] Funzioni < 50 LOC, se cresce splitta
- [ ] Commenti spiegano il *perche'*, non il *cosa*
- [ ] Nuovi file seguono struttura progetto ([FRONTEND_STRUCTURE.md](./FRONTEND_STRUCTURE.md) / [BACKEND_STRUCTURE.md](./BACKEND_STRUCTURE.md))

**Test**
- [ ] Comportamento nuovo coperto da test
- [ ] Test girano isolati (no ordine-dipendente)
- [ ] Coverage complessiva non cala

**Docs**
- [ ] Endpoint nuovo -> aggiornato [API_CONTRACT.md](./API_CONTRACT.md)
- [ ] Breaking change -> nota in CHANGELOG + migrazione documentata
- [ ] Env var nuova -> aggiornato `.env.example`

## Troubleshooting

- **`husky - command not found`**: rilancia `npm install` dalla root. Il hook è registrato da `prepare`.
- **`commitlint: command not found`**: assicurati di aver lanciato `npm install` dalla root (non solo nella sottocartella Nuxt).
- **Pint non formatta file in cartelle diverse**: `--dirty` ispeziona solo i file modificati rispetto a `main`. Se stai lavorando fuori branch, usa `vendor/bin/pint` senza `--dirty`.
- **Hook lento**: apri issue con scope `ci`. Obiettivo: pre-commit < 10s, pre-push < 30s.

## Artefatti locali e storico

Per non ricreare rumore nella repo:

- `docs/` = documentazione viva e canonica
- `docs/archive/` = storico documentale
- `_archive/` = snapshot tecnici o refactor superseded
- `_LOG/` = evidenze locali, screenshot, probe e audit manuali
- `output/` = stato runtime e scratch locali

Regole pratiche:

- non salvare nuovi dump o screenshot come file sciolti nella root repo
- i nuovi artefatti in `_LOG/` vanno in sottocartelle `data-tema/`
- se un documento diventa autorevole, deve stare in `docs/`, non in `_LOG/` o `_archive/`

## Riferimenti

- [QUICKSTART.md](./QUICKSTART.md) — setup ambiente
- [ARCHITECTURE.md](./ARCHITECTURE.md) — big picture
- [ONBOARDING.md](./ONBOARDING.md) — checklist primo PR
- [DEBUGGING.md](./DEBUGGING.md) — troubleshooting
- [API_CONTRACT.md](./API_CONTRACT.md) — elenco endpoint
