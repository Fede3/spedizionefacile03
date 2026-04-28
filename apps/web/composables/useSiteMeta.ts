/**
 * useSiteMeta — aggregatore SEO/meta minori.
 *
 * Consolida 4 helper che storicamente vivevano in file separati:
 *   - useShellRouteState  → flag route per scegliere shell/hero
 *   - useCanonical        → rel="canonical" coerente
 *   - useBreadcrumbSchema → JSON-LD BreadcrumbList
 *   - useSiteSchema       → JSON-LD Organization + WebSite
 *
 * I 4 nomi originali sono ri-esportati a fine file per retro-compatibilita'
 * con i caller esistenti (auto-import Nuxt). La logica e' identica a prima:
 * questa fusione e' puramente strutturale per ridurre il numero di
 * composable senza alterare comportamento ne' API pubblica.
 */

import type { ComputedRef, Ref } from 'vue'

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 1 — useShellRouteState
// ─────────────────────────────────────────────────────────────────────────────

const AUTH_PAGE_PREFIXES = ['/autenticazione', '/login', '/registrazione', '/recupera-password', '/aggiorna-password', '/verifica-email']
const AUTH_MINIMAL_SHELL_PREFIXES = ['/recupera-password', '/aggiorna-password']
const QUOTE_FLOW_PREFIXES = ['/preventivo', '/la-tua-spedizione', '/riepilogo', '/checkout', '/carrello']
const STANDALONE_MARKETING_HERO_PREFIXES = ['/servizi', '/guide', '/contatti', '/chi-siamo', '/faq']

const startsWithAny = (path: string, prefixes: string[]): boolean =>
	prefixes.some((prefix) => path.startsWith(prefix))

interface ShellRouteState {
	isAccountRoute: ComputedRef<boolean>
	isAuthMinimalShellRoute: ComputedRef<boolean>
	isAuthPageRoute: ComputedRef<boolean>
	isHomepageLikeRoute: ComputedRef<boolean>
	isPreventivoRoute: ComputedRef<boolean>
	isQuoteFlowRoute: ComputedRef<boolean>
	isStandaloneMarketingHeroRoute: ComputedRef<boolean>
}

/**
 * Computed flags che classificano la route corrente per decidere quale shell/hero mostrare.
 */
