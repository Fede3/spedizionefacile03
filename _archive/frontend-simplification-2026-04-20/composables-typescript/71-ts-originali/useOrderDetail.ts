/**
 * Composable: useOrderDetail
 * Logica completa per la pagina dettaglio ordine /account/spedizioni/[id].
 *
 * Gestisce: fetch ordine, formattazione dati, etichette BRT, annullamento/rimborso,
 * aggiunta collo, label download/rigenerazione.
 */
import type { Ref } from 'vue'
import type { Order, OrderStatusRaw, PaymentMethod } from '~/types'

interface OrderApiResponse {
	data?: Order
}

interface ExecutionData {
	bordero_document_filename?: string | null
	[key: string]: unknown
}

interface ExecutionApiResponse {
	data?: ExecutionData
}

interface NewPackageForm {
	package_type: string
	quantity: number
	weight: number | string
	first_size: number | string
	second_size: number | string
	third_size: number | string
	content_description: string
}

interface RunExecutionArgs {
	endpoint: string
	busyRef: Ref<boolean>
	successMessage: string
	body?: unknown
}

interface RefundEligibilityResponse {
	refundable?: boolean
	[key: string]: unknown
}

interface PickupRequestInput {
	date?: string
	time_slot?: string
	notes?: string
}

export default function useOrderDetail(orderId: number | string) {
	const sanctum = useSanctumClient()

	/* --- Fetch ordine --- */
	const { data: order, status: orderStatus, refresh } = useSanctumFetch<OrderApiResponse | Order>(
		`/api/orders/${orderId}`,
		{ lazy: true } as Record<string, unknown>,
	)
	const {
		data: execution,
		status: executionStatus,
		refresh: refreshExecution,
	} = useSanctumFetch<ExecutionApiResponse | ExecutionData>(
		`/api/orders/${orderId}/execution`,
		{ lazy: true } as Record<string, unknown>,
	)

	/* --- Helpers di formattazione --- */
	const formatDate = (dateStr: string | null | undefined): string => {
		if (!dateStr) return '—'
		try {
			return new Date(dateStr).toLocaleDateString('it-IT', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			})
		} catch {
			return dateStr
		}
	}

	const statusColor = (status: string | undefined): string => {
		const map: Record<string, string> = {
			'In attesa': 'bg-yellow-100 text-yellow-700',
			'In lavorazione': 'bg-[#eef8fa] text-[#095866]',
			'Etichetta generata': 'bg-[#eef8fa] text-[#095866]',
			Completato: 'bg-[#f0fdf4] text-[#0a8a7a]',
			Fallito: 'bg-red-100 text-red-700',
			Pagato: 'bg-[#f0fdf4] text-[#0a8a7a]',
			Annullato: 'bg-gray-200 text-gray-600',
			Rimborsato: 'bg-orange-100 text-orange-700',
			'In transito': 'bg-[#eef8fa] text-[#095866]',
			'In consegna': 'bg-[#dff0f3] text-[#074a56]',
			Consegnato: 'bg-[#f0fdf4] text-[#0a8a7a]',
			'In giacenza': 'bg-orange-100 text-orange-700',
			Reso: 'bg-orange-100 text-[#E44203]',
			Rifiutato: 'bg-red-100 text-red-700',
		}
		return map[status || ''] || 'bg-gray-100 text-gray-700'
	}

	// formatPrice auto-importato da utils/price.js

	const paymentMethodLabel = (method: PaymentMethod | undefined | null): string => {
		const map: Record<string, string> = { stripe: 'Carta di credito (Stripe)', wallet: 'Portafoglio', bonifico: 'Bonifico' }
		return map[method || ''] || method || 'Non specificato'
	}

	const downloadFile = (blob: Blob, filename: string): void => {
		const url = window.URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = filename
		document.body.appendChild(link)
		link.click()
		window.URL.revokeObjectURL(url)
		link.remove()
	}

	/* --- Computed derivati dall'ordine --- */
	const orderData = computed<Order | null>(() => {
		const raw = order.value as OrderApiResponse | Order | null
		return (raw as OrderApiResponse | null)?.data || (raw as Order | null) || null
	})
	const executionData = computed<ExecutionData | null>(() => {
		const raw = execution.value as ExecutionApiResponse | ExecutionData | null
		return (raw as ExecutionApiResponse | null)?.data || (raw as ExecutionData | null) || null
	})

	const orderSubtotalLabel = computed<string>(() => {
		const subtotal = orderData.value?.subtotal
		if (typeof subtotal === 'string' && subtotal.trim()) return subtotal.replace(/\s*EUR$/i, '€')
		return formatPrice(orderData.value?.subtotal_cents || 0)
	})

	const orderRouteLabel = computed<string>(() => {
		const firstPackage = orderData.value?.packages?.[0]
		if (!firstPackage) return '—'
		const oc = firstPackage.origin_address?.city || ''
		const op = firstPackage.origin_address?.province || ''
		const dc = firstPackage.destination_address?.city || ''
		const dp = firstPackage.destination_address?.province || ''
		return `${oc}${op ? ` (${op})` : ''} → ${dc}${dp ? ` (${dp})` : ''}`
	})

	const orderPackageCountLabel = computed<string>(() => {
		const count = Number(orderData.value?.packages?.length || 0)
		if (!count) return 'Nessun collo'
		return count === 1 ? '1 collo' : `${count} colli`
	})

	const isPendingPayment = computed<boolean>(() => {
		const raw = orderData.value?.raw_status as OrderStatusRaw | undefined
		return raw === 'pending' || raw === 'payment_failed'
	})

	const isCancellable = computed<boolean>(() => orderData.value?.cancellable === true)

	const isCancelledOrRefunded = computed<boolean>(() => {
		const raw = orderData.value?.raw_status as OrderStatusRaw | undefined
		return raw === 'cancelled' || raw === 'refunded'
	})

	/* --- Aggiungi collo --- */
	const showAddPackageForm = ref<boolean>(false)
	const addingPackage = ref<boolean>(false)
	const addPackageError = ref<string | null>(null)
	const addPackageSuccess = ref<boolean>(false)
	const newPackage = ref<NewPackageForm>({
		package_type: 'Pacco',
		quantity: 1,
		weight: '',
		first_size: '',
		second_size: '',
		third_size: '',
		content_description: '',
	})

	const submitAddPackage = async (): Promise<void> => {
		addPackageError.value = null
		addPackageSuccess.value = false
		addingPackage.value = true
		try {
			await sanctum(`/api/orders/${orderId}/add-package`, { method: 'POST', body: newPackage.value })
			addPackageSuccess.value = true
			showAddPackageForm.value = false
			newPackage.value = {
				package_type: 'Pacco',
				quantity: 1,
				weight: '',
				first_size: '',
				second_size: '',
				third_size: '',
				content_description: '',
			}
			await refresh()
		} catch (e) {
			const err = e as { response?: { _data?: { error?: string; message?: string } }; data?: { error?: string; message?: string } } | undefined
			const data = err?.response?._data || err?.data
			addPackageError.value = data?.error || data?.message || "Errore durante l'aggiunta del collo."
		} finally {
			addingPackage.value = false
		}
	}

	/* --- BRT etichetta --- */
	const regenerating = ref<boolean>(false)
	const regenerateError = ref<string | null>(null)
	const regenerateSuccess = ref<boolean>(false)

	const downloadLabel = async (): Promise<void> => {
		if (!orderData.value?.id) return
		try {
			const blob = await sanctum(`/api/brt/label/${orderData.value.id}`, {
				method: 'GET',
				responseType: 'blob',
			}) as Blob
			downloadFile(blob, `etichetta-brt-${orderData.value.id}.pdf`)
		} catch {
			// ignore
		}
	}

	const regenerateLabel = async (): Promise<void> => {
		if (!orderData.value?.id) return
		regenerating.value = true
		regenerateError.value = null
		regenerateSuccess.value = false
		try {
			await sanctum('/api/brt/create-shipment', { method: 'POST', body: { order_id: orderData.value.id } })
			regenerateSuccess.value = true
			await refresh()
		} catch (e) {
			const err = e as { response?: { _data?: { error?: string } }; data?: { error?: string } } | undefined
			const data = err?.response?._data || err?.data
			regenerateError.value = data?.error || "Errore durante la rigenerazione dell'etichetta."
		} finally {
			regenerating.value = false
		}
	}

	/* --- Annullamento e rimborso --- */
	const showCancelModal = ref<boolean>(false)
	const refundEligibility = ref<RefundEligibilityResponse | null>(null)
	const loadingEligibility = ref<boolean>(false)
	const cancelling = ref<boolean>(false)
	const cancelError = ref<string | null>(null)
	const cancelSuccess = ref<string | null>(null)
	const cancelReason = ref<string>('')

	const openCancelModal = async (): Promise<void> => {
		cancelError.value = null
		cancelSuccess.value = null
		loadingEligibility.value = true
		showCancelModal.value = true
		try {
			refundEligibility.value = await sanctum(`/api/orders/${orderId}/refund-eligibility`, { method: 'GET' }) as RefundEligibilityResponse
		} catch (e) {
			const err = e as { response?: { _data?: { error?: string } }; data?: { error?: string } } | undefined
			const data = err?.response?._data || err?.data
			cancelError.value = data?.error || "Errore nel controllo dell'idoneita' al rimborso."
		} finally {
			loadingEligibility.value = false
		}
	}

	const confirmCancellation = async (): Promise<void> => {
		cancelling.value = true
		cancelError.value = null
		try {
			const result = await sanctum(`/api/orders/${orderId}/cancel`, {
				method: 'POST',
				body: { reason: cancelReason.value || undefined },
			}) as { message?: string }
			cancelSuccess.value = result?.message || 'Ordine annullato con successo.'
			showCancelModal.value = false
			cancelReason.value = ''
			await refresh()
		} catch (e) {
			const err = e as { response?: { _data?: { error?: string; message?: string } }; data?: { error?: string; message?: string } } | undefined
			const data = err?.response?._data || err?.data
			cancelError.value = data?.error || data?.message || "Errore durante l'annullamento dell'ordine."
		} finally {
			cancelling.value = false
		}
	}

	/* --- Esecuzione spedizione: pickup / bordero / documenti --- */
	const pickupBusy = ref<boolean>(false)
	const borderoBusy = ref<boolean>(false)
	const documentsBusy = ref<boolean>(false)
	const downloadBorderoBusy = ref<boolean>(false)
	const executionError = ref<string | null>(null)
	const executionSuccess = ref<string | null>(null)

	const refreshOrderExecutionState = async (): Promise<void> => {
		await Promise.allSettled([refresh(), refreshExecution()])
	}

	const runExecutionAction = async ({ endpoint, busyRef, successMessage, body = undefined }: RunExecutionArgs): Promise<void> => {
		busyRef.value = true
		executionError.value = null
		executionSuccess.value = null

		try {
			const result = await sanctum(endpoint, { method: 'POST', body: body as Record<string, unknown> | undefined }) as { message?: string }
			executionSuccess.value = result?.message || successMessage
			await refreshOrderExecutionState()
		} catch (e) {
			const err = e as { response?: { _data?: { error?: string; message?: string } }; data?: { error?: string; message?: string } } | undefined
			const data = err?.response?._data || err?.data
			executionError.value = data?.message || data?.error || "Errore durante l'aggiornamento operativo della spedizione."
		} finally {
			busyRef.value = false
		}
	}

	const requestPickup = async (pickupRequest: PickupRequestInput | null = null): Promise<void> => {
		await runExecutionAction({
			endpoint: `/api/orders/${orderId}/pickup`,
			busyRef: pickupBusy,
			successMessage: 'Richiesta ritiro elaborata.',
			body: pickupRequest ? { pickup_request: pickupRequest } : undefined,
		})
	}

	const createBordero = async (): Promise<void> => {
		await runExecutionAction({
			endpoint: `/api/orders/${orderId}/bordero`,
			busyRef: borderoBusy,
			successMessage: 'Borderò generato.',
		})
	}

	const sendDocuments = async (): Promise<void> => {
		await runExecutionAction({
			endpoint: `/api/orders/${orderId}/send-documents`,
			busyRef: documentsBusy,
			successMessage: 'Documenti inviati.',
		})
	}

	const downloadBordero = async (): Promise<void> => {
		if (!orderData.value?.id) return
		downloadBorderoBusy.value = true
		executionError.value = null
		executionSuccess.value = null

		try {
			const blob = await sanctum(`/api/orders/${orderId}/bordero/download`, {
				method: 'GET',
				responseType: 'blob',
			}) as Blob
			downloadFile(blob, executionData.value?.bordero_document_filename || `bordero-${orderId}.pdf`)
			executionSuccess.value = 'Bordero scaricato.'
		} catch (e) {
			const err = e as { response?: { _data?: { error?: string; message?: string } }; data?: { error?: string; message?: string } } | undefined
			const data = err?.response?._data || err?.data
			executionError.value = data?.message || data?.error || 'Bordero non disponibile per il download.'
		} finally {
			downloadBorderoBusy.value = false
		}
	}

	const openBordero = (): void => {
		if (!orderData.value?.id || typeof window === 'undefined') return

		executionError.value = null
		executionSuccess.value = null

		const previewWindow = window.open(`/api/orders/${orderId}/bordero/download?inline=1`, '_blank', 'noopener')
		if (!previewWindow) {
			executionError.value = 'Il browser ha bloccato l\'apertura del bordero. Usa il download diretto.'
			return
		}

		executionSuccess.value = 'Bordero aperto in una nuova scheda.'
	}

	return {
		// Data
		order,
		orderStatus,
		orderData,
		refresh,
		execution,
		executionStatus,
		executionData,
		refreshExecution,
		// Labels
		orderSubtotalLabel,
		orderRouteLabel,
		orderPackageCountLabel,
		// State flags
		isPendingPayment,
		isCancellable,
		isCancelledOrRefunded,
		// Formatters
		formatDate,
		statusColor,
		formatPrice,
		paymentMethodLabel,
		// Add package
		showAddPackageForm,
		addingPackage,
		addPackageError,
		addPackageSuccess,
		newPackage,
		submitAddPackage,
		// BRT label
		regenerating,
		regenerateError,
		regenerateSuccess,
		downloadLabel,
		regenerateLabel,
		// Cancellation
		showCancelModal,
		refundEligibility,
		loadingEligibility,
		cancelling,
		cancelError,
		cancelSuccess,
		cancelReason,
		openCancelModal,
		confirmCancellation,
		// Shipment execution
		pickupBusy,
		borderoBusy,
		documentsBusy,
		downloadBorderoBusy,
		executionError,
		executionSuccess,
		requestPickup,
		createBordero,
		sendDocuments,
		downloadBordero,
		openBordero,
	}
}
