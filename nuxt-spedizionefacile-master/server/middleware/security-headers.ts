/**
 * Nitro Server Middleware: Security Headers
 *
 * Aggiunge intestazioni di sicurezza a TUTTE le risposte del frontend Nuxt.
 * Complementa il SecurityHeaders middleware di Laravel (che copre solo le API).
 *
 * Headers aggiunti:
 *   - X-Content-Type-Options: previene MIME sniffing
 *   - X-Frame-Options: previene clickjacking
 *   - X-XSS-Protection: protezione XSS del browser
 *   - Referrer-Policy: limita informazioni nel referer
 *   - Permissions-Policy: disabilita accesso a fotocamera/microfono
 *   - Strict-Transport-Security: forza HTTPS (solo se gia' su HTTPS)
 */
export default defineEventHandler((event) => {
  const headers = event.node.res

  headers.setHeader('X-Content-Type-Options', 'nosniff')
  headers.setHeader('X-Frame-Options', 'SAMEORIGIN')
  headers.setHeader('X-XSS-Protection', '1; mode=block')
  headers.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')

  // HSTS solo su connessioni HTTPS (in produzione dietro Cloudflare/proxy)
  const proto = event.node.req.headers['x-forwarded-proto']
  if (proto === 'https') {
    headers.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
})
