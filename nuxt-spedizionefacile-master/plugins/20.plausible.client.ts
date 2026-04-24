/**
 * Plausible Analytics (privacy-first).
 *
 * Perché Plausible e non GA4:
 *   - Zero PII, zero cookie, zero localStorage → NIENTE consent banner richiesto
 *     (art. 122 d.lgs. 196/2003 § "no-cookie analytics" + EDPB opinion 05/2020).
 *   - Script 1 KB vs ~60 KB di gtag → nessun impatto Lighthouse.
 *   - GDPR compliant out-of-the-box (server EU, hash IP-based session fingerprint).
 *
 * Attivazione:
 *   - Richiede `NUXT_PUBLIC_PLAUSIBLE_DOMAIN` nelle env. Senza quella var il
 *     plugin è un no-op completo: nessuno script iniettato, nessuna chiamata.
 *   - Per staging/dev conviene tenerla vuota così da non sporcare il dashboard.
 *
 * Custom events:
 *   - Il file `script.js` espone `window.plausible(event, { props })`. I nostri
 *     eventi funnel (`preventivo_start`, `payment_success`, ecc.) vengono
 *     inviati da `useFunnelAnalytics.ts`.
 *   - Il file alternativo `script.manual.js` serve per SPA: Nuxt 3 fa già
 *     history.pushState nativamente e il default `script.js` intercetta i
 *     cambi di route automaticamente, quindi non serve la variante manual.
 */
export default defineNuxtPlugin(() => {
	const config = useRuntimeConfig()
	const domain = String(config.public.plausibleDomain || '').trim()
	if (!domain) {
		// Nessuna configurazione: no-op totale. In dev locale questo è il default.
		return
	}

	// Guard: non iniettare più volte se il plugin viene rieseguito per errore
	// (es. navigazione client-side con HMR attivo).
	if (typeof document === 'undefined' || document.querySelector('script[data-plausible-injected]')) {
		return
	}

	const script = document.createElement('script')
	script.defer = true
	script.setAttribute('data-domain', domain)
	script.setAttribute('data-plausible-injected', 'true')
	script.src = 'https://plausible.io/js/script.js'
	document.head.appendChild(script)

	// Stub sincrono: permette di chiamare `window.plausible(...)` prima che lo
	// script abbia caricato. Le chiamate vengono messe in coda (`q`) e lo
	// script ufficiale le replaya al load. Pattern consigliato nei docs Plausible.
	if (typeof window !== 'undefined' && !window.plausible) {
		const queue: unknown[] = []
		const stub = ((...args: unknown[]) => {
			queue.push(args)
		}) as NonNullable<Window['plausible']>
		stub.q = queue
		window.plausible = stub
	}
})
