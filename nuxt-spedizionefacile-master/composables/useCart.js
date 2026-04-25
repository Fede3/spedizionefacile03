// composables/useCart.js
// Tre composable per contesti diversi:
//   - useCart()           â†’ checkout (ShipmentStepPagamento + useCheckout)
//   - useCartOperations() â†’ alias retro-compat con extra per facade useCheckout
//   - useCarrello()       â†’ pagina /carrello (filtri, raggruppamento, coupon UI)

import { formatPrice as formatPriceCents } from '~/utils/price'
import { formatDateIt } from '~/utils/date'
import {
	buildDiscountOrderContext,
	parseEuroAmount,
} from '~/utils/discountPreview'
import { useCartPromoPreview } from '~/features/wallet-referral/useCartPromoPreview'
import { useCheckoutPromoPreview } from '~/features/wallet-referral/useCheckoutPromoPreview'
import {
	deriveShipmentFlowStateFromUserStore,
	pickMostAdvancedShipmentFlowState,
	resolveShipmentFlowState,
} from '~/utils/shipment'

// ============================================================================
// SEZIONE 1 â€” useCart(): stato checkout, billing, wallet, coupon
// ============================================================================

/**
 * Composable principale: cart + billing + wallet + coupon per la pagina pagamento.
 * Tutti i dati reattivi per ShipmentStepPagamento.vue sono esposti qui.
 * @returns stato reattivo e azioni (init, refresh, validateCoupon, loadWalletBalance, ...)
 */
