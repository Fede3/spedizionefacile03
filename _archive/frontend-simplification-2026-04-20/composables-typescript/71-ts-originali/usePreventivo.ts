export const usePreventivo = () => {
	// --- DIPENDENZE GLOBALI ---
	const shipmentFlowStore = useShipmentFlowStore();
	const route = useRoute();
	const runtimeConfig = useRuntimeConfig();
	const apiBase = String(runtimeConfig.public?.apiBase || "http://127.0.0.1:8787").replace(/\/$/, "");

	// --- AUTO-QUOTE TIMER (shared mutable state across sub-composables) ---
	// Uses a simple object wrapper so sub-composables can read/write the timer.
	const _timerBox: { value: ReturnType<typeof setTimeout> | null } = { value: null };
	const autoQuoteTimerRef = (...args: Array<ReturnType<typeof setTimeout> | null>): ReturnType<typeof setTimeout> | null => {
		if (args.length === 0) return _timerBox.value;
		_timerBox.value = args[0];
		return _timerBox.value;
	};

	onBeforeUnmount(() => {
		const timer = autoQuoteTimerRef();
		if (timer) {
			clearTimeout(timer);
		}
	});

	// --- PRICE BANDS ---
	const { loadPriceBands, getWeightPrice, getVolumePrice, getCapSupplement, getEuropeQuote, priceBands, promoSettings } = usePriceBands();
	onMounted(() => {
		loadPriceBands().catch(() => {});
	});

	// --- LOCATION SEARCH ---
	const publicApiFetchForLocation = async (path: string, options: Record<string, unknown> = {}) => {
		const url = path.startsWith("http") ? path : `${apiBase}${path}`;
		return await $fetch(url, { credentials: "include", ...options });
	};
	const locationSearch = useLocationSearch(publicApiFetchForLocation);

	// --- SESSION ---
	const { session, refresh } = useSession();

	// --- PACKAGES ---
	const {
		addPackageInline,
		calcPriceWithVolume,
		calcPriceWithWeight,
		calcQuantity,
		checkPrices,
		decrementQuantity,
		deletePack,
		ensurePackagesIdentity,
		europeRestrictionMessage,
		incrementQuantity,
		isEuropeMonocollo,
		packageTypeList,
		recalculatePackagesTotal,
		selectPackageType,
		updatePackageType,
	} = useQuickQuotePackages({
		shipmentFlowStore,
		getWeightPrice,
		getVolumePrice,
		getCapSupplement,
		getEuropeQuote,
		priceBands,
	});

	// --- COUNTRY COMPUTED (needed before sub-composables) ---
	const isDestinationItaly = computed(() => (
		String(shipmentFlowStore.shipmentDetails.destination_country_code || "IT").trim().toUpperCase() === "IT"
	));

	const isOriginItaly = computed(() => (
		String(shipmentFlowStore.shipmentDetails.origin_country_code || "IT").trim().toUpperCase() === "IT"
	));

	// --- QUOTE SNAPSHOT ---
	const {
		buildQuotePayloadSnapshot,
		buildQuoteComparableSignature,
		extractSessionComparablePayload,
		formatResolvedLocation,
		quoteSignature,
	} = usePreventivoQuoteSnapshot(shipmentFlowStore);

	// --- SMART VALIDATION (single shared instance) ---
	const sv = useSmartValidation();
	const onCapInputSmartForLocations = (fieldKey: string, value: string, countryCode: string = "IT") => {
		if (sv.isTouched(fieldKey)) {
			sv.validateCAP(fieldKey, value, { countryCode });
		}
	};

	// --- LOCATIONS ---
	const {
		destQuery,
		destSuggestions,
		getProvinceLabel,
		hideDestSuggestions,
		hideOriginSuggestions,
		locationKey,
		onDestQueryFocus,
		onDestQueryInput,
		onOriginQueryFocus,
		onOriginQueryInput,
		originQuery,
		originSuggestions,
		selectDestLocation,
		selectOriginLocation,
		settleDestQuery,
		settleOriginQuery,
		showDestSuggestions,
		showOriginSuggestions,
	} = useQuickQuoteLocations({
		shipmentDetails: shipmentFlowStore.shipmentDetails,
		search: locationSearch,
		smartValidation: sv,
		onCapInputSmart: onCapInputSmartForLocations,
	});

	// =====================================================================
	// SUB-COMPOSABLE 1: FORM
	// =====================================================================
	const {
		formRef,
		onWeightInput,
		onWeightBlur,
		onDimInput,
		onDimBlur,
		europeCountryOptions,
		applyOriginCountrySelection,
		applyDestinationCountrySelection,
		onDestManualInput,
		onDestManualBlur,
		onOriginManualInput,
		onOriginManualBlur,
		scrollToFirstError,
		ensurePrimaryPackage,
		resetForm: _resetFormInner,
		flushLocationDraftsForSubmit,
	} = usePreventivoForm({
		shipmentFlowStore,
		locationSearch,
		priceBands,
		packageTypeList,
		selectPackageType,
		ensurePackagesIdentity,
		checkPrices,
		calcPriceWithWeight,
		calcPriceWithVolume,
		originQuery,
		originSuggestions,
		showOriginSuggestions,
		destQuery,
		destSuggestions,
		showDestSuggestions,
		locationKey,
		getProvinceLabel,
		selectOriginLocation,
		selectDestLocation,
		settleOriginQuery,
		settleDestQuery,
		onOriginQueryFocus,
		onOriginQueryInput,
		onDestQueryFocus,
		onDestQueryInput,
		hideOriginSuggestions,
		hideDestSuggestions,
		isOriginItaly,
		isDestinationItaly,
		autoQuoteTimerRef,
		sv,
	});

	// Ensure at least one package exists on init
	ensurePrimaryPackage();

	// =====================================================================
	// SUB-COMPOSABLE 2: CALC
	// =====================================================================
	const {
		messageError,
		isCalculating,
		isSyncingQuote,
		isAdvancingToServices,
		lastQuotedSignature,
		syncQuoteStateFromSession,
		calculateRate,
		resetQuoteState,
		getPendingQuotePromise,
		getPendingQuoteSignature,
	} = usePreventivoCalc({
		shipmentFlowStore,
		apiBase,
		formRef,
		sv,
		scrollToFirstError,
		ensurePrimaryPackage,
		ensurePackagesIdentity,
		calcPriceWithWeight,
		calcPriceWithVolume,
		checkPrices,
		isOriginItaly,
		isDestinationItaly,
		isEuropeMonocollo,
		buildQuotePayloadSnapshot,
		buildQuoteComparableSignature,
		extractSessionComparablePayload,
		autoQuoteTimerRef,
	});

	// =====================================================================
	// SUB-COMPOSABLE 3: RESULTS & NAVIGATION
	// =====================================================================
	const {
		originLocationError,
		destLocationError,
		liveQuotePrice,
		continueButtonLabel,
		preventivoSubtitle,
		packageCountLabel,
		originPlaceholder,
		destinationPlaceholder,
		isStandalonePreventivoRoute,
		isHomepageLikeRoute,
		hasFormData,
		continueToNextStep,
	} = usePreventivoResults({
		shipmentFlowStore,
		route,
		messageError,
		sv,
		locationSearch,
		isOriginItaly,
		isDestinationItaly,
		isEuropeMonocollo,
		priceBands,
		isCalculating,
		isAdvancingToServices,
		lastQuotedSignature,
		quoteSignature,
		autoQuoteTimerRef,
		calculateRate,
		getPendingQuotePromise,
		getPendingQuoteSignature,
		flushLocationDraftsForSubmit,
		buildQuotePayloadSnapshot,
		buildQuoteComparableSignature,
		syncQuoteStateFromSession,
		formatResolvedLocation,
		session,
		refresh,
		checkPrices,
		ensurePrimaryPackage,
		applyOriginCountrySelection,
		applyDestinationCountrySelection,
		resetQuoteState,
	});

	// --- RESET (wires inner reset with calc state) ---
	const resetForm = () => {
		_resetFormInner(messageError, lastQuotedSignature);
	};

	// =====================================================================
	// PUBLIC API — must match the original return object exactly
	// =====================================================================
	return {
		// Refs
		formRef,
		messageError,
		isCalculating,
		isSyncingQuote,
		isAdvancingToServices,

		// Store
		shipmentFlowStore,

		// Computed
		isHomepageLikeRoute,
		isDestinationItaly,
		isOriginItaly,
		originLocationError,
		destLocationError,
		liveQuotePrice,
		continueButtonLabel,
		preventivoSubtitle,
		packageCountLabel,
		originPlaceholder,
		destinationPlaceholder,
		isStandalonePreventivoRoute,
		europeCountryOptions,
		hasFormData,
		isEuropeMonocollo,
		europeRestrictionMessage,

		// Location
		originQuery,
		originSuggestions,
		showOriginSuggestions,
		destQuery,
		destSuggestions,
		showDestSuggestions,
		locationKey,
		getProvinceLabel,
		selectOriginLocation,
		selectDestLocation,
		settleOriginQuery,
		settleDestQuery,
		onOriginQueryFocus,
		onOriginQueryInput,
		onDestQueryFocus,
		onDestQueryInput,
		hideOriginSuggestions,
		hideDestSuggestions,
		onOriginManualInput,
		onOriginManualBlur,
		onDestManualInput,
		onDestManualBlur,
		applyOriginCountrySelection,
		applyDestinationCountrySelection,

		// Packages
		packageTypeList,
		addPackageInline,
		deletePack,
		updatePackageType,
		calcQuantity,
		incrementQuantity,
		decrementQuantity,

		// Validation
		sv,
		onWeightInput,
		onWeightBlur,
		onDimInput,
		onDimBlur,

		// Promo
		promoSettings,

		// Actions
		continueToNextStep,
		resetForm,
	};
};
