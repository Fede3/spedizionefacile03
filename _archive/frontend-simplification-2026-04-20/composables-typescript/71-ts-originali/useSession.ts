import type { Ref } from 'vue'

interface UseSessionOptions {
	enabled?: boolean
	server?: boolean
	key?: string
	lazy?: boolean
	dedupe?: 'cancel' | 'defer'
}

interface UseSessionReturn {
	session: Ref<unknown>
	refresh: () => Promise<unknown>
	status: Ref<'idle' | 'pending' | 'success' | 'error'>
}

export const useSession = (options: UseSessionOptions = {}): UseSessionReturn => {
	const enabled = options?.enabled ?? true
	const server = options?.server ?? false
	const key = options?.key ?? 'session'
	const lazy = options?.lazy ?? false
	const dedupe = options?.dedupe ?? 'defer'

	if (import.meta.prerender) {
		const session = ref<unknown>(null)
		const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
		const refresh = async () => session.value
		return { session, refresh, status }
	}

	if (!enabled) {
		const session = ref<unknown>(null)
		const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
		const refresh = async () => session.value
		return { session, refresh, status }
	}

	const {
		data: session,
		status,
		refresh,
	} = useSanctumFetch(
		'/api/session',
		{
			method: 'GET',
			server,
			lazy,
			dedupe,
		} as Record<string, unknown>,
	)

	void key
	return { session, refresh, status } as UseSessionReturn
}
