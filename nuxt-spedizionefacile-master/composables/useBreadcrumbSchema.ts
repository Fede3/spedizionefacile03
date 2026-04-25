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
