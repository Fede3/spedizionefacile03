import { normalizeShipmentPayloadForComparison } from '~/utils/shipmentDraftPayload'

type ValueRef<T> = { value: T }
type ApiError = {
	data?: { message?: string; errors?: Record<string, unknown> }
	response?: { status?: number; _data?: { errors?: Record<string, unknown> } }
	status?: number
	statusCode?: number
	message?: string
}
type ShipmentFlowStoreLike = {
	pendingShipment?: object | null
	editingCartItemId?: unknown
}
type PaymentEntryDeps = {
	shipmentFlowStore: ShipmentFlowStoreLike
	sanctumClient: <T = Record<string, unknown>>(url: string, options?: Record<string, unknown>) => Promise<T>
	uiFeedback: { success: (title: string, message?: string, options?: Record<string, unknown>) => unknown }
	funnelAnalytics: { trackPaymentInit: (amountCents: number) => unknown }
	isAuthenticated: ValueRef<boolean>
	showAddressFields: ValueRef<boolean>
	submitError: ValueRef<string | null>
	paymentBootstrapError: ValueRef<string>
	paymentBootstrapPending: ValueRef<boolean>
	paymentSummaryExpanded: ValueRef<boolean>
	isProceedingToPayment: ValueRef<boolean>
	paymentStageRef: unknown
	scrollAccordionStageIntoView: (target: unknown, selector?: string) => unknown
	openPaymentStage: () => Promise<boolean | undefined> | boolean | undefined
	existingOrderId: ValueRef<string | number | null | undefined>
	editCartId?: string | number | null
	paymentSuccess: ValueRef<boolean>
	checkoutPageReady: ValueRef<boolean>
	initCheckoutPage: () => Promise<boolean> | boolean
	initStripe: () => Promise<unknown> | unknown
	loadPriceBands: () => unknown
	autoApplyReferral: () => Promise<unknown> | unknown
	openShipmentAuthModal: (tab?: 'login' | 'register' | 'forgot') => unknown
	buildCurrentShipmentPayload: () => Record<string, unknown>
	openAddressAccordion: () => Promise<unknown> | unknown
}
type PaymentEntryUserError = {
	kind: 'validation' | 'auth' | 'server' | 'generic'
	message: string
}
type DirectOrderResponse = {
	order_id?: string | number
	client_submission_id?: string
	amount_cents?: number
	data?: {
		order_id?: string | number
		client_submission_id?: string
		amount_cents?: number
	}
}
type PaymentPayloadRecord = Record<string, unknown> & { client_submission_id?: string }

const asApiError = (error: unknown): ApiError => error && typeof error === 'object' ? error as ApiError : {}
const asPaymentPayloadRecord = (value: object | null | undefined): PaymentPayloadRecord | null =>
	value && typeof value === 'object' ? value as PaymentPayloadRecord : null
const resolvePaymentEntryErrorMessage = (error: unknown, fallback: string) => {
	const source = asApiError(error)
	const raw = source.data?.message || source.message || ''
	return typeof raw === 'string' && raw.trim() ? raw : fallback
}

const buildPaymentEntryUserError = (error: unknown, fallback: string): PaymentEntryUserError => {
	const source = asApiError(error)
	const status = Number(source.response?.status || source.status || source.statusCode || 0)

	if (status === 422) {
		const errors = source.data?.errors || source.response?._data?.errors
		const firstField = errors ? Object.values(errors)[0] : null
		const firstMsg = Array.isArray(firstField) ? firstField[0] : firstField
		return {
			kind: 'validation',
			message: firstMsg
				? String(firstMsg)
				: resolvePaymentEntryErrorMessage(error, 'Dati non validi. Controlla i campi e riprova.'),
		}
	}
	if (status === 401 || status === 419) {
		return { kind: 'auth', message: 'Sessione scaduta. Effettua di nuovo l\'accesso per continuare.' }
	}
	if (status >= 500) {
		return { kind: 'server', message: 'Errore temporaneo del server. Riprova tra qualche secondo.' }
	}
	return { kind: 'generic', message: resolvePaymentEntryErrorMessage(error, fallback) }
}