export function useCart() {
	const route = useRoute()
	const sanctum = useSanctumClient()
	const { user, isAuthenticated } = useSanctumAuth()
	// usePriceBands carica /api/promo (price bands + promo flags).
	const { loadPriceBands, priceBands, promoSettings } = usePriceBands()

	// ---------- FALLBACK ROUTE ----------
	// Usato da useCartOperations()/useCheckout quando il cart risulta vuoto,
	// per riportare l'utente alla rotta piu' avanzata del flusso spedizione.
	const { session } = useSession()
	const userStore = useShipmentFlowStore()
	const fallbackFlowRoute = computed(() => {
		const remoteFlowState = resolveShipmentFlowState(session.value?.data || {})
		const localFlowState = deriveShipmentFlowStateFromUserStore(userStore)
		return pickMostAdvancedShipmentFlowState(remoteFlowState, localFlowState).last_valid_route || '/preventivo'
	})

	// ---------- STATO CART ----------
	// cart.data = array pacchi; cart.meta = { total, address_groups }
	const cart = ref({ data: [], meta: { total: '0,00â‚¬', address_groups: [] } })
	const pageReady = ref(false)
	const existingOrder = ref(null)

	/** ID ordine letto dalla query string `?order_id=123` (null se checkout nuovo). */
	const existingOrderId = computed(() => {
		const raw = Array.isArray(route.query.order_id) ? route.query.order_id[0] : route.query.order_id
		return raw ? String(raw) : null
	})

	const centsToEuro = (value) => {
		const cents = Number(value)
		return Number.isFinite(cents) ? Math.max(0, cents) / 100 : 0
	}

	const existingOrderGrossTotal = computed(() => {
		if (!existingOrder.value) return 0
		return centsToEuro(existingOrder.value.gross_subtotal_cents ?? existingOrder.value.subtotal_cents)
	})

	const existingOrderPayableTotal = computed(() => {
		if (!existingOrder.value) return 0
		const payableCents = Number(existingOrder.value.payable_total_cents)
		if (Number.isFinite(payableCents)) return centsToEuro(payableCents)

		const discountCents = Number(existingOrder.value.discount_amount_cents ?? 0)
		return Math.max(0, existingOrderGrossTotal.value - centsToEuro(discountCents))
	})

	/**
	 * Carica cart o ordine esistente + verifica auth.
	 * Chiamato al mount di ShipmentStepPagamento.vue.
	 * @returns {Promise<boolean>} true se OK, false se auth manca o caricamento fallisce.
	 */
	async function initCheckoutPage() {
		existingOrder.value = null

		// Caso A: rifatturazione ordine esistente (retry pagamento).
		if (existingOrderId.value) {
			try {
				const res = await sanctum(`/api/orders/${existingOrderId.value}`)
				existingOrder.value = res?.data ?? res ?? null
				pageReady.value = true
				return true
			} catch {
				existingOrder.value = null
				pageReady.value = false
				return false
			}
		}

		if (!isAuthenticated.value || !user.value) {
			pageReady.value = false
			return false
		}

		// Caso B: checkout standard da carrello.
		await refreshCart()
		const hasItems = Array.isArray(cart.value?.data) && cart.value.data.length > 0
		pageReady.value = hasItems
		return hasItems
	}

	/** Ricarica il carrello dal backend. Silenzia errori: in caso KO il cart resta quello precedente. */
	async function refreshCart() {
		try {
			const res = await sanctum('/api/cart')
			cart.value = res?.data ? { data: res.data, meta: res.meta || {} } : (res || cart.value)
		} catch {
			// cart precedente mantenuto
		}
	}

	// ---------- PACCHI & TOTALI ----------
	/** Packages da mostrare: se rifatturazione usa existingOrder.packages, altrimenti cart.data. */
	const displayPackages = computed(() => {
		if (existingOrder.value) return existingOrder.value.packages || []
		return cart.value?.data || []
	})

	/** Totale "raw" dal backend (stringa "20,00â‚¬" o numero). */
	const getTotal = computed(() => {
		if (existingOrder.value) return existingOrderGrossTotal.value
		return cart.value?.meta?.total || '0,00â‚¬'
	})

	/** Totale numerico (euro float). Utile per calcoli coupon. */
	const getNumberTotal = computed(() => {
		return parseEuroAmount(getTotal.value)
	})

	const totalPackages = computed(() =>
		displayPackages.value.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0),
	)

	/** Descrizione contenuto: "Pacco, Pallet" (tipi unici, joined). */
	const contentDescription = computed(() => {
		if (!displayPackages.value.length) return ''
		const types = displayPackages.value.map((item) => item.package_type || 'Pacco').filter(Boolean)
		return [...new Set(types)].join(', ')
	})

	const addressGroups = computed(() => cart.value?.meta?.address_groups || [])
	const hasMultipleGroups = computed(() => addressGroups.value.filter((g) => g.count >= 1).length > 1)
	const mergeGroupsCount = computed(() => addressGroups.value.length)

	/**
	 * Formatter "0,00 â‚¬". Accetta euro-float (es. 20 â†’ "20,00 â‚¬").
	 * Per centesimi usa `formatPrice` da utils/price (quello importato qui formatta cents).
	 * Questa versione lavora in EURO per i totali già decimali del cart.
	 * @param {number|string} num
	 * @returns {string}
	 */
	function formatPrice(num) {
		const n = Number(num)
		if (!Number.isFinite(n)) return '0,00 \u20AC'
		return n.toFixed(2).replace('.', ',') + '\u00A0\u20AC'
	}

	const existingOrderDiscountPreview = computed(() => {
		const context = existingOrder.value?.discount_context
		if (!context || typeof context !== 'object') return null

		const type = String(context.type || '').trim().toLowerCase()
		const code = String(context.code || '').trim().toUpperCase()
		if (!type || !code) return null

		return {
			type,
			code,
			discount_percent: Number(context.discount_percent ?? 0),
			discount_amount: Number(context.discount_amount ?? 0),
			subtotal_raw: Number(context.subtotal_raw ?? existingOrderGrossTotal.value),
			final_total_raw: Number(context.final_total_raw ?? existingOrderPayableTotal.value),
			new_total_raw: Number(context.final_total_raw ?? existingOrderPayableTotal.value),
			new_total: existingOrder.value?.payable_total || formatPrice(existingOrderPayableTotal.value),
			pro_name: String(context.pro_name || '').trim(),
		}
	})

	const existingOrderCanAcceptDiscount = computed(() => {
		if (!existingOrder.value || existingOrderDiscountPreview.value) return false
		const status = String(existingOrder.value.raw_status || '').trim().toLowerCase()
		return ['pending', 'payment_failed'].includes(status)
	})

	// ---------- BILLING / FATTURAZIONE ----------
	const fatturazioneType = ref('ricevuta') // 'ricevuta' | 'fattura'
	const invoiceSubjectType = ref('azienda') // 'azienda' | 'privato'
	const fatturaData = ref({
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

	/** Primo indirizzo utile dal carrello: preferisce origin, fallback destination. */
	const billingShippingSource = computed(() => {
		const pkg = displayPackages.value?.[0]
		return pkg?.origin_address || pkg?.destination_address || null
	})

	const billingShippingAddressLine = computed(() => {
		const a = billingShippingSource.value
		if (!a) return ''
		return [a.address, a.address_number].filter(Boolean).join(' ').trim()
	})

	/** Indirizzo completo formattato per display: "Via Roma 10, 00100 Roma (RM)". */
	const billingShippingFullAddress = computed(() => {
		const a = billingShippingSource.value
		if (!a) return ''
		return [
			billingShippingAddressLine.value,
			[a.postal_code, a.city].filter(Boolean).join(' '),
			a.province ? `(${a.province})` : '',
		].filter(Boolean).join(', ')
	})

	/** Pre-popola i campi fattura vuoti con i dati spedizione. Non sovrascrive input utente. */
	function applyShippingDataToBilling() {
		const a = billingShippingSource.value
		if (!a) return
		if (invoiceSubjectType.value === 'privato') {
			fatturaData.value.nome_completo = fatturaData.value.nome_completo || a.name || ''
		} else if (!fatturaData.value.ragione_sociale) {
			fatturaData.value.ragione_sociale = a.name || ''
		}
		fatturaData.value.indirizzo = fatturaData.value.indirizzo || billingShippingAddressLine.value
		fatturaData.value.city = fatturaData.value.city || a.city || ''
		fatturaData.value.province = fatturaData.value.province || a.province || ''
		fatturaData.value.postal_code = fatturaData.value.postal_code || a.postal_code || ''
	}

	// Ogni volta che cambia il tipo soggetto o l'indirizzo, riapplichiamo i default.
	watch([invoiceSubjectType, billingShippingSource], applyShippingDataToBilling, { immediate: true })

	// Passando privato â†’ azienda o viceversa, pulisci i campi non pertinenti.
	watch(invoiceSubjectType, (subjectType) => {
		if (subjectType === 'privato') {
			fatturaData.value.ragione_sociale = ''
			fatturaData.value.p_iva = ''
		}
		applyShippingDataToBilling()
	})

	watch(fatturazioneType, (type) => {
		if (type === 'fattura') applyShippingDataToBilling()
	})

	/** Payload per checkout: ricevuta = minimale, fattura = dati completi. */
	const billingPayload = computed(() => {
		if (fatturazioneType.value !== 'fattura') return { type: 'ricevuta' }
		const d = fatturaData.value
		const isAzienda = invoiceSubjectType.value === 'azienda'
		const src = billingShippingSource.value
		return {
			type: 'fattura',
			subject_type: invoiceSubjectType.value,
			same_as_shipping: false,
			nome_completo: d.nome_completo?.trim() || null,
			ragione_sociale: d.ragione_sociale?.trim() || null,
			p_iva: d.p_iva?.trim() || null,
			codice_fiscale: d.codice_fiscale?.trim() || null,
			indirizzo: d.indirizzo?.trim() || null,
			city: d.city?.trim() || null,
			province: d.province?.trim() || null,
			postal_code: d.postal_code?.trim() || null,
			pec: isAzienda ? d.pec?.trim() || null : null,
			codice_sdi: isAzienda ? d.codice_sdi?.trim() || null : null,
			shipping_reference: src
				? {
						name: src.name || null,
						address: billingShippingAddressLine.value || null,
						city: src.city || null,
						province: src.province || null,
						postal_code: src.postal_code || null,
					}
				: null,
		}
	})

	// ---------- WALLET ----------
	const walletBalance = ref(0)
	const walletLoadedRef = ref(false)

	/** Carica saldo wallet (idempotente: non re-fetcha se già caricato). */
	async function loadWalletBalance() {
		if (walletLoadedRef.value) return
		try {
			const result = await sanctum('/api/wallet/balance')
			walletBalance.value = Number(result?.balance ?? 0)
		} catch {
			walletBalance.value = 0
		} finally {
			walletLoadedRef.value = true
		}
	}

	const walletFormatted = computed(() => walletBalance.value.toFixed(2).replace('.', ',') + '\u00A0\u20AC')
	const walletLoaded = computed(() => walletLoadedRef.value)

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

	const displayedCouponApplied = computed(() =>
		existingOrderDiscountPreview.value || couponApplied.value,
	)

	function validateCheckoutCoupon() {
		if (existingOrder.value && !existingOrderCanAcceptDiscount.value) {
			couponError.value = 'Il totale di questo ordine e\' gia\' bloccato. Crea un nuovo preventivo per usare un altro codice.'
			return
		}
		return validateCoupon()
	}

	function removeDisplayedCoupon() {
		if (existingOrderDiscountPreview.value) return
		removeCoupon()
	}

	// ---------- TOTALI FINALI (post coupon) ----------
	/**
	 * Totale preview post-sconto mostrato in checkout.
	 * Boundary importante:
	 * - serve alla UI e ai controlli locali
	 * - non implica automaticamente che lo sconto sia gia' persistito sull'ordine backend
	 */
	const finalTotal = computed(() => {
		if (existingOrderDiscountPreview.value) return existingOrderPayableTotal.value
		if (existingOrder.value && couponApplied.value) return discountedTotal.value
		if (existingOrder.value) return existingOrderPayableTotal.value
		return discountedTotal.value
	})

	/** Totale finale formattato italiano con non-breaking space: "20,00 â‚¬". */
	const finalTotalFormatted = computed(() => {
		if (existingOrder.value?.payable_total && !couponApplied.value) return existingOrder.value.payable_total
		return Number(finalTotal.value).toFixed(2).replace('.', ',') + '\u00A0\u20AC'
	})

	const walletSufficient = computed(() => walletBalance.value >= finalTotal.value)

	/**
	 * Bridge canonico frontend tra preview sconto UI e boundary ordine/pagamento.
	 * Non rende ancora lo sconto persistito lato backend, ma fa viaggiare lo stesso
	 * contesto preview nei payload checkout per evitare drift tra step diversi.
	 */
	const discountContext = computed(() =>
		buildDiscountOrderContext({
			preview: displayedCouponApplied.value,
			subtotal: getNumberTotal.value,
			finalTotal: finalTotal.value,
		})
	)

	return {
		// cart & page state
		cart,
		pageReady,
		existingOrderId,
		existingOrder,
		initCheckoutPage,
		refreshCart,

		// dipendenze esposte per compatibilita' con codice storico (useCheckout facade
		// archiviato 2026-04-20 in _archive/cleanup-features-2026-04-20/composables-consolidati-payment/)
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
// SEZIONE 2 â€” useCartOperations(): ALIAS retro-compat di useCart()
// ============================================================================
// Nota storica: era un file a se stante (useCartOperations.js, 359 LOC) che
// duplicava ~95% della logica di useCart. L'unica chiamata rimasta e' da
// useCheckout.js (facade). Consolidato qui come re-export per preservare
// l'API pubblica senza toccare il facade. I consumer continuano a chiamare
// `const cartOps = useCartOperations()` e ricevono esattamente lo stesso
// shape dell'originale.

export function useCartOperations() {
	return useCart()
}

// ============================================================================
// SEZIONE 3 â€” useCarrello(): logica pagina /carrello
// ============================================================================
// State e API distinti da useCart perche' la pagina /carrello ha:
//  - couponApplied SEMANTICA DIVERSA (boolean vs object di useCart)
//  - filtri indirizzi, raggruppamento, quantita' inline, auth gate guest
//  - usa useCartFetch (reattivo a prerender/route) invece di fetch diretto
// Tentare di unificare rompeva la retro-compat dei consumer in pages/carrello.vue.

/**
 * @typedef {import('~/types').CartItem} CartItem
 * @typedef {import('~/types').AddressGroup} AddressGroup
 * @typedef {{ type: 'success' | 'error', text: string }} CouponMessage
 * @typedef {{ success?: boolean, percentage?: number, new_total?: number }} CouponResponse
 * @typedef {{ type: 'group', groupIndex: number, group: AddressGroup, items: CartItem[], totalCents: number, color: string }} DisplayGroupEntry
 * @typedef {{ type: 'single', groupIndex: number, item: CartItem }} DisplaySingleEntry
 * @typedef {DisplayGroupEntry | DisplaySingleEntry} DisplayEntry
 */

/** Composable carrello: filtri, raggruppamento indirizzi, coupon, auth gate checkout per guest. */
export function useCarrello() {
	const { cart, refresh, status } = useCartFetch()
	const { isAuthenticated } = useSanctumAuth()
	const { openAuthModal } = useAuthModal()
	const sanctum = useSanctumClient()
	const route = useRoute()
	const uiFeedback = useUiFeedback()

	// Promo settings per banner e badge
	const { loadPriceBands, promoSettings } = usePriceBands()
	onMounted(async () => { await loadPriceBands() })

	// Endpoint diverso per svuotare il carrello in base a se l'utente e' loggato o ospite
	const endpoint = computed(() => (isAuthenticated.value ? '/api/empty-cart' : '/api/empty-guest-cart'))

	// Redirect post-login quando il guest avvia checkout dal carrello.
	// /checkout resta trampoline legacy inbound; i flussi vivi usano la rotta canonica del funnel.
	const authCheckoutRedirect = '/la-tua-spedizione/2?step=pagamento'

	// Apertura modal auth unificato (AuthOverlayModal globale). Se gia' autenticato
	// naviga direttamente al checkout. Altrimenti apre il modal con tab richiesto
	// (default: login) e redirect post-auth = /checkout.
	const openCheckoutWithAuthGate = (tab = 'login') => {
		if (isAuthenticated.value) {
			navigateTo(authCheckoutRedirect)
			return
		}
		openAuthModal({
			tab,
			redirect: authCheckoutRedirect,
		})
	}

	// Aggiorna i dati del carrello ogni volta che la pagina viene visitata
	onMounted(async () => {
		if (route.query.updated) {
			clearNuxtData('cart')
		}
		await refresh()

		if (cart.value?.meta?.address_groups) {
			const mergedGroups = cart.value.meta.address_groups.filter((g) => g.package_ids?.length > 1)
			if (mergedGroups.length > 0) {
				const totalMerged = mergedGroups.reduce((sum, g) => sum + g.package_ids.length, 0)
				uiFeedback.info(`${totalMerged} pacchi identici sono stati uniti automaticamente`, '', { timeout: 5000 })
			}
		}
	})

	// --- FILTRI ---
	const filterProvenienza = ref('')
	const filterRiferimento = ref('')

	const filteredCartItems = computed(() => {
		if (!cart.value?.data) return []
		let items = [...cart.value.data]
		if (filterProvenienza.value) {
			items = items.filter((item) =>
				item.origin_address?.city?.toLowerCase().includes(filterProvenienza.value.toLowerCase())
			)
		}
		if (filterRiferimento.value) {
			items = items.filter((item) =>
				String(item.id).includes(filterRiferimento.value) ||
				(item.origin_address?.name || '').toLowerCase().includes(filterRiferimento.value.toLowerCase()) ||
				(item.destination_address?.name || '').toLowerCase().includes(filterRiferimento.value.toLowerCase())
			)
		}
		return items
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
		} catch (e) {
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
		} catch (error) {
			uiFeedback.error('Errore durante lo svuotamento del carrello', 'Riprova.')
		} finally {
			emptyCartLoading.value = false
		}
	}

	// formatPrice: usa la utility centsâ†’â‚¬ da utils/price (import in cima al file).
	// Alias locale per non scontrarsi con la formatPrice(num: euro) definita in useCart().
	const formatPrice = formatPriceCents

	const unitPrice = (item) => {
		const total = Number(item.single_price) || 0
		const qty = Math.max(1, Number(item.quantity) || 1)
		return total / qty
	}

	// --- AGGIORNAMENTO QUANTITA' ---
	const quantityUpdating = ref(null)

	const updateQuantity = async (itemId, newQty) => {
		if (newQty < 1) newQty = 1
		if (newQty > 100) newQty = 100
		quantityUpdating.value = itemId
		try {
			await sanctum(`/api/cart/${itemId}/quantity`, {
				method: 'PATCH',
				body: { quantity: newQty },
			})
			clearNuxtData('cart')
			await refreshNuxtData('cart')
		} catch (e) {
			uiFeedback.error('Errore nell\'aggiornamento della quantit\u00E0', 'Riprova.')
		} finally {
			quantityUpdating.value = null
		}
	}

	const formatDate = (item) => {
		if (item.created_at) {
			return formatDateIt(item.created_at, new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }))
		}
		return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
	}

	const getPackageIcon = (item) => {
		const type = item.package_type?.toLowerCase() || ''
		if (type.includes('pallet')) return '/img/quote/first-step/pallet.png'
		if (type.includes('busta')) return '/img/quote/first-step/envelope.png'
		if (type.includes('valigia')) return '/img/quote/first-step/suitcase.png'
		return '/img/quote/first-step/pack.png'
	}

	// --- RAGGRUPPAMENTO PER INDIRIZZO ---
	const addressGroups = computed(() => cart.value?.meta?.address_groups || [])
	const groupColors = ['#095866', '#E44203', '#6B21A8', '#0369A1', '#B45309']

	const expandedGroups = ref({})

	onMounted(() => {
		const saved = sessionStorage.getItem('cart_expanded_groups')
		if (saved) {
			try {
				expandedGroups.value = JSON.parse(saved)
			} catch (e) {
				// sessionStorage corrotto: ripartiamo dal default. Log solo in dev per diagnosi.
				if (import.meta.dev) console.warn('[useCart] cart_expanded_groups JSON malformato, reset al default', e)
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

	const isGroupExpanded = (groupIdx) => {
		return expandedGroups.value[groupIdx] !== false
	}

	const displayEntries = computed(() => {
		const items = filteredCartItems.value
		if (!items.length) return []

		const filteredIds = new Set(items.map((i) => i.id))
		const usedIds = new Set()
		const entries = []

		for (let gIdx = 0; gIdx < addressGroups.value.length; gIdx++) {
			const group = addressGroups.value[gIdx]
			const groupItems = (group.package_ids || [])
				.filter((id) => filteredIds.has(id) && !usedIds.has(id))
				.map((id) => items.find((i) => i.id === id))
				.filter(Boolean)

			if (groupItems.length === 0) continue
			groupItems.forEach((i) => usedIds.add(i.id))

			if (groupItems.length > 1) {
				const groupTotal = groupItems.reduce((sum, i) => sum + (Number(i.single_price) || 0), 0)
				entries.push({
					type: 'group',
					groupIndex: gIdx,
					group,
					items: groupItems,
					totalCents: groupTotal,
					color: groupColors[gIdx % groupColors.length],
				})
			} else {
				entries.push({
					type: 'single',
					groupIndex: gIdx,
					item: groupItems[0],
				})
			}
		}

		for (const item of items) {
			if (!usedIds.has(item.id)) {
				entries.push({
					type: 'single',
					groupIndex: -1,
					item,
				})
			}
		}

		return entries
	})

	// --- COUPON / CODICE SCONTO (boundary canonico UI carrello) ---
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

	const displayTotal = computed(() => {
		return couponApplied.value && discountedTotal.value ? discountedTotal.value : cart.value?.meta?.total
	})

	// CSS classes for quantity buttons
	const quantityButtonClass = "w-[32px] h-[32px] tablet:w-[24px] tablet:h-[24px] flex items-center justify-center rounded-full bg-[#EEF2F3] text-[#252B42] text-[0.875rem] tablet:text-[0.75rem] font-bold hover:bg-[#DDE5E7] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-[0.97]"
	const quantityButtonCompactClass = "w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#EEF2F3] text-[#252B42] text-[0.75rem] font-bold hover:bg-[#DDE5E7] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-[0.97]"
	const quantityButtonMobileClass = "w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#EEF2F3] text-[#252B42] text-[0.875rem] font-bold hover:bg-[#DDE5E7] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-[0.97]"

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
		quantityButtonClass,
		quantityButtonCompactClass,
		quantityButtonMobileClass,

		// Grouping
		addressGroups,
		groupColors,
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

		// Auth gate (unificato su AuthOverlayModal globale)
		authCheckoutRedirect,
		openCheckoutWithAuthGate,
	}
}
