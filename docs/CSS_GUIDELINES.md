# CSS Guidelines — Quando creare un file CSS vs Tailwind utility

Repo Nuxt 3 + Tailwind CSS 4 + Nuxt UI 4. Convivono 3 strategie CSS:
1. **Tailwind utility-first** (raccomandato per la maggior parte dei casi)
2. **CSS custom in `assets/css/`** (per pattern ricorrenti specifici del brand)
3. **`@apply` Tailwind in CSS custom** (ponte fra i due, da limitare)

## Regola d'oro

> Se la classe è usata in **>3 componenti diversi**, va in CSS custom.
> Se è usata in **1-3 componenti**, resta inline Tailwind.

## Albero decisionale

```
Stai stilando qualcosa?
        │
        ├── Pattern visivo unico per questa pagina?
        │       └── Inline Tailwind (utility classes)
        │
        ├── Pattern ricorrente in 2-3 posti dello stesso dominio?
        │       └── Inline Tailwind + componente Vue riusabile
        │
        ├── Pattern ricorrente in >3 dominii (es. card, button, modal)?
        │       └── CSS file in assets/css/components/sf-*.css
        │
        ├── Token globale (color, spacing, radius, shadow)?
        │       └── Variabile CSS in assets/css/main.css @theme block
        │
        └── Animazione complessa con keyframes?
                └── CSS file dedicato in assets/css/motion.css
```

## Convenzioni di naming

- File CSS componente: `assets/css/components/sf-{nome}.css` (es. `sf-account-shell.css`)
- File CSS pagina: `assets/css/pages/{nome}.css` (es. `pages/admin-ordini.css`)
- Classi BEM-like: `.sf-{component}__{element}--{modifier}` (es. `.sf-account-card__title--highlighted`)
- Token CSS: `--{categoria}-{nome}` (es. `--color-brand-primary`, `--radius-md`, `--gap-3`)

## Quando creare un nuovo file CSS

✅ **Sì se**:
- Il pattern compare in >3 componenti separati di dominii diversi
- Il file conterrà >30 righe di stile coerente
- Ci sono media query responsive specifiche
- Il design richiede pseudo-elementi `::before`/`::after`

❌ **No se**:
- Sono <10 righe di styling: usa inline Tailwind
- È specifico di 1 sola pagina: usa inline o `<style scoped>` Vue
- Sono solo override di token esistenti: aggiorna il token in `main.css`

## Soglia ESLint quality gate

In `eslint.config.mjs`:

```js
'max-lines': ['warn', { max: 500 }]
```

File CSS oltre **400 righe** sono candidati a split:
- estrarre token in file separato
- estrarre media query in sub-file
- estrarre sotto-componente specifico

## File CSS attuali (post-cleanup)

| File | LOC | Scope |
|---|---|---|
| `main.css` | ~2.300 | Tokens design + globals + reset |
| `shipment-step.css` | ~3.330 | Funnel preventivo (route-specific) |
| `preventivo.css` | ~1.300 | Componente preventivo rapido |
| `autenticazione.css` | ~1.400 | Pagine auth (login, register, recupera) |
| `chi-siamo.css` | ~560 | Pagina chi-siamo |
| `servizi.css` | ~260 | Pagina servizi |
| `components/sf-*.css` | varie | Componenti riusabili dominio (40 file) |

## Anti-pattern da evitare

❌ **!important a cascata**: se serve `!important` per override, il selettore è sbagliato. Aumenta specificity correttamente.

❌ **CSS custom per cose Tailwind copre**: `.padding-4 { padding: 16px }` invece di `class="p-4"`. Errore.

❌ **Variabili one-shot**: `--my-button-padding: 12px` usato 1 volta → inline `padding: 12px`.

❌ **BEM custom + Tailwind utility nello stesso template**: scegli uno o l'altro per quel componente.

❌ **CSS dead non rimosso**: classe CSS che `grep -r "nome" components/ pages/` ritorna 0 → eliminare.
