// composables/useCart.js — thin wrapper retro-compat sul cartStore (Pinia).
// Tre composable per contesti diversi:
//   - useCart()           → checkout (ShipmentStepPagamento + useCheckout)
//   - useCartOperations() → alias retro-compat (storico facade useCheckout)
//   - useCarrello()       → pagina /carrello (filtri, raggruppamento, coupon UI)
//
// Lo stato condiviso vive in `stores/cartStore.ts`. I helper puri in `utils/cartHelpers.ts`.

import { storeToRefs } from 'pinia'
import { formatDateIt } from '~/utils/date'
import { formatPrice as formatPriceCents } from '~/utils/price'
import {
	buildDiscountOrderContext,
	parseEuroAmount,
} from '~/utils/discountPreview'
import {
	applyCartFilters,
	buildDisplayEntries,
	CART_GROUP_COLORS,
	formatEuroAmount,
	getPackageIcon,
	QUANTITY_BUTTON_CLASS,
	QUANTITY_BUTTON_COMPACT_CLASS,
	QUANTITY_BUTTON_MOBILE_CLASS,
	unitPrice,
} from '~/utils/cartHelpers'
import { useCartPromoPreview } from '~/features/wallet-referral/useCartPromoPreview'
import { useCheckoutPromoPreview } from '~/features/wallet-referral/useCheckoutPromoPreview'
import {
	deriveShipmentFlowStateFromUserStore,
	pickMostAdvancedShipmentFlowState,
	resolveShipmentFlowState,
} from '~/utils/shipment'
import { useCartStore } from '~/stores/cartStore'

// ============================================================================
// SEZIONE 1 — useCart(): stato checkout, billing, wallet, coupon
// ============================================================================

