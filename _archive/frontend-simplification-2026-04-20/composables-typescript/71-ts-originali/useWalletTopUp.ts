/**
 * composables/useWalletTopUp.ts
 * Stripe setup, card form lifecycle, top-up payment logic for wallet recharge.
 */
import type { Ref } from 'vue'
import { translateStripeError } from '~/utils/stripeErrors'

interface WalletTopUpProps {
	stripeConfigured?: boolean
	defaultPaymentMethod?: { card?: { id?: string } } | null
}

type EmitFn = (event: string, ...args: unknown[]) => void

interface StripeError {
	code?: string
	message?: string
}

interface StripeInstance {
	elements: () => StripeElements
	confirmCardSetup: (secret: string, opts: Record<string, unknown>) => Promise<{ setupIntent?: { payment_method?: string }; error?: StripeError }>
}

interface StripeElements {
	create: (type: string, opts?: Record<string, unknown>) => StripeElement
}

interface StripeElement {
	mount: (selector: string) => void
	unmount: () => void
}

export function useWalletTopUp(props: WalletTopUpProps, emit: EmitFn) {
	const { user, refreshIdentity } = useSanctumAuth()
	const sanctum = useSanctumClient()
	const runtimeConfig = useRuntimeConfig()

	const stripePublishableKey = ref('')
	const stripeReady = ref(false)
	const stripeLoading = ref(false)
	let stripe: StripeInstance | null = null

	const isValidKey = (v: unknown): boolean => {
		const k = String(v || '').trim()
		return k.startsWith('pk_') && !k.includes('placeholder')
	}

	const topUpAmount = ref<string | number>('')
	const isLoading = ref(false)
	const message = ref<string | null>(null)
	const messageType = ref<'success' | 'error'>('success')
	const topUpAttemptKey = ref('')
	const topUpAttemptSignature = ref('')
	const presetAmounts = [5, 10, 20, 50]

	const showNewCardForm = ref(false)
	const isPreparingNewCardForm = ref(false)
	const cardHolderName = ref('')
	const setupClientSecret = ref<string | null>(null)
	const elements: Ref<StripeElements | null> = ref(null)
	const cardNumber: Ref<StripeElement | null> = ref(null)
	const cardExpiry: Ref<StripeElement | null> = ref(null)
	const cardCvc: Ref<StripeElement | null> = ref(null)
	const cardError = ref<string | null>(null)

	const stripeErrorMsg = (err: StripeError | null | undefined): string =>
		translateStripeError(err, 'Errore durante il salvataggio della carta. Riprova.')

	const setFeedback = (msg: string, type: 'success' | 'error' = 'error'): void => {
		message.value = msg
		messageType.value = type
		setTimeout(() => { message.value = null }, 5000)
	}

	const makeTopUpAttemptKey = (): string => {
		const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
		const suffix = cryptoApi?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
		return `wallet-topup-${suffix}`
	}

	const resolveTopUpAttemptKey = (amount: unknown, paymentMethodId: string | null): string => {
		const signature = `${Number(amount).toFixed(2)}:${String(paymentMethodId || '')}`
		if (!topUpAttemptKey.value || topUpAttemptSignature.value !== signature) {
			topUpAttemptSignature.value = signature
			topUpAttemptKey.value = makeTopUpAttemptKey()
		}
		return topUpAttemptKey.value
	}

	const resetTopUpAttemptKey = (): void => {
		topUpAttemptKey.value = ''
		topUpAttemptSignature.value = ''
	}

	const unmountCardElements = (): void => {
		cardNumber.value?.unmount()
		cardExpiry.value?.unmount()
		cardCvc.value?.unmount()
		cardNumber.value = null
		cardExpiry.value = null
		cardCvc.value = null
		elements.value = null
	}

	const clearNewCardForm = (): void => {
		cardHolderName.value = ''
		setupClientSecret.value = null
		cardError.value = null
		unmountCardElements()
	}

	const ensureStripeLoaded = async (): Promise<boolean> => {
		if (stripeReady.value && stripe) return true
		if (!props.stripeConfigured || stripeLoading.value) return false

		stripeLoading.value = true
		try {
			const { loadStripe } = await import('@stripe/stripe-js')
			if (!stripePublishableKey.value) {
				try {
					const cfg = await sanctum<{ publishable_key?: string }>('/api/settings/stripe')
					const k = String(cfg?.publishable_key || '').trim()
					stripePublishableKey.value = isValidKey(k) ? k : ''
				} catch {
					/* fallback below */
				}
				if (!stripePublishableKey.value) {
					const fb = String((runtimeConfig.public as { stripeKey?: string }).stripeKey || '').trim()
					stripePublishableKey.value = isValidKey(fb) ? fb : ''
				}
			}
			if (!stripePublishableKey.value) {
				cardError.value = 'Chiave Stripe non disponibile. Ricarica la pagina.'
				stripeReady.value = false
				return false
			}
			stripe = (await loadStripe(stripePublishableKey.value)) as unknown as StripeInstance | null
			stripeReady.value = Boolean(stripe)
			return stripeReady.value
		} catch {
			stripeReady.value = false
			cardError.value = 'Impossibile caricare Stripe. Ricarica la pagina e riprova.'
			return false
		} finally {
			stripeLoading.value = false
		}
	}

	const mountNewCardFields = async (): Promise<void> => {
		if (!stripe || !showNewCardForm.value) return
		await nextTick()
		elements.value = stripe.elements()
		const style = {
			base: {
				color: '#252B42',
				fontFamily: '"Inter", sans-serif',
				fontSize: '15px',
				fontWeight: '400',
				'::placeholder': { color: '#a0a0a0' },
			},
			invalid: { color: '#dc2626' },
		}
		cardNumber.value = elements.value.create('cardNumber', { style, placeholder: '1234 5678 9012 3456' })
		cardNumber.value.mount('#wallet-card-number')
		cardExpiry.value = elements.value.create('cardExpiry', { style })
		cardExpiry.value.mount('#wallet-card-expiry')
		cardCvc.value = elements.value.create('cardCvc', { style, placeholder: '123' })
		cardCvc.value.mount('#wallet-card-cvc')
	}

	const openNewCardForm = async (): Promise<void> => {
		if (!props.stripeConfigured) {
			setFeedback('Le ricariche con carta non sono ancora attive su questo sito.')
			return
		}
		cardError.value = null
		message.value = null
		showNewCardForm.value = true
		isPreparingNewCardForm.value = true
		clearNewCardForm()
		const u = user.value as { name?: string; surname?: string } | null
		cardHolderName.value = [u?.name, u?.surname].filter(Boolean).join(' ').trim()

		if (!(await ensureStripeLoaded())) {
			isPreparingNewCardForm.value = false
			return
		}

		try {
			const res = await sanctum<{ client_secret?: string; error?: string }>('/api/stripe/create-setup-intent', { method: 'POST' })
			if (!res?.client_secret) {
				cardError.value = res?.error || 'Impossibile inizializzare il modulo carta. Riprova.'
				return
			}
			setupClientSecret.value = res.client_secret
			await mountNewCardFields()
		} catch (err: unknown) {
			const e = err as { data?: { error?: string; message?: string }; message?: string }
			cardError.value = e?.data?.error || e?.data?.message || e?.message || 'Errore di connessione al sistema di pagamento.'
		} finally {
			isPreparingNewCardForm.value = false
		}
	}

	const closeNewCardForm = (): void => {
		showNewCardForm.value = false
		clearNewCardForm()
	}

	const saveNewCardAndGetPaymentMethodId = async (): Promise<string | null> => {
		if (!setupClientSecret.value) {
			cardError.value = 'Impossibile inizializzare il modulo carta. Riprova.'
			return null
		}
		if (!cardHolderName.value.trim()) {
			cardError.value = 'Inserisci il nome del titolare della carta.'
			return null
		}
		if (!(await ensureStripeLoaded()) || !stripe) {
			cardError.value = 'Stripe non disponibile. Ricarica la pagina e riprova.'
			return null
		}

		const { setupIntent, error } = await stripe.confirmCardSetup(setupClientSecret.value, {
			payment_method: { card: cardNumber.value, billing_details: { name: cardHolderName.value.trim() } },
		})
		if (error) {
			cardError.value = stripeErrorMsg(error)
			return null
		}
		if (!setupIntent?.payment_method) {
			cardError.value = 'Metodo di pagamento non trovato. Riprova.'
			return null
		}

		const srv = await sanctum<{ error?: string }>('/api/stripe/set-default-payment-method', {
			method: 'POST',
			body: { payment_method: setupIntent.payment_method },
		})
		if (srv?.error) {
			cardError.value = srv.error || 'Errore durante il salvataggio della carta.'
			return null
		}

		await refreshIdentity()
		emit('paymentMethodUpdated')
		closeNewCardForm()
		return setupIntent.payment_method
	}

	const canSubmitTopUp = computed(() => {
		const amt = Number(topUpAmount.value)
		if (isLoading.value || !props.stripeConfigured || amt < 1) return false
		if (showNewCardForm.value) return Boolean(setupClientSecret.value && cardHolderName.value.trim())
		return Boolean(props.defaultPaymentMethod?.card)
	})

	const topUpButtonLabel = computed(() => {
		if (isLoading.value) return 'Elaborazione in corso...'
		const suffix = topUpAmount.value ? ` \u20AC${Number(topUpAmount.value).toFixed(2)}` : ''
		if (showNewCardForm.value) return `Salva carta e ricarica${suffix}`
		if (!props.defaultPaymentMethod?.card) return 'Aggiungi una carta per ricaricare'
		return `Ricarica${suffix}`
	})

	const handleTopUp = async (): Promise<void> => {
		if (!topUpAmount.value || Number(topUpAmount.value) < 1) {
			setFeedback('Inserisci un importo minimo di 1,00 EUR')
			return
		}
		if (!props.stripeConfigured) {
			setFeedback('Le ricariche con carta non sono ancora attive su questo sito.')
			return
		}

		isLoading.value = true
		message.value = null
		cardError.value = null

		try {
			let pmId = props.defaultPaymentMethod?.card?.id || null
			if (showNewCardForm.value || !pmId) pmId = await saveNewCardAndGetPaymentMethodId()
			if (!pmId) {
				setFeedback('Aggiungi e salva una carta valida per completare la ricarica.')
				return
			}
			const idempotencyKey = resolveTopUpAttemptKey(topUpAmount.value, pmId)

			const result = await sanctum<{ success?: boolean; message?: string }>('/api/wallet/top-up', {
				method: 'POST',
				body: {
					amount: Number(topUpAmount.value),
					payment_method_id: pmId,
					idempotency_key: idempotencyKey,
				},
			})

			if (result?.success) {
				setFeedback(`Ricarica di \u20AC${Number(topUpAmount.value).toFixed(2)} completata!`, 'success')
				topUpAmount.value = ''
				resetTopUpAttemptKey()
				emit('topUpSuccess')
			} else {
				setFeedback(result?.message || 'Errore durante la ricarica.')
			}
		} catch (e: unknown) {
			const err = e as { response?: { _data?: { message?: string } }; data?: { message?: string } }
			setFeedback(err?.response?._data?.message || err?.data?.message || 'Errore imprevisto. Riprova.')
		} finally {
			isLoading.value = false
		}
	}

	const selectPreset = (amount: number): void => {
		topUpAmount.value = amount
	}

	onBeforeUnmount(() => {
		clearNewCardForm()
	})

	return {
		topUpAmount,
		isLoading,
		message,
		messageType,
		presetAmounts,
		showNewCardForm,
		isPreparingNewCardForm,
		cardHolderName,
		cardError,
		canSubmitTopUp,
		topUpButtonLabel,
		selectPreset,
		handleTopUp,
		openNewCardForm,
		closeNewCardForm,
	}
}
