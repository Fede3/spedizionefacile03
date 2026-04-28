/**
 * useConfirmDialog — thin wrapper retro-compat sullo store Pinia `confirmDialogStore`.
 *
 * State e logica vivono in `stores/confirmDialogStore.js`. Questo file mantiene
 * l'API legacy (state, isOpen, confirm, _resolve) per non rompere il componente
 * `<SfConfirmDialog />` che gia' la usa.
 */
import { storeToRefs } from 'pinia'
import { useConfirmDialogStore, type ConfirmOptions } from '~/stores/confirmDialogStore'

// Re-export tipo per i caller che importano da '~/composables/useConfirmDialog'
export type { ConfirmOptions }

export function useConfirmDialog() {
	const store = useConfirmDialogStore()
	const { state, isOpen } = storeToRefs(store)

	return {
		state,
		isOpen,
		confirm: store.confirm as (options: ConfirmOptions) => Promise<boolean>,
		// Mantengo il vecchio nome `_resolve` per non rompere SfConfirmDialog.vue
		_resolve: store.resolveDialog,
	}
}
