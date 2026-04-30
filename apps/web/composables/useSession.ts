type SessionOptions = {
	enabled?: boolean
	server?: boolean
	key?: string
	lazy?: boolean
	dedupe?: 'cancel' | 'defer'
}

export const useSession = (options: SessionOptions = {}) => {
	const enabled = options.enabled ?? true
	const server = options.server ?? false
	const key = options.key ?? 'session'
	const lazy = options.lazy ?? false
	const dedupe = options.dedupe ?? 'defer'

	if (import.meta.prerender || !enabled) {
		const session = ref(null)
		const status = ref('idle')
		const refresh = async () => session.value
		return { session, refresh, status }
	}

	const fetchOptions = {
		method: 'GET',
		key,
		server,
		lazy,
		dedupe,
	} as unknown as Parameters<typeof useSanctumFetch>[1]
	const { data: session, status, refresh } = useSanctumFetch('/api/session', fetchOptions)
	return { session, refresh, status }
}
