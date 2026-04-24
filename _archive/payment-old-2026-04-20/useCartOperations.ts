/**
 * useCartOperations — Cart, packages, totals, billing, wallet, coupon/referral logic.
 *
 * Extracted from useCheckout to keep each composable focused.
 * Handles: page init, existing order, display packages, price formatting,
 * billing/fatturazione, wallet balance, coupon/referral, and total computation.
 */
import {
	deriveShipmentFlowStateFromUserStore,
	pickMostAdvancedShipmentFlowState,
	resolveShipmentFlowState,
	SHIPMENT_FLOW_ROUTES,
} from '~/utils/shipmentFlowState'
import { buildAuthOverlayLocation } from '~/utils/authRouting'
import type { AddressGroup, CartItem, Order } from '~/types'

interface CouponAppliedState {
	type: 'coupon' | 'referral' | string
	discount_percent: number
	discount_amount: number
	pro_name: string
	code: string
}

interface CouponBackendResponse {
	success?: boolean
	type?: string
	percentage?: number
	discount_amount?: number
	pro_user_name?: string
	referral_code?: string
}

interface ReferralResponse {
	has_discount?: boolean
	referral_code?: string
	discount_percent?: number
	pro_name?: string
}

interface WalletBalanceResponse {
	balance?: number | string
}

interface BillingPayloadResult {
	type: 'ricevuta' | 'fattura'
	subject_type?: 'privato' | 'azienda'
	same_as_shipping?: boolean
	nome_completo?: string | null
	ragione_sociale?: string | null
	p_iva?: string | null
	codice_fiscale?: string | null
	indirizzo?: string | null
	city?: string | null
	province?: string | null
	postal_code?: string | null
	pec?: string | null
	codice_sdi?: string | null
	shipping_reference?: {
		name: string | null
		address: string | null
		city: string | null
		province: string | null
		postal_code: string | null
	} | null
}