export const useShellRouteState = (): ShellRouteState => {
	const route = useRoute()

	const isAuthPageRoute = computed(() => startsWithAny(route.path, AUTH_PAGE_PREFIXES))
	const isAuthMinimalShellRoute = computed(() => startsWithAny(route.path, AUTH_MINIMAL_SHELL_PREFIXES))
	const isAccountRoute = computed(() => route.path.startsWith('/account'))
	const isQuoteFlowRoute = computed(() => startsWithAny(route.path, QUOTE_FLOW_PREFIXES))
	const isHomepageLikeRoute = computed(() => route.path === '/' || route.path === '/preview/home-hero')
	const isPreventivoRoute = computed(() => route.path === '/preventivo' || route.path.startsWith('/preventivo/'))
	const isStandaloneMarketingHeroRoute = computed(() => startsWithAny(route.path, STANDALONE_MARKETING_HERO_PREFIXES))

	return {
		isAccountRoute,
		isAuthMinimalShellRoute,
		isAuthPageRoute,
		isHomepageLikeRoute,
		isPreventivoRoute,
		isQuoteFlowRoute,
		isStandaloneMarketingHeroRoute,
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 2 — useCanonical
// ─────────────────────────────────────────────────────────────────────────────

type PathProvider = string | (() => string) | Ref<string>

interface UseCanonicalOptions {
	path?: PathProvider
	keepParams?: string[]
	excludeParams?: string[]
}

interface UseCanonicalReturn {
	canonicalUrl: ComputedRef<string>
}

const DEFAULT_EXCLUDE = [
	'ref',
	'utm_source',
	'utm_medium',
	'utm_campaign',
	'utm_term',
	'utm_content',
	'fbclid',
	'gclid',
	'mc_cid',
	'mc_eid',
]

/**
 * Imposta rel="canonical" con URL assoluto coerente (no trailing slash, query canonicalizzata).
 *
 * OPZIONI:
 *  - path: override del percorso (utile per pagine dinamiche con slug risolto lato API)
 *  - keepParams: lista di query params SEO-relevant da preservare (default: [])
 *    Esempio: keepParams: ['page'] per paginazione elenchi articoli
 *  - excludeParams: lista esplicita di param da rimuovere (default UTM/tracking)
 *    Usato solo se keepParams non e' passato — quando keepParams e' definito,
 *    tutti gli altri param vengono strippati per default.
 *
 * CONVENZIONI:
 *  - URL sempre assoluto (https://spediamofacile.it/...)
 *  - Nessun trailing slash (tranne root '/')
 *  - Canonical stesso URL anche per og:url (gestito a livello di useSeoMeta)
 */
export const useCanonical = (options: UseCanonicalOptions = {}): UseCanonicalReturn => {
	const route = useRoute()
	const runtimeConfig = useRuntimeConfig()

	const baseUrl = (runtimeConfig.public?.siteUrl as string) || 'https://spediamofacile.it'

	const resolvePath = (): string => {
		const p = options.path
		if (p == null) return route.path
		if (typeof p === 'string') return p
		if (typeof p === 'function') return p()
		if (typeof (p as Ref<string>).value === 'string') return (p as Ref<string>).value
		return route.path
	}

	const canonicalUrl = computed(() => {
		const rawPath = resolvePath()
		const path = rawPath === '/' ? '' : rawPath
		const cleanPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path

		let query = ''
		const hasKeep = Array.isArray(options.keepParams) && options.keepParams.length > 0
		const hasExclude = Array.isArray(options.excludeParams) && options.excludeParams.length > 0

		if (hasKeep || hasExclude) {
			const params = new URLSearchParams()
			const excludeList = hasExclude ? options.excludeParams! : DEFAULT_EXCLUDE

			for (const [key, raw] of Object.entries(route.query)) {
				if (hasKeep && !options.keepParams!.includes(key)) continue
				if (!hasKeep && excludeList.includes(key)) continue
				if (raw == null) continue

				const value = Array.isArray(raw) ? raw[0] : raw
				if (typeof value === 'string' && value !== '') {
					params.set(key, value)
				}
			}

			const qs = params.toString()
			if (qs) query = `?${qs}`
		}

		return `${baseUrl}${cleanPath}${query}`
	})

	useHead({
		link: [
			{ rel: 'canonical', href: canonicalUrl },
		],
	})

	return { canonicalUrl }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 3 — useBreadcrumbSchema
// ─────────────────────────────────────────────────────────────────────────────

interface BreadcrumbItem {
	name: string
	url?: string
}

interface BreadcrumbListItem {
	'@type': 'ListItem'
	position: number
	name: string
	item?: string
}

/**
 * Inietta uno schema.org BreadcrumbList nell'head della pagina a partire da una lista di item.
 */
export const useBreadcrumbSchema = (items: BreadcrumbItem[]): void => {
	if (!Array.isArray(items) || items.length === 0) return

	const runtimeConfig = useRuntimeConfig()
	const baseUrl = String(
		runtimeConfig.public?.siteUrl || 'https://spediamofacile.it',
	).replace(/\/+$/, '')

	const resolveUrl = (url?: string): string | undefined => {
		if (!url) return undefined
		if (/^https?:\/\//i.test(url)) return url
		const clean = url.startsWith('/') ? url : `/${url}`
		return `${baseUrl}${clean === '/' ? '' : clean}`
	}

	const schema = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index): BreadcrumbListItem => {
			const element: BreadcrumbListItem = {
				'@type': 'ListItem',
				position: index + 1,
				name: item.name,
			}
			const resolved = resolveUrl(item.url)
			if (resolved) element.item = resolved
			return element
		}),
	}

	// P9: useSchemaOrg wrapper rimosso — inline useHead direttamente.
	useHead({
		script: [{
			key: 'breadcrumb-schema-0',
			type: 'application/ld+json',
			innerHTML: JSON.stringify(schema),
		}],
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 4 — useSiteSchema (Organization + WebSite)
// Vincolo: non inserire dati inventati nello schema (rating, recensioni,
// indirizzi reali) — solo fatti verificabili.
// ─────────────────────────────────────────────────────────────────────────────

interface SiteSchemaBundle {
	organizationSchema: Record<string, unknown>
	websiteSchema: Record<string, unknown>
}

/**
 * Costruisce gli oggetti JSON-LD senza iniettarli nell'head.
 * Esposto separatamente per riuso in test o pagine che vogliono comporre
 * altri schema (es. BreadcrumbList) accanto ai globali.
 */
export const buildSiteSchema = (overrideBaseUrl?: string): SiteSchemaBundle => {
	const runtimeConfig = useRuntimeConfig()
	const baseUrl = (
		overrideBaseUrl
		|| (runtimeConfig.public?.siteUrl as string)
		|| 'https://spediamofacile.it'
	).replace(/\/+$/, '')

	const organizationSchema = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		'@id': `${baseUrl}/#organization`,
		name: 'SpediamoFacile',
		url: baseUrl,
		logo: {
			'@type': 'ImageObject',
			url: `${baseUrl}/img/logo.svg`,
		},
		contactPoint: [
			{
				'@type': 'ContactPoint',
				contactType: 'customer service',
				areaServed: 'IT',
				availableLanguage: ['it', 'en'],
				url: `${baseUrl}/contatti`,
			},
		],
		// sameAs: profili ufficiali. Mantenere solo URL realmente attivi —
		// Google verifica e penalizza riferimenti morti.
		sameAs: [
			'https://www.facebook.com/spedizionefacile',
			'https://www.instagram.com/spedizionefacile',
			'https://www.linkedin.com/company/spedizionefacile',
		],
	}

	const websiteSchema = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		'@id': `${baseUrl}/#website`,
		url: baseUrl,
		name: 'SpediamoFacile',
		inLanguage: 'it-IT',
		publisher: { '@id': `${baseUrl}/#organization` },
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${baseUrl}/faq?q={search_term_string}`,
			},
			'query-input': 'required name=search_term_string',
		},
	}

	return { organizationSchema, websiteSchema }
}

/**
 * Inietta Organization + WebSite schema nell'head come due script JSON-LD distinti
 * (Google indicizza meglio entita' separate vs un singolo @graph aggregato).
 */
export const useSiteSchema = (): SiteSchemaBundle => {
	const bundle = buildSiteSchema()

	useHead({
		script: [
			{
				key: 'site-schema-organization',
				type: 'application/ld+json',
				innerHTML: JSON.stringify(bundle.organizationSchema),
			},
			{
				key: 'site-schema-website',
				type: 'application/ld+json',
				innerHTML: JSON.stringify(bundle.websiteSchema),
			},
		],
	})

	return bundle
}
