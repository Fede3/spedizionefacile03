type BreadcrumbItem = {
	name: string
	url?: string | null
}

type BreadcrumbSchemaItem = {
	'@type': 'ListItem'
	position: number
	name: string
	item?: string
}

export const useBreadcrumbSchema = (items: BreadcrumbItem[]) => {
	if (!Array.isArray(items) || items.length === 0) return

	const runtimeConfig = useRuntimeConfig()
	const baseUrl = String(runtimeConfig.public?.siteUrl || 'https://spediamofacile.it').replace(/\/+$/, '')
	const resolveUrl = (url?: string | null): string | undefined => {
		if (!url) return undefined
		if (/^https?:\/\//i.test(url)) return url
		const clean = url.startsWith('/') ? url : `/${url}`
		return `${baseUrl}${clean === '/' ? '' : clean}`
	}

	const schema = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index): BreadcrumbSchemaItem => {
			const element: BreadcrumbSchemaItem = {
				'@type': 'ListItem',
				position: index + 1,
				name: item.name,
			}
			const resolved = resolveUrl(item.url)
			if (resolved) element.item = resolved
			return element
		}),
	}

	useHead({
		script: [{
			key: 'breadcrumb-schema-0',
			type: 'application/ld+json',
			innerHTML: JSON.stringify(schema),
		}],
	})
}
