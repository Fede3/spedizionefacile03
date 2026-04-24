import { computed } from 'vue';

/**
 * @typedef {{ title: string, message?: string, confirmText?: string, cancelText?: string, tone?: 'default' | 'danger' }} ConfirmOptions
 * @typedef {ConfirmOptions & { open: boolean }} ConfirmState
 */

/** @type {ConfirmState} */
const defaultState = {
  open: false,
  title: '',
  message: '',
  confirmText: 'Conferma',
  cancelText: 'Annulla',
  tone: 'default',
};

// Resolver vivo a livello modulo: il singolo dialogo può essere risolto
// solo da un'istanza alla volta (UX: niente confirm sovrapposti).
/** @type {((value: boolean) => void) | null} */
let pendingResolve = null;

/** Composable confirm dialog globale (promise-based, singola istanza attiva). */
export function useConfirmDialog() {
  const state = useState('sf-confirm-dialog', () => ({ ...defaultState }));

  /**
   * @param {ConfirmOptions} opts
   * @returns {Promise<boolean>}
   */
  function confirm(opts) {
    // Se c'è già un dialogo aperto, lo annulliamo (resolve(false))
    if (pendingResolve) {
      pendingResolve(false);
      pendingResolve = null;
    }
    return new Promise((resolve) => {
      pendingResolve = resolve;
      state.value = {
        open: true,
        title: opts.title,
        message: opts.message ?? '',
        confirmText: opts.confirmText ?? 'Conferma',
        cancelText: opts.cancelText ?? 'Annulla',
        tone: opts.tone ?? 'default',
      };
    });
  }

  // Helper interno usato da <SfConfirmDialog /> per chiudere e restituire
  /** @param {boolean} value */
  function _resolve(value) {
    if (pendingResolve) {
      pendingResolve(value);
      pendingResolve = null;
    }
    state.value = { ...state.value, open: false };
  }

  const isOpen = computed(() => state.value.open);

  return {
    state,
    isOpen,
    confirm,
    _resolve,
  };
}
