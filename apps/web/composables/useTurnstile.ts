export const useTurnstile = () => {
	const token = ref('')
	const lastError = ref<string | null>(null)
	const isReady = computed(() => Boolean(token.value && token.value.length > 0))

	const onVerify = (value: unknown) => {
		token.value = typeof value === 'string' ? value : ''
		lastError.value = null
	}
	const onExpire = () => {
		token.value = ''
	}
	const onError = (error: unknown) => {
		token.value = ''
		lastError.value = typeof error === 'string' ? error : 'Errore CAPTCHA. Riprova.'
	}
	const reset = () => {
		token.value = ''
		lastError.value = null
	}
	const verify = (value?: unknown) => {
		const candidate = value ?? token.value
		return typeof candidate === 'string' && candidate.length > 0
	}
	const payload = () => token.value ? { cf_turnstile_token: token.value } : {}

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
