/**
 * Plugin client-only: aggiunge `.is-hydrated` a <html> dopo il primo paint,
 * sbloccando le transizioni CSS (vedi main.css regola `html:not(.is-hydrated)`).
 *
 * Scopo: eliminare artefatti visivi durante l'hydration (classi che cambiano
 * provocano transizioni visibili prima che il layout sia stabile).
 */
export default defineNuxtPlugin({
  name: 'hydrated-class',
  enforce: 'pre',
  setup() {
    if (typeof window === 'undefined') return
    // Aggiungo subito e poi anche dopo rAF — la prima disattiva la regola
    // `html:not(.is-hydrated) * { transition: none }` appena il JS client parte.
    document.documentElement.classList.add('is-hydrated')
  },
})
