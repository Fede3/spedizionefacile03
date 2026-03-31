import { getRequestURL, proxyRequest } from 'h3'

const normalizeBase = (value: string) => value.replace(/\/$/, '')

const joinPath = (base: string, prefix: string, suffix?: string) => {
  const cleanBase = normalizeBase(base)
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '')
  const cleanSuffix = (suffix || '').replace(/^\/+/, '')

  return cleanSuffix
    ? `${cleanBase}/${cleanPrefix}/${cleanSuffix}`
    : `${cleanBase}/${cleanPrefix}`
}

const resolveDirectBackendBase = (apiBase: string) => {
  try {
    const url = new URL(apiBase)
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return null
    if (url.port !== '8787') return null
    url.port = '8000'
    return normalizeBase(url.toString())
  } catch {
    return null
  }
}

export const proxyToBackend = async (event: Parameters<typeof proxyRequest>[0], prefix: string) => {
  const config = useRuntimeConfig(event)
  const apiBase = normalizeBase(String(config.public.apiBase || 'http://127.0.0.1:8787'))
  const suffix = event.context.params?.path
  const search = getRequestURL(event).search || ''
  const directBackendBase = resolveDirectBackendBase(apiBase)
  const targets = [
    directBackendBase,
    apiBase,
  ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index)

  let lastError: unknown = null

  for (const base of targets) {
    const target = `${joinPath(base, prefix, suffix)}${search}`
    try {
      return await proxyRequest(event, target)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}