export function useCart() {
	const route = useRoute()
	const sanctum = useSanctumClient()
	const { user, isAuthenticated } = useSanctumAuth()
	const { loadPriceBands, priceBands, promoSettings } = usePriceBands()
	const { session } = useSession()
	const userStore = useShipmentFlowStore()

	const store = useCartStore()
	const {
		cart,
		pageReady,
		existingOrder,
		fatturazioneType,
		invoiceSubjectType,
		fatturaData,
		walletBalance,
		displayPackages,
		getTotal,
		totalPackages,
		contentDescription,
		addressGroups,
		hasMultipleGroups,
		mergeGroupsCount,
		existingOrderPayableTotal,
		existingOrderDiscountPreview,
		existingOrderCanAcceptDiscount,
		billingShippingFullAddress,
		billingPayload,
		walletFormatted,
		walletLoaded,
	} = storeToRefs(store)

	// ---------- FALLBACK ROUTE ----------
	const fallbackFlowRoute = computed(() => {
		const remoteFlowState = resolveShipmentFlowState(session.value?.data || {})
		const localFlowState = deriveShipmentFlowStateFromUserStore(userStore)
		return pickMostAdvancedShipmentFlowState(remoteFlowState, localFlowState).last_valid_route
			|| '/preventivo'
	})

	/** ID ordine letto da `?order_id=...`. */
	const existingOrderId = computed(() => {
		const raw = Array.isArray(route.query.order_id)
			? route.query.order_id[0]
			: route.query.order_id
		return raw ? String(raw) : null
	})

	const getNumberTotal = computed(() => parseEuroAmount(getTotal.value))

	/** Formatter "0,00 €" per totali in euro float. */
	const formatPrice = formatEuroAmount

	/** Carica saldo wallet (idempotente). */
	async function loadWalletBalance() {
		if (store.walletLoaded) return
		try {
			const result = await sanctum('/api/wallet/balance')
			store.setWalletBalance(Number(result?.balance ?? 0), true)
		} catch {
			store.setWalletBalance(0, true)
		}
	}

	/** Ricarica il carrello dal backend (silent on error). */
	async function refreshCart() {
		try {
			const res = await sanctum('/api/cart')
			if (res?.data) {
				store.setCart({ data: res.data, meta: res.meta || {} })
			} else if (res) {
				store.setCart(res)
			}
		} catch {
			// cart precedente mantenuto
		}
	}

	/**
	 * Init pagina checkout: carica ordine esistente o cart standard.
	 */
	async function initCheckoutPage() {
		store.setExistingOrder(null)

		if (existingOrderId.value) {
			try {
				const res = await sanctum(`/api/orders/${existingOrderId.value}`)
				store.setExistingOrder(res?.data ?? res ?? null)
				store.setPageReady(true)
				return true
			} catch {
				store.setExistingOrder(null)
				store.setPageReady(false)
				return false
			}
		}

		if (!isAuthenticated.value || !user.value) {
			store.setPageReady(false)
			return false
		}

		await refreshCart()
		const hasItems = Array.isArray(cart.value?.data) && cart.value.data.length > 0
		store.setPageReady(hasItems)
		return hasItems
	}

	// ---------- WATCHERS BILLING (dipendono dal setup context) ----------
	watch([invoiceSubjectType, () => store.billingShippingSource], () => {
		store.applyShippingDataToBilling()
	}, { immediate: true })

	watch(invoiceSubjectType, (subjectType) => {
		if (subjectType === 'privato') store.clearInvoiceCompanyFields()
		store.applyShippingDataToBilling()
	})

	watch(fatturazioneType, (type) => {
		if (type === 'fattura') store.applyShippingDataToBilling()
	})

	// ---------- DISCOUNT PREVIEW (coupon / referral) ----------
	const {
		autoApplyReferral,
		couponApplied,
		couponCode,
		couponError,
		couponLoading,
		couponPanelOpen,
		discountedTotal,
		removeCoupon,
		validateCoupon,
	} = useCheckoutPromoPreview({
		sanctum,
		total: getNumberTotal,
	})

	const displayedCouponApplied = computed(
		() => existingOrderDiscountPreview.value || couponApplied.value,
	)

	function validateCheckoutCoupon() {
		if (existingOrder.value && !existingOrderCanAcceptDiscount.value) {
			couponError.value = 'Il totale di questo ordine e\' gia\' bloccato. Crea un nuovo preventivo per usare un altro codice.'
			return undefined
		}
		return validateCoupon()
	}

	function removeDisplayedCoupon() {
		if (existingOrderDiscountPreview.value) return
		removeCoupon()
	}

	// ---------- TOTALI FINALI (post coupon) ----------
	const finalTotal = computed(() => {
		if (existingOrderDiscountPreview.value) return existingOrderPayableTotal.value
		if (existingOrder.value && couponApplied.value) return discountedTotal.value
		if (existingOrder.value) return existingOrderPayableTotal.value
		return discountedTotal.value
	})

	const finalTotalFormatted = computed(() => {
		if (existingOrder.value?.payable_total && !couponApplied.value) {
			return existingOrder.value.payable_total
		}
		return Number(finalTotal.value).toFixed(2).replace('.', ',') + '\u00A0\u20AC'
	})

	const walletSufficient = computed(() => walletBalance.value >= finalTotal.value)

	const discountContext = computed(() =>
		buildDiscountOrderContext({
			preview: displayedCouponApplied.value,
			subtotal: getNumberTotal.value,
			finalTotal: finalTotal.value,
		}),
	)

	return {
		// cart & page state
		cart,
		pageReady,
		existingOrderId,
		existingOrder,
		initCheckoutPage,
		refreshCart,

		// dipendenze esposte per compatibilita' con codice storico
		sanctum,
		userStore,
		user,
		fallbackFlowRoute,

		// promo
		loadPriceBands,
		priceBands,
		promoSettings,

		// pacchi & totali
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
		discountContext,

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
		couponApplied: displayedCouponApplied,
		couponPanelOpen,
		validateCoupon: validateCheckoutCoupon,
		removeCoupon: removeDisplayedCoupon,
		autoApplyReferral,
	}
}

// ============================================================================
// SEZIONE 2 — useCartOperations(): ALIAS retro-compat di useCart()
// ============================================================================

export function useCartOperations() {
	return useCart()
}

