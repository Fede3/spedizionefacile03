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
} from '~/utils/shipmentFlowState';

export function useCartOperations() {
	const { user } = useSanctumAuth();
	const { cart, refresh: refreshCart } = useCart();
	const { session } = useSession();
	const userStore = useUserStore();
	const sanctum = useSanctumClient();
	const route = useRoute();

	// --- PROMO ---
	const { loadPriceBands, priceBands, promoSettings } = usePriceBands();

	// --- FALLBACK ROUTE ---
	const fallbackFlowRoute = computed(() => {
		const remoteFlowState = resolveShipmentFlowState(session.value?.data || {});
		const localFlowState = deriveShipmentFlowStateFromUserStore(userStore);
		return pickMostAdvancedShipmentFlowState(remoteFlowState, localFlowState).last_valid_route || '/preventivo';
	});

	// --- EXISTING ORDER ---
	const existingOrderId = computed(() => route.query.order_id || null);
	const pageReady = ref(false);
	const existingOrder = ref(null);

	const initCheckoutPage = async () => {
		if (existingOrderId.value) {
			try {
				const orderData = await sanctum(`/api/orders/${existingOrderId.value}`);
				existingOrder.value = orderData?.data || orderData;
				return true;
			} catch {
				await navigateTo(fallbackFlowRoute.value, { replace: true });
				return false;
			}
		}

		clearNuxtData('cart');
		await refreshCart();

		if (!cart.value || cart.value.data?.length === 0) {
			await navigateTo(fallbackFlowRoute.value, { replace: true });
			return false;
		}

		return true;
	};

	// --- PRICE HELPERS ---
	const formatPrice = (cents) => {
		if (!cents && cents !== 0) return '0€';
		const euros = Number(cents) / 100;
		return euros.toFixed(2).replace('.', ',') + '€';
	};

	const displayPackages = computed(() => {
		if (existingOrder.value) return existingOrder.value.packages || [];
		return cart.value?.data || [];
	});

	const addressGroups = computed(() => cart.value?.meta?.address_groups || []);
	const hasMultipleGroups = computed(() => addressGroups.value.filter((g) => g.count >= 1).length > 1);
	const mergeGroupsCount = computed(() => addressGroups.value.length);

	const getTotal = computed(() => {
		if (existingOrder.value) return existingOrder.value.subtotal || '0,00€';
		return cart.value?.meta?.total || '0,00€';
	});

	const getNumberTotal = computed(() => {
		const cleaned = String(getTotal.value)
			.replace(/[€\sEUR]/gi, '')
			.replace(/\./g, '')
			.replace(',', '.');
		return Number(cleaned) || 0;
	});

	const totalPackages = computed(() => {
		return displayPackages.value.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
	});

	const contentDescription = computed(() => {
		if (!displayPackages.value.length) return '';
		const types = displayPackages.value.map((item) => item.package_type || 'Pacco').filter(Boolean);
		return [...new Set(types)].join(', ');
	});

	// --- BILLING ---
	const fatturazioneType = ref('ricevuta');
	const invoiceSubjectType = ref('azienda');
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
	});

	const billingShippingSource = computed(() => {
		const pkg = displayPackages.value?.[0];
		return pkg?.origin_address || pkg?.destination_address || null;
	});

	const billingShippingAddressLine = computed(() => {
		const address = billingShippingSource.value;
		if (!address) return '';
		return [address.address, address.address_number].filter(Boolean).join(' ').trim();
	});

	const billingShippingFullAddress = computed(() => {
		const address = billingShippingSource.value;
		if (!address) return '';
		return [
			[address.address, address.address_number].filter(Boolean).join(' ').trim(),
			[address.postal_code, address.city].filter(Boolean).join(' '),
			address.province ? `(${address.province})` : '',
		]
			.filter(Boolean)
			.join(', ');
	});

	const applyShippingDataToBilling = () => {
		const address = billingShippingSource.value;
		if (!address) return;

		if (invoiceSubjectType.value === 'privato') {
			fatturaData.value.nome_completo = fatturaData.value.nome_completo || address.name || '';
		} else if (!fatturaData.value.ragione_sociale) {
			fatturaData.value.ragione_sociale = address.name || '';
		}

		fatturaData.value.indirizzo = fatturaData.value.indirizzo || billingShippingAddressLine.value;
		fatturaData.value.city = fatturaData.value.city || address.city || '';
		fatturaData.value.province = fatturaData.value.province || address.province || '';
		fatturaData.value.postal_code = fatturaData.value.postal_code || address.postal_code || '';
	};

	watch(
		[invoiceSubjectType, billingShippingSource],
		() => {
			applyShippingDataToBilling();
		},
		{ immediate: true },
	);

	watch(invoiceSubjectType, (subjectType) => {
		if (subjectType === 'privato') {
			fatturaData.value.ragione_sociale = '';
			fatturaData.value.p_iva = '';
		}
		applyShippingDataToBilling();
	});

	watch(fatturazioneType, (type) => {
		if (type === 'fattura') {
			applyShippingDataToBilling();
		}
	});

	const billingPayload = computed(() => {
		if (fatturazioneType.value !== 'fattura') {
			return { type: 'ricevuta' };
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
		};
	});

	// --- WALLET ---
	const walletBalance = ref(0);
	const walletLoaded = ref(false);

	const loadWalletBalance = async () => {
		if (walletLoaded.value) return;
		try {
			const result = await sanctum('/api/wallet/balance');
			walletBalance.value = Number(result?.balance ?? 0);
			walletLoaded.value = true;
		} catch {
			walletBalance.value = 0;
			walletLoaded.value = true;
		}
	};

	const walletFormatted = computed(() => walletBalance.value.toFixed(2).replace('.', ',') + '€');

	// --- COUPON / REFERRAL ---
	const couponCode = ref('');
	const couponLoading = ref(false);
	const couponError = ref(null);
	const couponApplied = ref(null);
	const couponPanelOpen = ref(false);

	const validateCoupon = async () => {
		if (!couponCode.value || couponCode.value.trim().length < 2) return;
		couponLoading.value = true;
		couponError.value = null;
		couponApplied.value = null;
		try {
			const result = await sanctum('/api/calculate-coupon', {
				method: 'POST',
				body: { coupon: couponCode.value.trim().toUpperCase(), total: getNumberTotal.value },
			});
			if (result?.success) {
				couponApplied.value = {
					type: result.type || 'coupon',
					discount_percent: result.percentage,
					discount_amount: result.discount_amount,
					pro_name: result.pro_user_name || '',
					code: result.referral_code || couponCode.value.trim().toUpperCase(),
				};
				couponPanelOpen.value = true;
			}
		} catch {
			const data = e?.response?._data || e?.data;
			couponError.value = data?.error || data?.message || 'Codice non valido.';
			couponPanelOpen.value = true;
		} finally {
			couponLoading.value = false;
		}
	};

	const autoApplyReferral = async () => {
		if (couponApplied.value) return;
		try {
			const result = await sanctum('/api/referral/my-discount');
			if (result?.has_discount && result?.referral_code) {
				couponCode.value = result.referral_code;
				const discountAmount = Math.round(getNumberTotal.value * (result.discount_percent / 100) * 100) / 100;
				couponApplied.value = {
					type: 'referral',
					discount_percent: result.discount_percent,
					discount_amount: discountAmount,
					pro_name: result.pro_name || '',
					code: result.referral_code,
				};
			}
		} catch {
			// Silently ignore - user may not have referral
		}
	};

	const removeCoupon = () => {
		couponApplied.value = null;
		couponCode.value = '';
		couponError.value = null;
		couponPanelOpen.value = false;
	};

	// --- TOTALS (depend on coupon) ---
	const finalTotal = computed(() => {
		if (couponApplied.value) {
			return Math.max(0, getNumberTotal.value - couponApplied.value.discount_amount);
		}
		return getNumberTotal.value;
	});

	const finalTotalFormatted = computed(() => {
		return finalTotal.value.toFixed(2).replace('.', ',') + '€';
	});

	const walletSufficient = computed(() => walletBalance.value >= finalTotal.value);

	return {
		// dependencies exposed for other composables
		cart,
		refreshCart,
		sanctum,
		userStore,
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
	};
}
