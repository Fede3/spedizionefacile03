# Componenti Orfani — Archiviati 2026-04-20

## Motivo
Componenti con 0 riferimenti nei template del progetto.

## Libreria SF scaffolded-ma-mai-adottata
`components/sf/` conteneva 13 componenti atomici:
- SfBadge, SfButton, SfCard, SfEmptyState, SfIcon, SfInput,
  SfSpinner, SfToast, SfTooltip — **archiviati** (mai usati).
- SfConfirmDialog, SfModal, SfSkeleton, SfBreadcrumb — **mantenuti** (usati in pagine/componenti).

La libreria era stata pianificata come design system atomic, ma il codice ha continuato
a usare custom markup inline per badge/button/card. Archiviamo i file mai wirati
e teniamo solo quelli realmente utilizzati.

## Altri componenti orfani
- `Steps.vue` — flow stepper mai usato
- `SfBreadcrumb.vue` (top-level) — duplicato di breadcrumb custom nelle singole pagine
- `Homepage/HomepageServizi.vue` — rimpiazzato da markup inline in `pages/index.vue`
- `consent/CookiePreferencesModal.vue` — sostituito da banner cookie base
- `admin/AdminPagination.vue` — admin usa paginazione inline custom
- `auth/AuthRegisterForm.vue` — form registrazione vive dentro AuthOverlayModal

## Come riattivare
`mv _archive/frontend-simplification-2026-04-20/components-orfani/{file}.vue nuxt-spedizionefacile-master/components/{subfolder}/`.
