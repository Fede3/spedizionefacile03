import { defineStore } from 'pinia'

type ConfirmTone = 'default' | 'danger' | 'warning'
type ConfirmState = {
	open: boolean
	title: string
	message: string
	confirmText: string
	cancelText: string
	tone: ConfirmTone
}
type ConfirmOptions = Partial<Omit<ConfirmState, 'open'>> & Pick<ConfirmState, 'title'>

const defaultState: ConfirmState = {
	open: false,
	title: '',
	message: '',
	confirmText: 'Conferma',
	cancelText: 'Annulla',
	tone: 'default',
}

let pendingResolve: ((value: boolean) => void) | null = null

export const useConfirmDialogStore = defineStore('confirmDialog', () => {
	const state = ref<ConfirmState>({ ...defaultState })
	const isOpen = computed(() => state.value.open)

	function confirm(opts: ConfirmOptions) {
		if (pendingResolve) {
			pendingResolve(false)
			pendingResolve = null
		}
		return new Promise<boolean>((resolve) => {
			pendingResolve = resolve
			state.value = {
				open: true,
				title: opts.title,
				message: opts.message ?? '',
				confirmText: opts.confirmText ?? 'Conferma',
				cancelText: opts.cancelText ?? 'Annulla',
				tone: opts.tone ?? 'default',
			}
		})
	}

	function resolveDialog(value: boolean) {
		if (pendingResolve) {
			pendingResolve(value)
			pendingResolve = null
		}
		state.value = { ...state.value, open: false }
	}

	return { state, isOpen, confirm, resolveDialog }
})
