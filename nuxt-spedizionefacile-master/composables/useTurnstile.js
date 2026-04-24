/**
 * useTurnstile — Helper per Cloudflare Turnstile CAPTCHA.
 *
 * Espone:
 *   - token: Ref<string> con il token emesso dal widget (watch-friendly)
 *   - isReady: Ref<boolean> true quando Turnstile ha emesso un token valido
 *   - onVerify: callback da passare a <NuxtTurnstile @success=...>
 *   - onExpire: callback da passare a <NuxtTurnstile @expired=...>
 *   - reset: azzera il token (post-submit o in caso di errore server)
 *   - verify(token): verifica lato client "stub" → il vero check e' lato backend
 *     con siteverify (TURNSTILE_SECRET_KEY). Qui restituiamo true se il token e'
 *     non vuoto, servendo da gate frontend-only quando il backend non verifica.
 *   - payload(): estrae il campo da inviare al backend come `cf_turnstile_token`
 *
 * Uso tipo:
 *   const turnstile = useTurnstile()
 *   <NuxtTurnstile v-model="turnstile.token.value" @success="turnstile.onVerify" />
 *   <button :disabled="!turnstile.isReady.value" @click="submit">Invia</button>
 *   // nel submit:
 *   await sanctum('/api/endpoint', { body: { ...form, ...turnstile.payload() } })
 */
export const useTurnstile = () => {
	const token = ref('')
	const lastError = ref(null)

	const isReady = computed(() => Boolean(token.value && token.value.length > 0))

	const onVerify = (t) => {
		token.value = typeof t === 'string' ? t : ''
		lastError.value = null
	}

	const onExpire = () => {
		token.value = ''
	}

	const onError = (err) => {
		token.value = ''
		lastError.value = typeof err === 'string' ? err : 'Errore CAPTCHA. Riprova.'
	}

	const reset = () => {
		token.value = ''
		lastError.value = null
	}

	/**
	 * Verifica "stub" lato client. In assenza di backend che validi siteverify,
	 * restituisce true appena il widget ha emesso un token non vuoto.
	 * In produzione IL BACKEND deve chiamare
	 * https://challenges.cloudflare.com/turnstile/v0/siteverify con TURNSTILE_SECRET_KEY.
	 */
	const verify = (t) => {
		const val = t ?? token.value
		return typeof val === 'string' && val.length > 0
	}

	/**
	 * Restituisce il payload da fondere con il body della POST.
	 * Nome campo standard: `cf_turnstile_token` (coerente con altri siti Laravel/Nuxt).
	 */
	const payload = () => {
		return token.value ? { cf_turnstile_token: token.value } : {}
	}

	return {
		token,
		isReady,
		lastError,
		onVerify,
		onExpire,
		onError,
		reset,
		verify,
		payload,
	}
}
