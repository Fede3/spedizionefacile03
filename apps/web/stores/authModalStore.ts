/**
 * authModalStore — Pinia store per overlay autenticazione (login/register/forgot).
 *
 * Sostituisce il pattern useState() sparso in useAuthModal.js con uno store
 * unico ispezionabile in Vue DevTools. Il composable useAuthModal() resta
 * come thin wrapper retro-compat per i caller esistenti (8 file).
 */
import { defineStore } from 'pinia'

export type AuthModalTab = 'login' | 'register'
export type AuthEntryMode = 'forgot' | null

export interface AuthModalOpenOptions {
	tab?: AuthModalTab
	redirect?: string
	entryMode?: AuthEntryMode
}

const normalizeAuthRedirect = (redirect?: string): string => {
	if (!redirect || typeof redirect !== 'string') return '/'
	return redirect.startsWith('/') ? redirect : '/'
}

export const useAuthModalStore = defineStore('authModal', () => {
	const isOpen = ref(false)
	const selectedTab = ref<AuthModalTab>('login')
	const redirectPath = ref('/')
	const entryMode = ref<AuthEntryMode>(null)

	function open(options: AuthModalOpenOptions = {}): void {
		selectedTab.value = options.tab ?? 'login'
		redirectPath.value = normalizeAuthRedirect(options.redirect)
		entryMode.value = options.entryMode ?? null
		isOpen.value = true
	}

	function close(): void {
		isOpen.value = false
		entryMode.value = null
	}

	function clearEntryMode(): void {
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
