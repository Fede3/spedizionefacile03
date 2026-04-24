import { sanitizeAuthRedirect } from '~/utils/authHelpers'

export type AuthOverlayTab = 'login' | 'register'

const isSameOrNestedPath = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`)

export const getRouteQueryValue = <T>(value: T | T[] | undefined | null): T | undefined =>
  Array.isArray(value) ? value[0] : value ?? undefined

export const normalizeAuthTab = (value: unknown): AuthOverlayTab =>
  value === 'register' || value === 'registrati' ? 'register' : 'login'

export const normalizeRequestedPath = (path?: string | null, fallback = '/') => {
  const sanitized = sanitizeAuthRedirect(path, fallback)
  return sanitized !== '/' && sanitized.endsWith('/') ? sanitized.slice(0, -1) : sanitized
}

export const resolveAuthOverlayHost = (requestedPath: string) => {
  if (isSameOrNestedPath(requestedPath, '/checkout')) return '/carrello'
  if (isSameOrNestedPath(requestedPath, '/account')) return '/'
  return requestedPath
}

export const buildAuthOverlayLocation = ({
  forgot = false,
  requestedPath,
  tab = 'login',
}: {
  forgot?: boolean
  requestedPath?: string | null
  tab?: AuthOverlayTab
}) => {
  const redirect = normalizeRequestedPath(requestedPath, '/')
  const path = resolveAuthOverlayHost(redirect)

  return {
    path,
    query: {
      ...(forgot ? { auth_forgot: '1' } : {}),
      auth_modal: tab,
      redirect,
    },
  }
}

export const buildLegacyAuthOverlayRedirect = (
  routeLike: { query?: Record<string, unknown> } | null | undefined,
  {
    defaultTab = 'login',
    allowRequestedMode = false,
    allowRequestedTab = false,
    forceForgot = false,
    fallbackPath = '/',
  }: {
    defaultTab?: AuthOverlayTab
    allowRequestedMode?: boolean
    allowRequestedTab?: boolean
    forceForgot?: boolean
    fallbackPath?: string
  } = {},
) => {
  const query = routeLike?.query || {}
  const requestedRedirect = getRouteQueryValue(query.redirect as string | string[] | undefined)
  const requestedMode = getRouteQueryValue(query.mode as string | string[] | undefined)
  const requestedTab = getRouteQueryValue(query.tab as string | string[] | undefined)

  const targetTab = allowRequestedMode && requestedMode === 'register'
    ? 'register'
    : allowRequestedTab
      ? normalizeAuthTab(requestedTab)
      : defaultTab

  return buildAuthOverlayLocation({
    forgot: forceForgot || (allowRequestedMode && requestedMode === 'forgot'),
    requestedPath: normalizeRequestedPath(requestedRedirect, fallbackPath),
    tab: targetTab,
  })
}
