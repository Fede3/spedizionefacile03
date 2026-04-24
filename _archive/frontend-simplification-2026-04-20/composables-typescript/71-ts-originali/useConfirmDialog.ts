import { computed } from 'vue';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger';
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

const defaultState: ConfirmState = {
  open: false,
  title: '',
  message: '',
  confirmText: 'Conferma',
  cancelText: 'Annulla',
  tone: 'default',
};

// Resolver vivo a livello modulo: il singolo dialogo può essere risolto
// solo da un'istanza alla volta (UX: niente confirm sovrapposti).
let pendingResolve: ((value: boolean) => void) | null = null;

export function useConfirmDialog() {
  const state = useState<ConfirmState>('sf-confirm-dialog', () => ({ ...defaultState }));

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    // Se c'è già un dialogo aperto, lo annulliamo (resolve(false))
    if (pendingResolve) {
      pendingResolve(false);
      pendingResolve = null;
    }
    return new Promise<boolean>((resolve) => {
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
  function _resolve(value: boolean) {
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