// ============================================================================
// SEZIONE 3 — useCarrello(): logica pagina /carrello
// ============================================================================

/**
 * @typedef {import('~/types').CartItem} CartItem
 * @typedef {import('~/types').AddressGroup} AddressGroup
 */

export function useCarrello() {
	const { cart, refresh, status } = useCartFetch()
	const { isAuthenticated } = useSanctumAuth()
	const { openAuthModal } = useAuthModal()
	const sanctum = useSanctumClient()
	const route = useRoute()
	const uiFeedback = useUiFeedback()

	const store = useCartStore()
	const { expandedGroups } = storeToRefs(store)

	// Promo settings per banner e badge
	const { loadPriceBands, promoSettings } = usePriceBands()
	onMounted(async () => { await loadPriceBands() })

	// Endpoint diverso per svuotare il carrello in base allo stato auth
	const endpoint = computed(() =>
		isAuthenticated.value ? '/api/empty-cart' : '/api/empty-guest-cart',
	)

	// Redirect post-login quando il guest avvia checkout dal carrello.
	const authCheckoutRedirect = '/la-tua-spedizione/2?step=pagamento'

	const openCheckoutWithAuthGate = (tab = 'login') => {
		if (isAuthenticated.value) {
			navigateTo(authCheckoutRedirect)
			return
		}
		openAuthModal({ tab, redirect: authCheckoutRedirect })
	}

	onMounted(async () => {
		if (route.query.updated) {
			clearNuxtData('cart')
		}
		await refresh()

		if (cart.value?.meta?.address_groups) {
			const mergedGroups = cart.value.meta.address_groups.filter(
				(g) => g.package_ids?.length > 1,
			)
			if (mergedGroups.length > 0) {
				const totalMerged = mergedGroups.reduce((sum, g) => sum + g.package_ids.length, 0)
				uiFeedback.info(
					`${totalMerged} pacchi identici sono stati uniti automaticamente`,
					'',
					{ timeout: 5000 },
				)
			}
		}
	})

	// --- FILTRI ---
	const filterProvenienza = ref('')
	const filterRiferimento = ref('')

	const filteredCartItems = computed(() => {
		if (!cart.value?.data) return []
		return applyCartFilters(cart.value.data, {
			provenienza: filterProvenienza.value,
			riferimento: filterRiferimento.value,
		})
	})

	const uniqueCities = computed(() => {
		if (!cart.value?.data) return []
		const cities = cart.value.data.map((item) => item.origin_address?.city).filter(Boolean)
		return [...new Set(cities)]
	})

	// --- ELIMINAZIONE SINGOLA SPEDIZIONE ---
	const showDeleteConfirm = ref(false)
	const deleteTargetId = ref(null)
	const deleteLoading = ref(false)

	const askDelete = (id) => {
		deleteTargetId.value = id
		showDeleteConfirm.value = true
	}

	const confirmDelete = async () => {
		deleteLoading.value = true
		try {
			await sanctum(`/api/cart/${deleteTargetId.value}`, { method: 'DELETE' })
			clearNuxtData('cart')
			await refreshNuxtData('cart')
			uiFeedback.success('Spedizione rimossa dal carrello.')
		} catch {
			uiFeedback.error('Errore durante la rimozione', 'Riprova.')
		} finally {
			deleteLoading.value = false
			showDeleteConfirm.value = false
			deleteTargetId.value = null
		}
	}

	// --- SVUOTA CARRELLO ---
	const showEmptyConfirm = ref(false)
	const emptyCartLoading = ref(false)

	const emptyCart = async () => {
		emptyCartLoading.value = true
		try {
			await sanctum(endpoint.value, { method: 'DELETE' })
			clearNuxtData('cart')
			await refreshNuxtData('cart')
			showEmptyConfirm.value = false
			uiFeedback.success('Carrello svuotato.')
		} catch {
			uiFeedback.error('Errore durante lo svuotamento del carrello', 'Riprova.')
		} finally {
			emptyCartLoading.value = false
		}
	}

	const formatPrice = formatPriceCents

	const formatDate = (item) => {
		const today = new Date().toLocaleDateString('it-IT', {
			day: '2-digit', month: '2-digit', year: 'numeric',
		})
		if (item.created_at) return formatDateIt(item.created_at, today)
		return today
	}

	// --- AGGIORNAMENTO QUANTITA' ---
	const quantityUpdating = ref(null)

	const updateQuantity = async (itemId, newQty) => {
		let qty = Number(newQty) || 1
		if (qty < 1) qty = 1
		if (qty > 100) qty = 100
		quantityUpdating.value = itemId
		try {
			await sanctum(`/api/cart/${itemId}/quantity`, {
				method: 'PATCH',
				body: { quantity: qty },
			})
			clearNuxtData('cart')
			await refreshNuxtData('cart')
		} catch {
			uiFeedback.error('Errore nell\'aggiornamento della quantit\u00E0', 'Riprova.')
		} finally {
			quantityUpdating.value = null
		}
	}

	// --- RAGGRUPPAMENTO PER INDIRIZZO ---
	const addressGroups = computed(() => cart.value?.meta?.address_groups || [])

	onMounted(() => {
		const saved = sessionStorage.getItem('cart_expanded_groups')
		if (saved) {
			try {
				expandedGroups.value = JSON.parse(saved)
			} catch (e) {
				if (import.meta.dev) {
					console.warn('[useCart] cart_expanded_groups JSON malformato, reset al default', e)
				}
				sessionStorage.removeItem('cart_expanded_groups')
			}
		}
	})

	watch(expandedGroups, (newVal) => {
		sessionStorage.setItem('cart_expanded_groups', JSON.stringify(newVal))
	}, { deep: true })

	const toggleGroup = (groupIdx) => {
		expandedGroups.value[groupIdx] = !isGroupExpanded(groupIdx)
	}

	const isGroupExpanded = (groupIdx) => expandedGroups.value[groupIdx] !== false

	const displayEntries = computed(() =>
		buildDisplayEntries(filteredCartItems.value, addressGroups.value),
	)

	// --- COUPON / CODICE SCONTO ---
	const {
		appliedTotal,
		applyCoupon,
		couponApplied,
		couponCode,
		couponDiscount,
		couponMessage,
		discountedTotal,
		removeCoupon,
		showCouponField,
		showCouponPanel,
	} = useCartPromoPreview({
		sanctum,
		total: computed(() => cart.value?.meta?.total || '0,00€'),
	})

	const displayTotal = computed(() =>
		couponApplied.value && discountedTotal.value
			? discountedTotal.value
			: cart.value?.meta?.total,
	)

	return {
		// Cart data
		cart,
		refresh,
		status,
		isAuthenticated,

		// Promo
		promoSettings,

		// Filters
		filterProvenienza,
		filterRiferimento,
		filteredCartItems,
		uniqueCities,

		// Delete
		showDeleteConfirm,
		deleteLoading,
		askDelete,
		confirmDelete,

		// Empty cart
		showEmptyConfirm,
		emptyCartLoading,
		emptyCart,

		// Prices
		formatPrice,
		unitPrice,
		formatDate,
		getPackageIcon,

		// Quantity
		quantityUpdating,
		updateQuantity,
		quantityButtonClass: QUANTITY_BUTTON_CLASS,
		quantityButtonCompactClass: QUANTITY_BUTTON_COMPACT_CLASS,
		quantityButtonMobileClass: QUANTITY_BUTTON_MOBILE_CLASS,

		// Grouping
		addressGroups,
		groupColors: CART_GROUP_COLORS,
		expandedGroups,
		toggleGroup,
		isGroupExpanded,
		displayEntries,

		// Coupon
		couponCode,
		couponMessage,
		couponApplied,
		couponDiscount,
		appliedTotal,
		showCouponField,
		showCouponPanel,
		applyCoupon,
		removeCoupon,
		displayTotal,

		// Auth gate
		authCheckoutRedirect,
		openCheckoutWithAuthGate,
	}
}
