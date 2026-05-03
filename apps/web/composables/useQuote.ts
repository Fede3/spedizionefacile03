/**
 * COMPOSABLE: useQuote — orchestratore Preventivo Rapido.
 * Compone: Snapshot + Form + Pricing + Results.
 * Consumer: components/Preventivo.vue.
 * Helpers puri canonici: utils/quickQuoteHelpers.ts.
 */

import {
	buildQuoteComparableSignature,
	clonePackagesForQuote,
	cloneShipmentDetailsForQuote,
	extractSessionComparablePayload,
	formatResolvedLocation,
} from "~/utils/quickQuoteHelpers";

type QuoteFlowStore = ReturnType<typeof useShipmentStore>;
type QuoteTimer = ReturnType<typeof setTimeout> | null;

const isItaly = (code: unknown) => String(code || "IT").trim().toUpperCase() === "IT";

/**
 * Composable snapshot: espone `buildQuotePayloadSnapshot` + `quoteSignature`
 * computed sullo store passato. Esportato per retrocompat (consumer esterni).
 */
export const useQuoteSnapshot = (shipmentFlowStore: QuoteFlowStore) => {
	const buildQuotePayloadSnapshot = () => ({
		shipment_details: cloneShipmentDetailsForQuote(shipmentFlowStore?.shipmentDetails),
		packages: clonePackagesForQuote(shipmentFlowStore?.packages),
	});
	const quoteSignature = computed(() => buildQuoteComparableSignature(buildQuotePayloadSnapshot()));
	return {
		buildQuotePayloadSnapshot,
		buildQuoteComparableSignature,
		extractSessionComparablePayload,
		formatResolvedLocation,
		quoteSignature,
	};
};

/**
 * useQuote — return signature IDENTICA all'implementazione storica
 * che orchestrava 4 sub-composable (Form/Calc/Results/Snapshot).
 */
