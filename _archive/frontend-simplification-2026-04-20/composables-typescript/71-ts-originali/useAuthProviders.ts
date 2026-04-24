export interface AuthProvidersAvailability {
  google: boolean
  facebook: boolean
  apple: boolean
}

const defaultProviders = (): AuthProvidersAvailability => ({
  google: false,
  facebook: false,
  apple: false,
})

export const useAuthProviders = () => {
  const providers = useState<AuthProvidersAvailability>('auth-providers', defaultProviders)
  const loaded = useState('auth-providers-loaded', () => false)
  const loading = useState('auth-providers-loading', () => false)

  const refreshAuthProviders = async () => {
    if (loading.value) return providers.value

    loading.value = true
    try {
      const response = await $fetch<Partial<AuthProvidersAvailability>>('/api/auth/providers')
      providers.value = {
        ...defaultProviders(),
        ...response,
      }
      loaded.value = true
    } catch {
      if (!loaded.value) {
        providers.value = defaultProviders()
      }
    } finally {
      loading.value = false
    }

    return providers.value
  }

  return {
    authProviders: providers,
    authProvidersLoaded: loaded,
    authProvidersLoading: loading,
    refreshAuthProviders,
  }
}
