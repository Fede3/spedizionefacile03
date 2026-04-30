export const buildSiteSchema = (overrideBaseUrl?: string) => {
	const runtimeConfig = useRuntimeConfig()
	const baseUrl = (overrideBaseUrl || String(runtimeConfig.public?.siteUrl || 'https://spediamofacile.it')).replace(/\/+$/, '')
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
		contactPoint: [{
			'@type': 'ContactPoint',
			contactType: 'customer service',
			areaServed: 'IT',
			availableLanguage: ['it', 'en'],
			url: `${baseUrl}/contatti`,
		}],
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

export const useSiteSchema = () => {
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
