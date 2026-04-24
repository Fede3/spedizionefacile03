export type AuthModalTab = 'login' | 'register'
export type AuthEntryMode = 'forgot' | null

interface OpenAuthModalOptions {
  redirect?: string
  tab?: AuthModalTab
  entryMode?: AuthEntryMode
}

const normalizeAuthRedirect = (redirect?: string) => {
  if (!redirect || typeof redirect !== 'string') return '/'
  return redirect.startsWith('/') ? redirect : '/'
}

export const useAuthModal = () => {
  const isOpen = useState('auth-modal-open', () => false)
  const selectedTab = useState<AuthModalTab>('auth-modal-tab', () => 'login')
  const redirectPath = useState('auth-modal-redirect', () => '/')
  const entryMode = useState<AuthEntryMode>('auth-modal-entry-mode', () => null)

  const openAuthModal = (options: OpenAuthModalOptions = {}) => {
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
