/**
 * PLUGIN CLIENT: pwa.client.ts (F09)
 *
 * Registra il service worker `/sw.js` solo:
 *   - in browser (`process.client` implicito via .client suffix)
 *   - se il browser supporta Service Worker
 *   - dopo il `load` event (per non rallentare il first paint)
 *
 * Il SW gestisce caching offline + push notifications.
 * Il composable `usePushNotifications` puo' poi chiedere il permesso e
 * registrare la subscription quando l'utente attiva il toggle.
 */

export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  // In dev, il SW genera spesso mismatch di idratazione perche' serve JS/HTML
  // stantii rispetto all'HMR: deregistriamo eventuali SW gia' presenti e
  // saltiamo la registrazione. In prod (import.meta.env.PROD) il SW resta
  // attivo per offline + push.
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});
    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    }
    return;
  }

  // Wait for full page load to avoid contention with first paint.
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // AutoUpdate: se trova una nuova versione del SW, lo attiva subito.
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((err) => {
        // Non bloccare l'app se il SW fallisce: log soft.
        // eslint-disable-next-line no-console
        console.warn('[PWA] registrazione service worker fallita:', err);
      });

    // Quando il controller cambia (nuovo SW attivo) -> reload soft.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
});
