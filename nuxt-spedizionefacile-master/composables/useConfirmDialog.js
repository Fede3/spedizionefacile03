/**
 * useConfirmDialog — thin wrapper retro-compat sullo store Pinia `confirmDialogStore`.
 *
 * State e logica vivono in `stores/confirmDialogStore.js`. Questo file mantiene
 * l'API legacy (state, isOpen, confirm, _resolve) per non rompere il componente
 * `<SfConfirmDialog />` che già la usa.
 *
 * @typedef {{ title: string, message?: string, confirmText?: string, cancelText?: string, tone?: 'default' | 'danger' }} ConfirmOptions
 */
import { storeToRefs } from 'pinia'
import { useConfirmDialogStore } from '~/stores/confirmDialogStore'

export function useConfirmDialog() {
	const store = useConfirmDialogStore()
	const { state, isOpen } = storeToRefs(store)

	return {
		state,
		isOpen,
		confirm: store.confirm,
		// Mantengo il vecchio nome `_resolve` per non rompere SfConfirmDialog.vue
		_resolve: store.resolveDialog,
	}
}
