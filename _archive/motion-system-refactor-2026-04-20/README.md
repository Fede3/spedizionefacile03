# Motion System Refactor — 2026-04-20

## Cosa è stato fatto

Unificato TUTTO il sistema di animazioni del frontend in un file unico
`assets/css/motion.css` con 3 token, 3 primitive, 1 easing.

### Prima
- 9 file CSS con `transition:` sparse
- 34 componenti Vue con `<style scoped>` + transitions custom
- 8 easing diversi (`ease`, `ease-out`, `cubic-bezier(0.22,1,0.36,1)`, `cubic-bezier(0.4,0,0.2,1)`, ecc.)
- 15+ durate diverse (120ms, 150ms, 180ms, 200ms, 220ms, 250ms, 300ms, 350ms, 0.2s, 0.3s, ...)
- Transizioni hardcoded ovunque, nessun token semantico

### Dopo
- **1 file** `motion.css` (~100 LOC) con regole globali + primitive `.sf-interactive` / `.sf-reveal` / `.sf-spin`
- **3 token** globali `--sf-ease`, `--sf-t1` (120ms), `--sf-t2` (240ms), `--sf-t3` (480ms)
- **1 easing unico** `cubic-bezier(0.2, 0, 0, 1)` (Material Motion-inspired)
- **Hydration gate** `.is-hydrated` via plugin client → zero artefatti primo paint
- `prefers-reduced-motion` rispettato globalmente

### Numeri
| Metrica | Prima | Dopo |
|---|---|---|
| File CSS con motion sparse | 19 | 1 |
| `cubic-bezier` diversi | 8 | 1 |
| Durate diverse | 15+ | 3 |
| `transition:` hardcoded (tutti i file) | 228 | ~5 (var aliases) |
| Elementi uniformati in browser (sample) | — | 117/121 (96%) |

## File originali archiviati

In `css-originali/`:
- `main.css.backup` — main.css pre-refactor (per diff)
- `account-shell.css`, `admin-theme.css`, `navbar.css`, `preventivo.css`,
  `shipment-step.css`, `autenticazione.css` — snapshot pre-refactor

## Come riattivare vecchio sistema (rollback)

Non raccomandato — il nuovo sistema è strettamente superiore. Se mai servisse:
```bash
cp _archive/motion-system-refactor-2026-04-20/css-originali/* \
   nuxt-spedizionefacile-master/assets/css/
# Rimuovere riga `@import "./motion.css"` da main.css
# Rimuovere file assets/css/motion.css
```

## Regole per manutenzione futura

1. **MAI** aggiungere `transition: all` (sempre proprietà specifiche)
2. **MAI** hardcodare durate o easing: usa solo `var(--sf-t1/2/3)` e `var(--sf-ease)`
3. **MAI** aggiungere nuove primitive di motion senza discussione (il sistema deve restare a 3)
4. **Nuovi elementi interattivi** → usa classe `.sf-interactive` (già applicata a `.btn*` globalmente)
5. **Nuovi modal/toast/popover** → applica classe `.sf-reveal` sul contenuto
6. **Nuovi spinner** → classe `.sf-spin`

## Riferimenti
- `nuxt-spedizionefacile-master/assets/css/motion.css` — fonte del sistema
- `nuxt-spedizionefacile-master/plugins/02.hydrated-class.client.ts` — gate hydration