export function useCartOperations() {
	const { user, isAuthenticated } = useSanctumAuth()
	const { cart, refresh: refreshCart } = useCart()
	const { session } = useSession()
	const shipmentFlowStore = useShipmentFlowStore()
	const sanctum = useSanctumClient()
	const route = useRoute()

	// --- PROMO ---
	const { loadPriceBands, priceBands, promoSettings } = usePriceBands()

	// --- FALLBACK ROUTE ---
	const fallbackFlowRoute = computed<string>(() => {
		const remoteFlowState = resolveShipmentFlowState((session.value as { data?: Record<string, unknown> } | null)?.data || {})
		const localFlowState = deriveShipmentFlowStateFromUserStore(shipmentFlowStore as unknown as Parameters<typeof deriveShipmentFlowStateFromUserStore>[0])
		return pickMostAdvancedShipmentFlowState(remoteFlowState, localFlowState).last_valid_route || SHIPMENT_FLOW_ROUTES.packages
	})

	// --- EXISTING ORDER ---
	const existingOrderId = computed<string | number | null>(() => (route.query.order_id as string | undefined) || null)
	const pageReady = ref<boolean>(false)
	const existingOrder = ref<Order | null>(null)

	const initCheckoutPage = async (): Promise<boolean> => {
		if (!isAuthenticated.value) {
			await navigateTo(
				buildAuthOverlayLocation({
					requestedPath: route.fullPath || SHIPMENT_FLOW_ROUTES.payment,
					tab: 'login',
				}),
				{ replace: true },
			)
			return false
		}

		existingOrder.value = null

		if (existingOrderId.value) {
			try {
				const orderData = await sanctum(`/api/orders/${existingOrderId.value}`) as { data?: Order } | Order
				existingOrder.value = (orderData as { data?: Order })?.data || (orderData as Order)
				return true
			} catch {
				await navigateTo(fallbackFlowRoute.value, { replace: true })
				return false
			}
		}

		clearNuxtData('cart')
		await refreshCart()

		const cartValue = cart.value as { data?: CartItem[] } | null
		if (!cartValue || cartValue.data?.length === 0) {
			await navigateTo(fallbackFlowRoute.value, { replace: true })
			return false
		}

		return true
	}

	// --- PRICE HELPERS ---
	// formatPrice auto-importato da utils/price.js (sitewide convention "0,00 €")

	const displayPackages = computed<CartItem[]>(() => {
		if (existingOrder.value) return (existingOrder.value.packages as CartItem[]) || []
		return ((cart.value as { data?: CartItem[] } | null)?.data) || []
	})

	const addressGroups = computed<AddressGroup[]>(() => ((cart.value as { meta?: { address_groups?: AddressGroup[] } } | null)?.meta?.address_groups) || [])
	const hasMultipleGroups = computed<boolean>(() => addressGroups.value.filter((g) => g.count >= 1).length > 1)
	const mergeGroupsCount = computed<number>(() => addressGroups.value.length)

	const getTotal = computed<string | number>(() => {
		if (existingOrder.value) return existingOrder.value.subtotal || '0,00€'
		return ((cart.value as { meta?: { total?: string | number } } | null)?.meta?.total) || '0,00€'
	})

	const getNumberTotal = computed<number>(() => {
		const cleaned = String(getTotal.value)
			.replace(/[€\sEUR]/gi, '')
			.replace(/\./g, '')
			.replace(',', '.')
		return Number(cleaned) || 0
	})

	const totalPackages = computed<number>(() => {
		return displayPackages.value.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
	})

	const contentDescription = computed<string>(() => {
		if (!displayPackages.value.length) return ''
		const types = displayPackages.value.map((item) => item.package_type || 'Pacco').filter(Boolean)
		return [...new Set(types)].join(', ')
	})

	// --- BILLING ---
	const fatturazioneType = ref<'ricevuta' | 'fattura'>('ricevuta')
	const invoiceSubjectType = ref<'privato' | 'azienda'>('azienda')
	interface FatturaFormState {
		nome_completo: string
		ragione_sociale: string
		p_iva: string
		codice_fiscale: string
		indirizzo: string
		city: string
		province: string
		postal_code: string
		pec: string
		codice_sdi: string
	}
	const fatturaData = ref<FatturaFormState>({
		nome_completo: '',
		ragione_sociale: '',
		p_iva: '',
		codice_fiscale: '',
		indirizzo: '',
		city: '',
		province: '',
		postal_code: '',
		pec: '',
		codice_sdi: '',
	})

	const billingShippingSource = computed(() => {
		const pkg = displayPackages.value?.[0]
		return pkg?.origin_address || pkg?.destination_address || null
	})

	const billingShippingAddressLine = computed<string>(() => {
		const address = billingShippingSource.value
		if (!address) return ''
		return [address.address, address.address_number].filter(Boolean).join(' ').trim()
	})

	const billingShippingFullAddress = computed<string>(() => {
		const address = billingShippingSource.value
		if (!address) return ''
		return [
			[address.address, address.address_number].filter(Boolean).join(' ').trim(),
			[address.postal_code, address.city].filter(Boolean).join(' '),
			address.province ? `(${address.province})` : '',
		]
			.filter(Boolean)
			.join(', ')
	})

	const applyShippingDataToBilling = (): void => {
		const address = billingShippingSource.value
		if (!address) return

		if (invoiceSubjectType.value === 'privato') {
			fatturaData.value.nome_completo = fatturaData.value.nome_completo || address.name || ''
		} else if (!fatturaData.value.ragione_sociale) {
			fatturaData.value.ragione_sociale = address.name || ''
		}

		fatturaData.value.indirizzo = fatturaData.value.indirizzo || billingShippingAddressLine.value
		fatturaData.value.city = fatturaData.value.city || address.city || ''
		fatturaData.value.province = fatturaData.value.province || address.province || ''
		fatturaData.value.postal_code = fatturaData.value.postal_code || address.postal_code || ''
	}

	watch(
		[invoiceSubjectType, billingShippingSource],
		() => {
			applyShippingDataToBilling()
		},
		{ immediate: true },
	)

	watch(invoiceSubjectType, (subjectType) => {
		if (subjectType === 'privato') {
			fatturaData.value.ragione_sociale = ''
			fatturaData.value.p_iva = ''
		}
		applyShippingDataToBilling()
	})

	watch(fatturazioneType, (type) => {
		if (type === 'fattura') {
			applyShippingDataToBilling()
		}
	})

	const billingPayload = computed<BillingPayloadResult>(() => {
		if (fatturazioneType.value !== 'fattura') {
			return { type: 'ricevuta' }
		}

		return {
			type: 'fattura',
			subject_type: invoiceSubjectType.value,
			same_as_shipping: false,
			nome_completo: fatturaData.value.nome_completo?.trim() || null,
			ragione_sociale: fatturaData.value.ragione_sociale?.trim() || null,
			p_iva: fatturaData.value.p_iva?.trim() || null,
			codice_fiscale: fatturaData.value.codice_fiscale?.trim() || null,
			indirizzo: fatturaData.value.indirizzo?.trim() || null,
			city: fatturaData.value.city?.trim() || null,
			province: fatturaData.value.province?.trim() || null,
			postal_code: fatturaData.value.postal_code?.trim() || null,
			pec: invoiceSubjectType.value === 'azienda' ? fatturaData.value.pec?.trim() || null : null,
			codice_sdi: invoiceSubjectType.value === 'azienda' ? fatturaData.value.codice_sdi?.trim() || null : null,
			shipping_reference: billingShippingSource.value
				? {
						name: billingShippingSource.value.name || null,
						address: billingShippingAddressLine.value || null,
						city: billingShippingSource.value.city || null,
						province: billingShippingSource.value.province || null,
						postal_code: billingShippingSource.value.postal_code || null,
					}
				: null,
		}
	})

	// --- WALLET ---
	const walletBalance = ref<number>(0)
	const walletLoaded = ref<boolean>(false)

	const loadWalletBalance = async (): Promise<void> => {
		if (walletLoaded.value) return
		try {
			const result = await sanctum('/api/wallet/balance') as WalletBalanceResponse
			walletBalance.value = Number(result?.balance ?? 0)
			walletLoaded.value = true
		} catch {
			walletBalance.value = 0
			walletLoaded.value = true
		}
	}

	const walletFormatted = computed<string>(() => walletBalance.value.toFixed(2).replace('.', ',') + '€')

	// --- COUPON / REFERRAL ---
	const couponCode = ref<string>('')
	const couponLoading = ref<boolean>(false)
	const couponError = ref<string | null>(null)
	const couponApplied = ref<CouponAppliedState | null>(null)
	const couponPanelOpen = ref<boolean>(false)

	const validateCoupon = async (): Promise<void> => {
		if (!couponCode.value || couponCode.value.trim().length < 2) return
		couponLoading.value = true
		couponError.value = null
		couponApplied.value = null
		try {
			const result = await sanctum('/api/calculate-coupon', {
				method: 'POST',
				body: { coupon: couponCode.value.trim().toUpperCase(), total: getNumberTotal.value },
			}) as CouponBackendResponse
			if (result?.success) {
				couponApplied.value = {
					type: result.type || 'coupon',
					discount_percent: Number(result.percentage || 0),
					discount_amount: Number(result.discount_amount || 0),
					pro_name: result.pro_user_name || '',
					code: result.referral_code || couponCode.value.trim().toUpperCase(),
				}
				couponPanelOpen.value = true
			}
		} catch (e) {
			const err = e as { response?: { _data?: { error?: string; message?: string } }; data?: { error?: string; message?: string } } | undefined
			const data = err?.response?._data || err?.data
			couponError.value = data?.error || data?.message || 'Codice non valido.'
			couponPanelOpen.value = true
		} finally {
			couponLoading.value = false
		}
	}

	const autoApplyReferral = async (): Promise<void> => {
		if (couponApplied.value) return
		try {
			const result = await sanctum('/api/referral/my-discount') as ReferralResponse
			if (result?.has_discount && result?.referral_code) {
				couponCode.value = result.referral_code
				const discountAmount = Math.round(getNumberTotal.value * (Number(result.discount_percent || 0) / 100) * 100) / 100
				couponApplied.value = {
					type: 'referral',
					discount_percent: Number(result.discount_percent || 0),
					discount_amount: discountAmount,
					pro_name: result.pro_name || '',
					code: result.referral_code,
				}
			}
		} catch {
			// Silently ignore - user may not have referral
		}
	}

	const removeCoupon = (): void => {
		couponApplied.value = null
		couponCode.value = ''
		couponError.value = null
		couponPanelOpen.value = false
	}

	// --- TOTALS (depend on coupon) ---
	const finalTotal = computed<number>(() => {
		if (couponApplied.value) {
			return Math.max(0, getNumberTotal.value - couponApplied.value.discount_amount)
		}
		return getNumberTotal.value
	})

	const finalTotalFormatted = computed<string>(() => {
		// Convenzione sitewide: "20,00 €" con non-breaking space (\u00A0)
		return finalTotal.value.toFixed(2).replace('.', ',') + '\u00A0€'
	})

	const walletSufficient = computed<boolean>(() => walletBalance.value >= finalTotal.value)

	return {
		// dependencies exposed for other composables
		cart,
		refreshCart,
		sanctum,
		shipmentFlowStore,
		user,

		// page state
		pageReady,
		existingOrderId,
		existingOrder,
		initCheckoutPage,
		fallbackFlowRoute,

		// promo
		loadPriceBands,
		priceBands,
		promoSettings,

		// packages & totals
		displayPackages,
		addressGroups,
		hasMultipleGroups,
		mergeGroupsCount,
		getTotal,
		getNumberTotal,
		totalPackages,
		contentDescription,
		formatPrice,
		finalTotal,
		finalTotalFormatted,

		// billing
		fatturazioneType,
		invoiceSubjectType,
		fatturaData,
		billingShippingFullAddress,
		billingPayload,

		// wallet
		walletBalance,
		walletFormatted,
		walletLoaded,
		walletSufficient,
		loadWalletBalance,

		// coupon
		couponCode,
		couponLoading,
		couponError,
		couponApplied,
		couponPanelOpen,
		validateCoupon,
		removeCoupon,
		autoApplyReferral,
	}
}
