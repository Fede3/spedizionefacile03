import { defineStore } from 'pinia'

export type AuthModalTab = 'login' | 'register' | 'forgot'
type AuthModalOptions = {
	tab?: AuthModalTab
	redirect?: string
	entryMode?: string | null
}

const normalizeAuthRedirect = (redirect?: string) =>
	redirect && redirect.startsWith('/') ? redirect : '/'

export const useAuthModalStore = defineStore('authModal', () => {
	const isOpen = ref(false)
	const selectedTab = ref<AuthModalTab>('login')
	const redirectPath = ref('/')
	const entryMode = ref<string | null>(null)

	function openAuthModal(options: AuthModalOptions = {}) {
		selectedTab.value = options.tab ?? 'login'
		redirectPath.value = normalizeAuthRedirect(options.redirect)
		entryMode.value = options.entryMode ?? null
		isOpen.value = true
	}
	function closeAuthModal() {
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
		openAuthModal,
		closeAuthModal,
		clearEntryMode,
	}
})
