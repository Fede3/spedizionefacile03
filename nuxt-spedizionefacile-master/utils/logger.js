// utils/logger.js — Logger centralizzato per errori non-fatali.
//
// Scopo: rimpiazzare silent try/catch `try { ... } catch { /* empty */ }`
// con log contestuali coerenti sitewide.
//
// Uso:
//   import { logError, logWarn } from '~/utils/logger'
//   try { ... } catch (err) { logError('useCart.refresh', err) }
//
// In dev: console.error con prefisso [context].
// In prod: silent (o hook a Sentry se configurato).

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV

/**
 * Logga un errore con contesto leggibile.
 *
 * @param {string} context - Tag del chiamante (es. 'useCart.refresh')
 * @param {unknown} error  - Eccezione o valore catturato
 * @param {Object} [extra] - Dati addizionali (orderId, userId, ecc.)
 */
export function logError(context, error, extra) {
	if (!isDev) return
	const msg = error?.message || String(error || 'unknown')
	// eslint-disable-next-line no-console
	console.error(`[${context}]`, msg, extra || '')
}

/**
 * Logga un warning (non-blocking) con contesto.
 *
 * @param {string} context
 * @param {string} message
 * @param {Object} [extra]
 */
export function logWarn(context, message, extra) {
	if (!isDev) return
	// eslint-disable-next-line no-console
	console.warn(`[${context}]`, message, extra || '')
}

/**
 * Wrapper per Promise con log automatico in caso di errore.
 * Non blocca: ritorna la promise originale.
 *
 * @template T
 * @param {string} context
 * @param {Promise<T>} promise
 * @returns {Promise<T>}
 */
export function withLog(context, promise) {
	return promise.catch((err) => {
		logError(context, err)
		throw err
	})
}
