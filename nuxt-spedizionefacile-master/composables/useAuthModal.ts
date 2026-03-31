export type AuthModalTab = 'login' | 'register'

interface OpenAuthModalOptions {
  redirect?: string
  tab?: AuthModalTab
}

const normalizeAuthRedirect = (redirect?: string) => {
  if (!redirect || typeof redirect !== 'string') return '/'
  return redirect.startsWith('/') ? redirect : '/'
}

export const useAuthModal = () => {
  const isOpen = useState('auth-modal-open', () => false)
  const selectedTab = useState<AuthModalTab>('auth-modal-tab', () => 'login')
  const redirectPath = useState('auth-modal-redirect', () => '/')

  const openAuthModal = (options: OpenAuthModalOptions = {}) => {
    selectedTab.value = options.tab ?? 'login'
    redirectPath.value = normalizeAuthRedirect(options.redirect)
    isOpen.value = true
  }

  const closeAuthModal = () => {
    isOpen.value = false
  }

  return {
    closeAuthModal,
    isOpen,
    openAuthModal,
    redirectPath,
    selectedTab,
  }
}
