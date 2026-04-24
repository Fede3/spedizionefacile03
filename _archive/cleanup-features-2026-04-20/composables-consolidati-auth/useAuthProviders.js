/**
 * @typedef {{ google: boolean, facebook: boolean, apple: boolean }} AuthProvidersAvailability
 */

const defaultProviders = () => ({
  google: false,
  facebook: false,
  apple: false,
})

/** Composable che tiene traccia della disponibilità dei provider social (Google/Facebook/Apple). */
export const useAuthProviders = () => {
  const providers = useState('auth-providers', defaultProviders)
  const loaded = useState('auth-providers-loaded', () => false)
  const loading = useState('auth-providers-loading', () => false)

  const refreshAuthProviders = async () => {
    if (loading.value) return providers.value

    loading.value = true
    try {
      const response = await $fetch('/api/auth/providers')
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