export function useShipmentStepPaymentEntry(deps: PaymentEntryDeps) {
	const route = useRoute()
	const router = useRouter()
	const {
		shipmentFlowStore,
		sanctumClient,
		uiFeedback,
		funnelAnalytics,
		isAuthenticated,
		showAddressFields,
		submitError,
		paymentBootstrapError,
		paymentBootstrapPending,
		paymentSummaryExpanded,
		isProceedingToPayment,
		paymentStageRef,
		scrollAccordionStageIntoView,
		openPaymentStage,
		existingOrderId,
		editCartId,
		paymentSuccess,
		checkoutPageReady,
		initCheckoutPage,
		initStripe,
		loadPriceBands,
		autoApplyReferral,
		openShipmentAuthModal,
		buildCurrentShipmentPayload,
		openAddressAccordion,
	} = deps

	const resolveRouteOrderId = () => {
		const raw = Array.isArray(route.query.order_id) ? route.query.order_id[0] : route.query.order_id
		return raw === undefined || raw === null || raw === '' ? null : String(raw)
	}

	const syncPaymentRouteContext = async (orderId: string | number | null = null) => {
		const nextQuery: Record<string, string | null | (string | null)[] | undefined> = { ...route.query, step: 'pagamento' }
		if (orderId) nextQuery.order_id = String(orderId)
		else delete nextQuery.order_id

		const currentStep = Array.isArray(route.query.step) ? route.query.step[0] : route.query.step
		const currentOrderId = resolveRouteOrderId()
		if ((currentStep || '') === 'pagamento' && (currentOrderId || '') === (orderId ? String(orderId) : '')) return
		await router.replace({ path: route.path, query: nextQuery, hash: route.hash })
	}

	const clearPaymentRouteContext = async () => {
		const nextQuery: Record<string, string | null | (string | null)[] | undefined> = { ...route.query }
		delete nextQuery.order_id
		checkoutPageReady.value = false
		paymentBootstrapError.value = ''
		paymentSummaryExpanded.value = false
		await router.replace({ path: route.path, query: nextQuery, hash: route.hash })
	}

	const ensureOrderCreationAuthContext = async () => {
		if (!import.meta.client) return Boolean(isAuthenticated.value)

		const { isAuthenticated: sanctumAuthenticated, refreshIdentity } = useSanctumAuth()
		const { authCookie } = useAuthUiSnapshotPersistence()
		const hasUiSnapshot = Boolean(authCookie.value?.authenticated)

		if (!sanctumAuthenticated.value) await runAuthBootstrap({ force: hasUiSnapshot })
		if (!sanctumAuthenticated.value) {
			const synced = await waitForPostAuthSync(refreshIdentity)
			if (!synced || !sanctumAuthenticated.value) return false
		}

		try {
			await $fetch('/sanctum/csrf-cookie', { method: 'GET', credentials: 'include' })
		} catch {
			// La POST successiva restituira l'eventuale errore reale.
		}

		return true
	}

	const initializePaymentSection = async () => {
		if (paymentBootstrapPending.value) return Boolean(checkoutPageReady.value)
		if (!isAuthenticated.value) return false

		paymentBootstrapPending.value = true
		paymentBootstrapError.value = ''
		try {
			checkoutPageReady.value = await initCheckoutPage()
			if (!checkoutPageReady.value) return false
			loadPriceBands()
			autoApplyReferral()
			await initStripe()
			return true
		} catch (error) {
			checkoutPageReady.value = false
			paymentBootstrapError.value = resolvePaymentEntryErrorMessage(error, 'Non siamo riusciti a preparare il pagamento.')
			return false
		} finally {
			paymentBootstrapPending.value = false
		}
	}

	const proceedToPaymentFromConfirm = async () => {
		if (isProceedingToPayment.value) return
		if (!isAuthenticated.value) {
			try { await openPaymentStage() } catch { /* noop */ }
			await syncPaymentRouteContext(null)
			openShipmentAuthModal('login')
			return
		}

		isProceedingToPayment.value = true
		submitError.value = null
		try {
			if (!await ensureOrderCreationAuthContext()) {
				try { await openPaymentStage() } catch { /* noop */ }
				await syncPaymentRouteContext(null)
				openShipmentAuthModal('login')
				return
			}

			const payload = buildCurrentShipmentPayload()
			const previousPayload = asPaymentPayloadRecord(shipmentFlowStore.pendingShipment)
			const samePayloadAsPrevious =
				normalizeShipmentPayloadForComparison(previousPayload) === normalizeShipmentPayloadForComparison(payload)
			const clientSubmissionId = samePayloadAsPrevious && typeof previousPayload?.client_submission_id === 'string'
				? previousPayload.client_submission_id
				: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
			const payloadWithSubmission = { ...payload, client_submission_id: clientSubmissionId }
			shipmentFlowStore.pendingShipment = payloadWithSubmission

			if (editCartId) {
				await sanctumClient(`/api/cart/${editCartId}`, { method: 'PUT', body: payloadWithSubmission })
				shipmentFlowStore.editingCartItemId = editCartId
				uiFeedback.success('Indirizzi salvati', 'Apro il pagamento nello stesso ventaglio...', { timeout: 1800 })
				await openPaymentAccordion()
				return
			}

			const result = await sanctumClient<DirectOrderResponse>('/api/create-direct-order', {
				method: 'POST',
				body: payloadWithSubmission,
			})
			const orderId = result.order_id || result.data?.order_id || null
			const canonicalSubmissionId = result.client_submission_id || result.data?.client_submission_id || null
			if (canonicalSubmissionId && shipmentFlowStore.pendingShipment) {
				shipmentFlowStore.pendingShipment = {
					...shipmentFlowStore.pendingShipment,
					client_submission_id: canonicalSubmissionId,
				}
			}

			const amountCents = Number(result.amount_cents || result.data?.amount_cents || 0)
			funnelAnalytics.trackPaymentInit(amountCents)
			uiFeedback.success('Ordine creato', 'Apro il pagamento nello stesso ventaglio...', { timeout: 1800 })
			await openPaymentAccordion(orderId)
		} catch (error) {
			const userError = buildPaymentEntryUserError(error, 'Errore durante l\'apertura del pagamento. Riprova.')
			submitError.value = userError.message
			if (userError.kind === 'auth') {
				try { await openPaymentStage() } catch { /* noop */ }
				await syncPaymentRouteContext(null)
				openShipmentAuthModal('login')
			}
		} finally {
			isProceedingToPayment.value = false
		}
	}

	const openPaymentAccordion = async (orderId: string | number | null = null) => {
		if (!showAddressFields.value) {
			await openAddressAccordion()
			return
		}
		const resolvedOrderId = orderId || resolveRouteOrderId() || existingOrderId.value || null
		if (!isAuthenticated.value) {
			await syncPaymentRouteContext(resolvedOrderId)
			openShipmentAuthModal('login')
			return
		}
		if (!resolvedOrderId && !editCartId) {
			await proceedToPaymentFromConfirm()
			return
		}
		paymentSummaryExpanded.value = false
		await syncPaymentRouteContext(resolvedOrderId)
		if (await openPaymentStage() === false) return
		if (await initializePaymentSection() === false) return
		scrollAccordionStageIntoView(paymentStageRef, '[data-accordion-trigger="payment"]')
	}

	const ensurePaymentStageReady = async () => {
		if (!isAuthenticated.value) return
		if (paymentBootstrapPending.value || checkoutPageReady.value || paymentSuccess.value || isProceedingToPayment.value) return
		const resolvedOrderId = resolveRouteOrderId() || existingOrderId.value || null
		if (!resolvedOrderId && !editCartId) {
			if (!shipmentFlowStore.pendingShipment) return
			await proceedToPaymentFromConfirm()
			return
		}
		await initializePaymentSection()
	}

	return {
		clearPaymentRouteContext,
		openPaymentAccordion,
		proceedToPaymentFromConfirm,
		ensurePaymentStageReady,
	}
}