export const useQuote = () => {
	const shipmentFlowStore = useShipmentStore();
	const route = useRoute();
	const runtimeConfig = useRuntimeConfig();
	const apiBase = String(runtimeConfig.public?.apiBase || "http://127.0.0.1:8787").replace(/\/$/, "");

	// Auto-quote timer condiviso tra le sezioni (getter/setter via box).
	const _timerBox: { value: QuoteTimer } = { value: null };
	function autoQuoteTimerRef(): QuoteTimer;
	function autoQuoteTimerRef(value: QuoteTimer): QuoteTimer;
	function autoQuoteTimerRef(value?: QuoteTimer) {
		if (arguments.length === 0) return _timerBox.value;
		_timerBox.value = value ?? null;
		return _timerBox.value;
	}

	onBeforeUnmount(() => {
		const t = autoQuoteTimerRef();
		if (t) clearTimeout(t);
	});

	// Price bands.
	const { loadPriceBands, getWeightPrice, getVolumePrice, getCapSupplement, getEuropeQuote, priceBands, promoSettings } = usePriceBands();
	onMounted(() => { loadPriceBands().catch(() => {}); });

	// Location search.
	const publicApiFetchForLocation = async (path: string, options: Record<string, unknown> = {}) =>
		await $fetch(path.startsWith("http") ? path : `${apiBase}${path}`, { credentials: "include", ...options });
	const locationSearch = useLocationSearch(publicApiFetchForLocation);

	const { session, refresh } = useSession();

	// Packages.
	const {
		addPackageInline, calcPriceWithVolume, calcPriceWithWeight, calcQuantity, checkPrices,
		decrementQuantity, deletePack, ensurePackagesIdentity, europeRestrictionMessage,
		incrementQuantity, isEuropeMonocollo, packageTypeList, selectPackageType, updatePackageType,
	} = useQuickQuotePackages({
		shipmentFlowStore, getWeightPrice, getVolumePrice, getCapSupplement, getEuropeQuote, priceBands,
	});

	// Country flags (servono prima delle sezioni).
	const isDestinationItaly = computed(() => isItaly(shipmentFlowStore?.shipmentDetails.destination_country_code));
	const isOriginItaly = computed(() => isItaly(shipmentFlowStore?.shipmentDetails.origin_country_code));

	const { buildQuotePayloadSnapshot, quoteSignature } = useQuoteSnapshot(shipmentFlowStore);

	// Smart validation (istanza condivisa).
	const sv = useSmartValidation();
	const onCapInputSmartForLocations = (fieldKey: string, value: string, countryCode = "IT") => {
		if (sv.isTouched(fieldKey)) sv.validateCAP(fieldKey, value, { countryCode });
	};

	// Locations (autocomplete IT).
	const {
		destQuery, destSuggestions, getProvinceLabel, hideDestSuggestions, hideOriginSuggestions,
		locationKey, onDestQueryFocus, onDestQueryInput, onOriginQueryFocus, onOriginQueryInput,
		originQuery, originSuggestions, selectDestLocation, selectOriginLocation,
		settleDestQuery, settleOriginQuery, showDestSuggestions, showOriginSuggestions,
	} = useQuickQuoteLocations({
		shipmentDetails: shipmentFlowStore?.shipmentDetails,
		search: locationSearch,
		smartValidation: sv,
		onCapInputSmart: onCapInputSmartForLocations,
	});

	// Form.
	const {
		formRef, onWeightInput, onWeightBlur, onDimInput, onDimBlur, europeCountryOptions,
		applyOriginCountrySelection, applyDestinationCountrySelection,
		onDestManualInput, onDestManualBlur, onOriginManualInput, onOriginManualBlur,
		scrollToFirstError, ensurePrimaryPackage,
		resetForm: _resetFormInner, flushLocationDraftsForSubmit,
	} = useQuoteFormInternal({
		shipmentFlowStore, locationSearch, priceBands, packageTypeList, selectPackageType,
		calcPriceWithWeight, calcPriceWithVolume,
		originQuery, originSuggestions, showOriginSuggestions,
		destQuery, destSuggestions, showDestSuggestions,
		settleOriginQuery, settleDestQuery,
		isOriginItaly, isDestinationItaly, autoQuoteTimerRef, sv,
	});

	ensurePrimaryPackage();

	// Pricing (calc/sessione/de-dup).
	const {
		messageError, isCalculating, isSyncingQuote, isAdvancingToServices, lastQuotedSignature,
		syncQuoteStateFromSession, calculateRate, resetQuoteState,
		getPendingQuotePromise, getPendingQuoteSignature,
	} = useQuotePricingInternal({
		shipmentFlowStore, apiBase, formRef, sv, scrollToFirstError,
		ensurePrimaryPackage, ensurePackagesIdentity,
		calcPriceWithWeight, calcPriceWithVolume, checkPrices,
		isOriginItaly, isDestinationItaly, isEuropeMonocollo,
		buildQuotePayloadSnapshot, autoQuoteTimerRef,
	});

	// Results & navigation.
	const {
		originLocationError, destLocationError, liveQuotePrice, continueButtonLabel, quoteSubtitle,
		packageCountLabel, originPlaceholder, destinationPlaceholder,
		isStandalonePreventivoRoute, isHomepageLikeRoute, hasFormData, continueToNextStep,
	} = useQuoteResultsInternal({
		shipmentFlowStore, route, messageError, sv, locationSearch,
		isOriginItaly, isDestinationItaly, isEuropeMonocollo,
		isCalculating, isAdvancingToServices, lastQuotedSignature, quoteSignature,
		autoQuoteTimerRef, calculateRate, getPendingQuotePromise, getPendingQuoteSignature,
		flushLocationDraftsForSubmit, buildQuotePayloadSnapshot, syncQuoteStateFromSession,
		session, refresh, checkPrices, ensurePrimaryPackage,
		applyOriginCountrySelection, applyDestinationCountrySelection, resetQuoteState,
	});

	const resetForm = () => _resetFormInner(messageError, lastQuotedSignature);

	// Public API — coincide col return object originale.
	return {
		formRef, messageError, isCalculating, isSyncingQuote, isAdvancingToServices,
		shipmentFlowStore,
		isHomepageLikeRoute, isDestinationItaly, isOriginItaly,
		originLocationError, destLocationError, liveQuotePrice,
		continueButtonLabel, quoteSubtitle, packageCountLabel,
		originPlaceholder, destinationPlaceholder,
		isStandalonePreventivoRoute, europeCountryOptions, hasFormData,
		isEuropeMonocollo, europeRestrictionMessage,
		originQuery, originSuggestions, showOriginSuggestions,
		destQuery, destSuggestions, showDestSuggestions,
		locationKey, getProvinceLabel,
		selectOriginLocation, selectDestLocation, settleOriginQuery, settleDestQuery,
		onOriginQueryFocus, onOriginQueryInput, onDestQueryFocus, onDestQueryInput,
		hideOriginSuggestions, hideDestSuggestions,
		onOriginManualInput, onOriginManualBlur, onDestManualInput, onDestManualBlur,
		applyOriginCountrySelection, applyDestinationCountrySelection,
		packageTypeList, addPackageInline, deletePack, updatePackageType,
		calcQuantity, incrementQuantity, decrementQuantity,
		sv, onWeightInput, onWeightBlur, onDimInput, onDimBlur,
		promoSettings,
		continueToNextStep, resetForm,
	};
};
