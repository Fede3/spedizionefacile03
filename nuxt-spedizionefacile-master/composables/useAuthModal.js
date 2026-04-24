/**
 * @typedef {'login' | 'register'} AuthModalTab
 * @typedef {'forgot' | null} AuthEntryMode
 * @typedef {{ redirect?: string, tab?: AuthModalTab, entryMode?: AuthEntryMode }} OpenAuthModalOptions
 */

const normalizeAuthRedirect = (redirect) => {
  if (!redirect || typeof redirect !== 'string') return '/'
  return redirect.startsWith('/') ? redirect : '/'
}

/** Composable per aprire/chiudere il modale di autenticazione con tab e redirect. */
export const useAuthModal = () => {
  const isOpen = useState('auth-modal-open', () => false)
  const selectedTab = useState('auth-modal-tab', () => 'login')
  const redirectPath = useState('auth-modal-redirect', () => '/')
  const entryMode = useState('auth-modal-entry-mode', () => null)

  const openAuthModal = (options = {}) => {
    selectedTab.value = options.tab ?? 'login'
    redirectPath.value = normalizeAuthRedirect(options.redirect)
    entryMode.value = options.entryMode ?? null
    isOpen.value = true
  }

  const closeAuthModal = () => {
    isOpen.value = false
    entryMode.value = null
  }

  const clearEntryMode = () => {
    entryMode.value = null
  }

  return {
    closeAuthModal,
    isOpen,
    openAuthModal,
    redirectPath,
    selectedTab,
    entryMode,
    clearEntryMode,
  }
}
