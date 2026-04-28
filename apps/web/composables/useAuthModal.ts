/**
 * useAuthModal — thin wrapper retro-compat sullo store Pinia `authModalStore`.
 *
 * Lo state vive in `stores/authModalStore.js`, ispezionabile in Vue DevTools.
 * Questo composable mantiene l'API legacy (isOpen, selectedTab, redirectPath,
 * entryMode, openAuthModal, closeAuthModal, clearEntryMode) per non rompere
 * gli 8 caller esistenti durante la migrazione progressiva a Pinia.
 */
import { storeToRefs } from 'pinia'
import { useAuthModalStore, type AuthModalTab, type AuthEntryMode } from '~/stores/authModalStore'

// Re-export tipi dallo store per i caller che importano da '~/composables/useAuthModal'
export type { AuthModalTab, AuthEntryMode }

export interface OpenAuthModalOptions {
	redirect?: string
	tab?: AuthModalTab
	entryMode?: AuthEntryMode
}

export const useAuthModal = () => {
	const store = useAuthModalStore()
	const { isOpen, selectedTab, redirectPath, entryMode } = storeToRefs(store)

	return {
		isOpen,
		selectedTab,
		redirectPath,
		entryMode,
		openAuthModal: store.open as (opts?: OpenAuthModalOptions) => void,
		closeAuthModal: store.close,
		clearEntryMode: store.clearEntryMode,
	}
}
