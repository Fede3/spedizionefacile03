# ADR 004 — Tailwind utility + design system Sf* (no CSS custom)

Data: 2026-05-01
Status: Accepted

## Contesto

Il frontend Nuxt 4 era nato con CSS custom page-specific (`account.css` 2437 LOC, `admin.css` 3851 LOC, `legal-pages.css` 250 LOC, ecc.) misti a utility Tailwind nei template. Risultato: schizofrenia architetturale. Apri un componente account, vedi `class="account-route-shell__nav-item"` definita in un file CSS lontano. Apri un componente admin, vedi `class="admin-prezzi-input"` con stile in altro CSS. Junior dev non capisce dove cercare lo stile.

Opzioni valutate:
1. **CSS Modules + scoped**: ogni componente porta il suo CSS (Vue 3 SFC standard).
2. **CSS-in-JS** (vanilla-extract, panda-css): runtime overhead + complessità.
3. **Tailwind utility puro + design system Sf\* proprietario** + Nuxt UI 4 per primitive.
4. **Status quo**: mantenere mix CSS custom + Tailwind.

## Decisione

**Tailwind utility puro + design system `Sf*` proprietario + Nuxt UI 4** per primitive complesse (UTable, UModal, UInput, UFormGroup, UTabs, UAvatar). Single source of truth: CSS variables in `assets/css/main.css :root`. Tailwind config mappa le variabili come token (`bg-brand-primary` → `var(--color-brand-primary)`).

## Motivazioni

- **Scoperta immediata**: stile e markup nello stesso file (template), no CSS file da cercare.
- **Junior-friendly**: utility self-documenting (`flex items-center gap-3` vs `.account-row` da decifrare).
- **Single source of truth**: cambiare il primary color tocca solo `:root`, propaga ovunque.
- **Nuxt UI 4 free**: primitive con accessibilità WCAG già pronte, no reinvenzione ruota.
- **Sf\* wrapper**: per pattern brand-specific che non esistono in Nuxt UI (StatusPill, AddressChip, EmptyState, StatCard).
- **Design system proprietario**: pagina `__design-system.vue` (dev-only) come showcase + Storybook leggero.

## Conseguenze

- Migrazione progressiva di 7 CSS minori + 2 monoliti (`account.css` + `admin.css`) a utility.
- Rimangono solo: `main.css` (`:root` tokens + reset essenziali), `funnel-animations.css` (keyframes shared), `funnel-*.css` durante migrazione (intoccabili Stripe-critical fino a E2E).
- Naming uniforme: `bg-brand-*`, `text-brand-*`, `border-brand-*`, `rounded-button|control|card|pill`, `shadow-sf-*`.
- Componenti `Sf*` (23 totali): `SfButton`, `SfModal`, `SfConfirmDialog`, `SfSkeleton`, `SfInput`, `SfTextarea`, `SfSelect`, `SfCheckbox`, `SfRadio`, `SfSegmented`, `SfCard`, `SfBadge`, `SfStatusPill`, `SfTabs`, `SfTable`, `SfAvatar`, `SfTooltip`, `SfAlert`, `SfEmptyState`, `SfFormGroup`, `SfDropdown`, `SfBreadcrumbs`, `SfPagination`.
- Vincolo: **mai** mischiare CSS custom + Tailwind nello stesso componente. Solo eccezione: `funnel-*.css` durante migrazione documentata.

## Pattern uso

```vue
<!-- ❌ NO: classi custom da file CSS lontano -->
<div class="account-route-shell__nav-item account-route-shell__nav-item--active">
  Profilo
</div>

<!-- ✅ SÌ: utility self-documenting + token brand -->
<NuxtLink
  to="/account/profilo"
  class="flex items-center gap-3 rounded-card px-4 py-3 text-brand-text-secondary
         transition hover:bg-brand-bg-alt aria-[current=page]:bg-brand-primary aria-[current=page]:text-white">
  Profilo
</NuxtLink>
```

## Riferimenti

- `apps/web/assets/css/main.css` (`:root` tokens)
- `apps/web/tailwind.config.js` (mapping token → utility)
- `apps/web/components/sf/` (design system Sf\*)
- `apps/web/pages/__design-system.vue` (showcase dev-only)
