/**
 * useAuthModal — thin wrapper retro-compat sullo store Pinia `authModalStore`.
 *
 * Lo state vive in `stores/authModalStore.js`, ispezionabile in Vue DevTools.
 * Questo composable mantiene l'API legacy (isOpen, selectedTab, redirectPath,
 * entryMode, openAuthModal, closeAuthModal, clearEntryMode) per non rompere
 * gli 8 caller esistenti durante la migrazione progressiva a Pinia.
 *
 * @typedef {'login' | 'register'} AuthModalTab
 * @typedef {'forgot' | null} AuthEntryMode
 * @typedef {{ redirect?: string, tab?: AuthModalTab, entryMode?: AuthEntryMode }} OpenAuthModalOptions
 */
import { storeToRefs } from 'pinia'
import { useAuthModalStore } from '~/stores/authModalStore'

export const useAuthModal = () => {
	const store = useAuthModalStore()
	const { isOpen, selectedTab, redirectPath, entryMode } = storeToRefs(store)

	return {
		isOpen,
		selectedTab,
		redirectPath,
		entryMode,
		openAuthModal: store.open,
		closeAuthModal: store.close,
		clearEntryMode: store.clearEntryMode,
	}
}
