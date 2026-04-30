type CanonicalPath = string | (() => string) | { value?: unknown }
type CanonicalOptions = {
	path?: CanonicalPath
	keepParams?: string[]
	excludeParams?: string[]
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

export const useCanonical = (options: CanonicalOptions = {}) => {
	const route = useRoute()
	const runtimeConfig = useRuntimeConfig()
	const baseUrl = String(runtimeConfig.public?.siteUrl || 'https://spediamofacile.it').replace(/\/+$/, '')
	const resolvePath = () => {
		const path = options.path
		if (path == null) return route.path
		if (typeof path === 'string') return path
		if (typeof path === 'function') return path()
		return typeof path.value === 'string' ? path.value : route.path
	}

	const canonicalUrl = computed(() => {
		const rawPath = resolvePath()
		const path = rawPath === '/' ? '' : rawPath
		const cleanPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path
		const hasKeep = Boolean(options.keepParams?.length)
		const hasExclude = Boolean(options.excludeParams?.length)
		const params = new URLSearchParams()

		if (hasKeep || hasExclude) {
			const excludeList = hasExclude ? options.excludeParams || [] : DEFAULT_EXCLUDE
			for (const [key, raw] of Object.entries(route.query)) {
				if (hasKeep && !options.keepParams?.includes(key)) continue
				if (!hasKeep && excludeList.includes(key)) continue
				const value = Array.isArray(raw) ? raw[0] : raw
				if (typeof value === 'string' && value !== '') params.set(key, value)
			}
		}

		const query = params.toString()
		return `${baseUrl}${cleanPath}${query ? `?${query}` : ''}`
	})

	useHead({ link: [{ rel: 'canonical', href: canonicalUrl }] })
	return { canonicalUrl }
}
