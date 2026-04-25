/**
 * authModalStore — Pinia store per overlay autenticazione (login/register/forgot).
 *
 * Sostituisce il pattern useState() sparso in useAuthModal.js con uno store
 * unico ispezionabile in Vue DevTools. Il composable useAuthModal() resta
 * come thin wrapper retro-compat per i caller esistenti (8 file).
 */
import { defineStore } from 'pinia'

const normalizeAuthRedirect = (redirect) => {
	if (!redirect || typeof redirect !== 'string') return '/'
	return redirect.startsWith('/') ? redirect : '/'
}

export const useAuthModalStore = defineStore('authModal', () => {
	const isOpen = ref(false)
	const selectedTab = ref('login') // 'login' | 'register'
	const redirectPath = ref('/')
	const entryMode = ref(null) // 'forgot' | null

	function open(options = {}) {
		selectedTab.value = options.tab ?? 'login'
		redirectPath.value = normalizeAuthRedirect(options.redirect)
		entryMode.value = options.entryMode ?? null
		isOpen.value = true
	}

	function close() {
		isOpen.value = false
		entryMode.value = null
	}

	function clearEntryMode() {
		entryMode.value = null
	}

	return {
		isOpen,
		selectedTab,
		redirectPath,
		entryMode,
		open,
		close,
		clearEntryMode,
	}
})
