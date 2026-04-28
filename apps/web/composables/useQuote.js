/**
 * usePreventivo — Preventivo Rapido (orchestratore unico).
 *
 * Coordina:
 *  - Pinia store (`preventivoStore`) per stato condiviso e auto-quote timer
 *  - sezione "form": validazione, country sync, location manuali, reset
 *  - sezione "quote": API tariffe, dedup, computed display, watchers reattivi
 *
 * I caller storici (`components/shipment/Preventivo.vue`) restano invariati.
 */

import { storeToRefs } from "pinia";
import { usePreventivoStore } from "~/stores/preventivoStore";
import {
	buildQuotePayloadSnapshotFor,
	formatLivePrice,
	packageMissingMeasurements,
} from "~/utils/preventivoHelpers";
import {
	buildQuoteComparableSignature,
	extractSessionComparablePayload,
	formatResolvedLocation,
} from "~/utils/quickQuoteContract";

// ---- Helper preservato come export per consumer storici ----

export const usePreventivoQuoteSnapshot = (shipmentFlowStore) => {
	const buildQuotePayloadSnapshot = () => buildQuotePayloadSnapshotFor(shipmentFlowStore);
	const quoteSignature = computed(() => buildQuoteComparableSignature(buildQuotePayloadSnapshot()));
	return {
		buildQuotePayloadSnapshot,
		buildQuoteComparableSignature,
		extractSessionComparablePayload,
		formatResolvedLocation,
		quoteSignature,
	};
};

// ---- Sezione FORM (validazione, country sync, manuali) ----

function createPreventivoForm(deps) {
	const {
		shipmentFlowStore,
		locationSearch,
		priceBands,
		packageTypeList,
		selectPackageType,
		calcPriceWithWeight,
		calcPriceWithVolume,
		originQuery,
		originSuggestions,
		showOriginSuggestions,
		destQuery,
		destSuggestions,
		showDestSuggestions,
		settleOriginQuery,
		settleDestQuery,
		isOriginItaly,
		isDestinationItaly,
		sv,
		preventivoStore,
	} = deps;

	const formRef = ref(null);

	const onWeightInput = (pack, packIndex) => {
		calcPriceWithWeight(pack);
		const key = `peso_${packIndex}`;
		if (sv.isTouched(key)) {
			sv.validatePeso(key, pack.weight);
		}
	};

	const onWeightBlur = (pack, packIndex) => {
		const key = `peso_${packIndex}`;
		sv.onBlur(key, () => sv.validatePeso(key, pack.weight));
	};

	const onDimInput = (pack, packIndex, dimName, label) => {
		calcPriceWithVolume(pack);
		const key = `${dimName}_${packIndex}`;
		if (sv.isTouched(key)) {
			sv.validateDimensione(key, pack[dimName], label);
		}
	};

	const onDimBlur = (pack, packIndex, dimName, label) => {
		const key = `${dimName}_${packIndex}`;
		sv.onBlur(key, () => sv.validateDimensione(key, pack[dimName], label));
	};

	const europeCountryOptions = computed(() => {
		const countries = new Map([["IT", "Italia"]]);

		for (const band of priceBands.value?.europe?.bands || []) {
			for (const rate of band?.rates || []) {
				const code = String(rate?.country_code || "").trim().toUpperCase();
				const name = String(rate?.country_name || code).trim();
				if (code && !countries.has(code)) {
					countries.set(code, name);
				}
			}
		}

		return Array.from(countries.entries())
			.map(([code, label]) => ({ code, label }))
			.sort((a, b) => {
				if (a.code === "IT") return -1;
				if (b.code === "IT") return 1;
				return a.label.localeCompare(b.label, "it");
			});
	});

	const applyOriginCountrySelection = (resetFields = false) => {
		const countryCode = String(shipmentFlowStore?.shipmentDetails.origin_country_code || "IT").trim().toUpperCase() || "IT";
		const option = europeCountryOptions.value.find((entry) => entry.code === countryCode);

		shipmentFlowStore.shipmentDetails.origin_country_code = countryCode;
		shipmentFlowStore.shipmentDetails.origin_country = option?.label || countryCode;
		originSuggestions.value = [];
		showOriginSuggestions.value = false;
		locationSearch.clearLocationSearchError();
		sv.clearError("origin_cap");

		if (countryCode === "IT") {
			if (resetFields) {
				shipmentFlowStore.shipmentDetails.origin_city = "";
				shipmentFlowStore.shipmentDetails.origin_postal_code = "";
				originQuery.value = "";
			}
			return;
		}

		if (resetFields) {
			shipmentFlowStore.shipmentDetails.origin_city = "";
			shipmentFlowStore.shipmentDetails.origin_postal_code = "";
			originQuery.value = "";
			return;
		}

		shipmentFlowStore.shipmentDetails.origin_postal_code = "";
		originQuery.value = String(shipmentFlowStore?.shipmentDetails.origin_city || originQuery.value || "").trim();
	};

	const applyDestinationCountrySelection = (resetFields = false) => {
		const countryCode = String(shipmentFlowStore?.shipmentDetails.destination_country_code || "IT").trim().toUpperCase() || "IT";
		const option = europeCountryOptions.value.find((entry) => entry.code === countryCode);

		shipmentFlowStore.shipmentDetails.destination_country_code = countryCode;
		shipmentFlowStore.shipmentDetails.destination_country = option?.label || countryCode;
		destSuggestions.value = [];
		showDestSuggestions.value = false;
		locationSearch.clearLocationSearchError();
		sv.clearError("dest_cap");

		if (countryCode === "IT") {
			if (resetFields) {
				shipmentFlowStore.shipmentDetails.destination_city = "";
				shipmentFlowStore.shipmentDetails.destination_postal_code = "";
				destQuery.value = "";
			}
			return;
		}

		if (resetFields) {
			shipmentFlowStore.shipmentDetails.destination_city = "";
			shipmentFlowStore.shipmentDetails.destination_postal_code = "";
			destQuery.value = "";
			return;
		}

		shipmentFlowStore.shipmentDetails.destination_postal_code = "";
		destQuery.value = String(shipmentFlowStore?.shipmentDetails.destination_city || destQuery.value || "").trim();
	};

	const onDestManualInput = () => {
		const value = String(destQuery.value || "").trimStart();
		locationSearch.clearLocationSearchError();
		shipmentFlowStore.shipmentDetails.destination_city = value;
		shipmentFlowStore.shipmentDetails.destination_postal_code = "";
		destSuggestions.value = [];
		showDestSuggestions.value = false;
		sv.clearError("dest_cap");
	};

	const onDestManualBlur = () => {
		const value = String(destQuery.value || "").trim();
		locationSearch.clearLocationSearchError();
		destQuery.value = value;
		shipmentFlowStore.shipmentDetails.destination_city = value;
		shipmentFlowStore.shipmentDetails.destination_postal_code = "";
		destSuggestions.value = [];
		showDestSuggestions.value = false;
	};

	const onOriginManualInput = () => {
		const value = String(originQuery.value || "").trimStart();
		locationSearch.clearLocationSearchError();
		shipmentFlowStore.shipmentDetails.origin_city = value;
		shipmentFlowStore.shipmentDetails.origin_postal_code = "";
		originSuggestions.value = [];
		showOriginSuggestions.value = false;
		sv.clearError("origin_cap");
	};

	const onOriginManualBlur = () => {
		const value = String(originQuery.value || "").trim();
		locationSearch.clearLocationSearchError();
		originQuery.value = value;
		shipmentFlowStore.shipmentDetails.origin_city = value;
		shipmentFlowStore.shipmentDetails.origin_postal_code = "";
		originSuggestions.value = [];
		showOriginSuggestions.value = false;
	};

	const scrollToFirstError = () => {
		nextTick(() => {
			const invalidField = formRef.value?.querySelector(":invalid");
			if (invalidField) {
				invalidField.scrollIntoView({ behavior: "smooth", block: "center" });
				setTimeout(() => invalidField.focus?.(), 120);
				return;
			}

			const requiredField = formRef.value?.querySelector("input[required], select[required], textarea[required]");
			if (requiredField && !requiredField.value) {
				requiredField.scrollIntoView({ behavior: "smooth", block: "center" });
				setTimeout(() => requiredField.focus?.(), 120);
				return;
			}

			const errorEl = document.querySelector(".route-card__error, .package-field-card__error, .preventivo-inline-error");
			if (errorEl) {
				errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		});
	};

	const ensurePrimaryPackage = () => {
		if (shipmentFlowStore?.packages.length > 0) return;
		selectPackageType(packageTypeList[0]);
	};

	const resetForm = () => {
		preventivoStore.clearAutoQuoteTimer();
		shipmentFlowStore?.packages.splice(0);
		shipmentFlowStore.shipmentDetails.origin_city = "";
		shipmentFlowStore.shipmentDetails.origin_postal_code = "";
		shipmentFlowStore.shipmentDetails.origin_country_code = "IT";
		shipmentFlowStore.shipmentDetails.origin_country = "Italia";
		shipmentFlowStore.shipmentDetails.destination_city = "";
		shipmentFlowStore.shipmentDetails.destination_postal_code = "";
		shipmentFlowStore.shipmentDetails.destination_country_code = "IT";
		shipmentFlowStore.shipmentDetails.destination_country = "Italia";
		shipmentFlowStore.shipmentDetails.date = "";
		shipmentFlowStore.totalPrice = 0;
		shipmentFlowStore.stepNumber = 1;
		shipmentFlowStore.isQuoteStarted = false;
		preventivoStore.messageError = null;
		locationSearch.clearLocationSearchError();
		preventivoStore.lastQuotedSignature = "";
		ensurePrimaryPackage();
	};

	const flushLocationDraftsForSubmit = async (formatResolvedLocationFn) => {
		preventivoStore.clearAutoQuoteTimer();

		const originDraft = String(originQuery.value || "").trim();
		const destinationDraft = String(destQuery.value || "").trim();
		const resolvedOrigin = formatResolvedLocationFn(
			shipmentFlowStore?.shipmentDetails.origin_city,
			shipmentFlowStore?.shipmentDetails.origin_postal_code,
		);
		const resolvedDestination = formatResolvedLocationFn(
			shipmentFlowStore?.shipmentDetails.destination_city,
			shipmentFlowStore?.shipmentDetails.destination_postal_code,
		);
		const activeFieldId = import.meta.client ? document?.activeElement?.id : "";
		if (activeFieldId === "origin_city" || (originDraft && originDraft !== resolvedOrigin)) {
			if (isOriginItaly.value) {
				await settleOriginQuery();
			}
			else {
				onOriginManualBlur();
			}
		}

		if (activeFieldId === "destination_city" || (destinationDraft && destinationDraft !== resolvedDestination)) {
			if (isDestinationItaly.value) {
				await settleDestQuery();
			}
			else {
				onDestManualBlur();
			}
		}

		await nextTick();
	};

	return {
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
		resetForm,
		flushLocationDraftsForSubmit,
	};
}

// ---- Sezione QUOTE (API, dedup, computed, watchers) ----

function createPreventivoQuote(deps) {
	const {
		shipmentFlowStore,
		apiBase,
		route,
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
		locationSearch,
		applyOriginCountrySelection,
		applyDestinationCountrySelection,
		flushLocationDraftsForSubmit,
		session,
		refresh,
		preventivoStore,
	} = deps;

	const buildQuotePayloadSnapshot = () => buildQuotePayloadSnapshotFor(shipmentFlowStore);
	const quoteSignature = computed(() => buildQuoteComparableSignature(buildQuotePayloadSnapshot()));

	const publicApiFetch = async (path, options = {}) => {
		const url = path.startsWith("http") ? path : `${apiBase}${path}`;
		return await $fetch(url, {
			credentials: "include",
			...options,
		});
	};

	const readXsrfToken = () => {
		if (import.meta.server) return "";
		const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
		return match?.[1] ? decodeURIComponent(match[1]) : "";
	};

	const requestClient = async (path, options = {}) => {
		const method = String(options?.method || "GET").trim().toUpperCase();
		const token = readXsrfToken();
		const headers = {
			Accept: "application/json",
			...(options?.headers || {}),
		};

		if (token && !["GET", "HEAD", "OPTIONS"].includes(method)) {
			headers["X-XSRF-TOKEN"] = token;
		}

		return await publicApiFetch(path, { ...options, method, headers });
	};

	const calculateRate = async ({ silent = false, payload = null } = {}) => {
		if (silent && preventivoStore.isAdvancingToServices) return false;
		if (!silent) preventivoStore.messageError = null;

		const quotePayload = payload || buildQuotePayloadSnapshot();
		const currentSignature = buildQuoteComparableSignature(quotePayload);
		const pendingPromise = preventivoStore.getPendingQuotePromise();
		const pendingSig = preventivoStore.getPendingQuoteSignature();
		if (pendingPromise && pendingSig === currentSignature && preventivoStore.isPendingSilent() === silent) {
			return pendingPromise;
		}

		const requestId = preventivoStore.nextRequestId();
		const sd = shipmentFlowStore?.shipmentDetails;
		const fail = (errors) => {
			if (!silent) {
				preventivoStore.messageError = errors;
				scrollToFirstError();
			}
			return false;
		};

		if (!formRef.value || !formRef.value.checkValidity()) {
			if (!silent) formRef.value?.reportValidity();
			return false;
		}

		const originMissing = !String(sd?.origin_city || "").trim()
			|| (isOriginItaly.value && !String(sd?.origin_postal_code || "").trim());
		const destMissing = !String(sd?.destination_city || "").trim()
			|| (isDestinationItaly.value && !String(sd?.destination_postal_code || "").trim());
		if (originMissing || destMissing) {
			return fail({
				...(originMissing ? { origin_query: [isOriginItaly.value
					? "Seleziona una località valida per la partenza."
					: "Inserisci almeno la città di partenza per il paese selezionato."] } : {}),
				...(destMissing ? { dest_query: [isDestinationItaly.value
					? "Seleziona una località valida per la destinazione."
					: "Inserisci almeno la città di destinazione per il paese selezionato."] } : {}),
			});
		}

		if (isEuropeMonocollo.value) {
			if (shipmentFlowStore?.packages.length !== 1) {
				return fail({ packages: ["Per l'Europa e disponibile un solo collo per spedizione."] });
			}
			if ((Number(shipmentFlowStore?.packages[0]?.quantity) || 1) !== 1) {
				return fail({ packages: ["Per l'Europa la quantita deve essere 1."] });
			}
		}

		if (!shipmentFlowStore?.packages || shipmentFlowStore.packages.length === 0) {
			return fail({ packages: ["Seleziona almeno un tipo di collo."] });
		}

		for (let i = 0; i < shipmentFlowStore?.packages.length; i++) {
			const pack = shipmentFlowStore?.packages[i];
			if (packageMissingMeasurements(pack)) {
				if (!silent) {
					preventivoStore.messageError = { packages: ["Compila peso e dimensioni per tutti i colli."] };
					scrollToFirstError();
				}
				return false;
			}

			if (pack.weight_price == null) calcPriceWithWeight(pack);
			if (pack.volume_price == null && pack.first_size && pack.second_size && pack.third_size) {
				calcPriceWithVolume(pack);
			}
			if (pack.single_price == null || pack.single_price === undefined) checkPrices(pack);
			if (pack.single_price == null || pack.single_price === undefined) {
				if (!silent) {
					preventivoStore.messageError = { packages: ["Errore nel calcolo del prezzo. Reinserisci peso e dimensioni."] };
				}
				return false;
			}
		}

		const runRequest = async () => {
			if (silent) preventivoStore.isSyncingQuote = true;
			else preventivoStore.isCalculating = true;
			try {
				await requestClient("/sanctum/csrf-cookie");
				const response = await requestClient("/api/session/first-step", {
					method: "POST",
					body: quotePayload,
				});
				if (!preventivoStore.isLatestRequest(requestId)) return false;
				preventivoStore.syncQuoteStateFromSession(
					shipmentFlowStore,
					ensurePackagesIdentity,
					ensurePrimaryPackage,
					response?.data || response,
					{ sourceSignature: currentSignature },
				);
				preventivoStore.lastQuotedSignature = currentSignature;
				if (!silent) preventivoStore.messageError = null;
				return true;
			}
			catch (error) {
				if (!silent) {
					preventivoStore.messageError = error?.data?.errors || { packages: ["Errore durante il calcolo. Riprova."] };
					scrollToFirstError();
				}
				return false;
			}
			finally {
				if (silent) preventivoStore.isSyncingQuote = false;
				else preventivoStore.isCalculating = false;
				preventivoStore.releasePendingIfMatches(requestId);
			}
		};

		const promise = runRequest();
		preventivoStore.setPending(promise, currentSignature, silent, requestId);
		return promise;
	};

	const originLocationError = computed(() =>
		preventivoStore.messageError?.origin_query?.[0]
		|| sv.getError("origin_cap")
		|| preventivoStore.messageError?.["shipment_details.origin_city"]?.[0]
		|| preventivoStore.messageError?.["shipment_details.origin_postal_code"]?.[0]
		|| locationSearch.locationSearchError.value
		|| "",
	);

	const destLocationError = computed(() =>
		preventivoStore.messageError?.dest_query?.[0]
		|| sv.getError("dest_cap")
		|| preventivoStore.messageError?.["shipment_details.destination_city"]?.[0]
		|| preventivoStore.messageError?.["shipment_details.destination_postal_code"]?.[0]
		|| locationSearch.locationSearchError.value
		|| "",
	);

	const hasResolvedLocations = computed(() => (
		!!String(shipmentFlowStore?.shipmentDetails.origin_city || "").trim()
		&& (
			!isOriginItaly.value
			|| !!String(shipmentFlowStore?.shipmentDetails.origin_postal_code || "").trim()
		)
		&& !!String(shipmentFlowStore?.shipmentDetails.destination_city || "").trim()
		&& (
			!isDestinationItaly.value
			|| !!String(shipmentFlowStore?.shipmentDetails.destination_postal_code || "").trim()
		)
	));

	const hasCompletePackages = computed(() => (
		Array.isArray(shipmentFlowStore?.packages)
		&& shipmentFlowStore?.packages.length > 0
		&& shipmentFlowStore?.packages.every((pack) => (
			!!String(pack?.weight || "").trim()
			&& !!String(pack?.first_size || "").trim()
			&& !!String(pack?.second_size || "").trim()
			&& !!String(pack?.third_size || "").trim()
			&& Number(pack?.single_price) > 0
		))
	));

	const quoteReadyForRealtime = computed(() => hasResolvedLocations.value && hasCompletePackages.value);

	const liveQuotePrice = computed(() => (
		quoteReadyForRealtime.value && Number(shipmentFlowStore?.totalPrice) > 0
			? formatLivePrice(shipmentFlowStore?.totalPrice)
			: ""
	));

	const continueButtonLabel = computed(() => (
		liveQuotePrice.value ? "Calcola e scegli servizio" : "Calcola il prezzo"
	));

	const preventivoSubtitle = computed(() => (
		isEuropeMonocollo.value
			? "Europa monocollo · Ritiro a domicilio"
			: "Prezzo immediato · IVA e ritiro inclusi"
	));

	const packageCountLabel = computed(() => shipmentFlowStore?.packages.length || 0);

	const originPlaceholder = computed(() => (
		isOriginItaly.value ? "Es. Comune o CAP (Roma / 00118)" : "Citta di partenza"
	));

	const destinationPlaceholder = computed(() => (
		isDestinationItaly.value ? "Es. Comune o CAP (Milano / 20121)" : "Citta di destinazione"
	));

	const isStandalonePreventivoRoute = computed(() => route.path === "/preventivo");
	const isHomepageLikeRoute = computed(() => route.path === "/" || route.path === "/preview/home-hero");

	const hasFormData = computed(() => {
		const sd = shipmentFlowStore?.shipmentDetails;
		return shipmentFlowStore?.packages.length > 0 || sd.origin_city || sd.origin_postal_code || sd.destination_city || sd.destination_postal_code;
	});

	const continueToNextStep = async () => {
		await preventivoStore.continueToNextStep({
			shipmentFlowStore,
			flushLocationDraftsForSubmit,
			calculateRate,
			ensurePackagesIdentity,
			ensurePrimaryPackage,
			session,
			refresh,
		});
	};

	watch(
		() => shipmentFlowStore?.packages,
		preventivoStore.resetQuoteState,
		{ deep: true },
	);

	watch(
		() => shipmentFlowStore?.shipmentDetails,
		preventivoStore.resetQuoteState,
		{ deep: true },
	);

	watch(
		() => shipmentFlowStore?.shipmentDetails.destination_country_code,
		() => applyDestinationCountrySelection(false),
		{ immediate: true },
	);

	watch(
		() => shipmentFlowStore?.shipmentDetails.origin_country_code,
		() => applyOriginCountrySelection(false),
		{ immediate: true },
	);

	watch(
		() => [shipmentFlowStore?.shipmentDetails.origin_postal_code, shipmentFlowStore?.shipmentDetails.destination_postal_code],
		() => {
			for (const pack of shipmentFlowStore?.packages) {
				if (pack.weight_price != null || pack.volume_price != null) {
					checkPrices(pack);
				}
			}
		},
	);

	watch(
		() => [quoteSignature.value, quoteReadyForRealtime.value],
		() => {
			preventivoStore.clearAutoQuoteTimer();

			if (preventivoStore.isAdvancingToServices || preventivoStore.isCalculating) return;
			if (!quoteReadyForRealtime.value) return;
			if (preventivoStore.lastQuotedSignature === quoteSignature.value) return;

			const newTimer = setTimeout(() => {
				calculateRate({ silent: true }).catch(() => null);
			}, 450);
			preventivoStore.setAutoQuoteTimer(newTimer);
		},
		{ flush: "post" },
	);

	watch(
		() => shipmentFlowStore?.packages.length,
		(length) => {
			if (length === 0) ensurePrimaryPackage();
		},
	);

	return {
		buildQuotePayloadSnapshot,
		quoteSignature,
		calculateRate,
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
	};
}

// ---- Composable principale ----

export const usePreventivo = () => {
	const shipmentFlowStore = useShipmentFlowStore();
	const route = useRoute();
	const apiBase = String(useRuntimeConfig().public?.apiBase || "http://127.0.0.1:8787").replace(/\/$/, "");
	const preventivoStore = usePreventivoStore();
	const { messageError, isCalculating, isSyncingQuote, isAdvancingToServices } = storeToRefs(preventivoStore);

	onBeforeUnmount(() => preventivoStore.clearAutoQuoteTimer());

	const { loadPriceBands, getWeightPrice, getVolumePrice, getCapSupplement, getEuropeQuote, priceBands, promoSettings } = usePriceBands();
	onMounted(() => { loadPriceBands().catch(() => {}); });

	const locationSearch = useLocationSearch(async (path, options = {}) => {
		const url = path.startsWith("http") ? path : `${apiBase}${path}`;
		return await $fetch(url, { credentials: "include", ...options });
	});

	const { session, refresh } = useSession();

	const packages = useQuickQuotePackages({
		shipmentFlowStore, getWeightPrice, getVolumePrice, getCapSupplement, getEuropeQuote, priceBands,
	});

	const isDestinationItaly = computed(() => (
		String(shipmentFlowStore?.shipmentDetails.destination_country_code || "IT").trim().toUpperCase() === "IT"
	));
	const isOriginItaly = computed(() => (
		String(shipmentFlowStore?.shipmentDetails.origin_country_code || "IT").trim().toUpperCase() === "IT"
	));

	const sv = useSmartValidation();
	const locations = useQuickQuoteLocations({
		shipmentDetails: shipmentFlowStore?.shipmentDetails,
		search: locationSearch,
		smartValidation: sv,
		onCapInputSmart: (fieldKey, value, countryCode = "IT") => {
			if (sv.isTouched(fieldKey)) sv.validateCAP(fieldKey, value, { countryCode });
		},
	});

	const form = createPreventivoForm({
		shipmentFlowStore, locationSearch, priceBands,
		packageTypeList: packages.packageTypeList,
		selectPackageType: packages.selectPackageType,
		calcPriceWithWeight: packages.calcPriceWithWeight,
		calcPriceWithVolume: packages.calcPriceWithVolume,
		originQuery: locations.originQuery,
		originSuggestions: locations.originSuggestions,
		showOriginSuggestions: locations.showOriginSuggestions,
		destQuery: locations.destQuery,
		destSuggestions: locations.destSuggestions,
		showDestSuggestions: locations.showDestSuggestions,
		settleOriginQuery: locations.settleOriginQuery,
		settleDestQuery: locations.settleDestQuery,
		isOriginItaly, isDestinationItaly, sv, preventivoStore,
	});

	form.ensurePrimaryPackage();

	const quote = createPreventivoQuote({
		shipmentFlowStore, apiBase, route,
		formRef: form.formRef, sv,
		scrollToFirstError: form.scrollToFirstError,
		ensurePrimaryPackage: form.ensurePrimaryPackage,
		ensurePackagesIdentity: packages.ensurePackagesIdentity,
		calcPriceWithWeight: packages.calcPriceWithWeight,
		calcPriceWithVolume: packages.calcPriceWithVolume,
		checkPrices: packages.checkPrices,
		isOriginItaly, isDestinationItaly,
		isEuropeMonocollo: packages.isEuropeMonocollo,
		locationSearch,
		applyOriginCountrySelection: form.applyOriginCountrySelection,
		applyDestinationCountrySelection: form.applyDestinationCountrySelection,
		flushLocationDraftsForSubmit: form.flushLocationDraftsForSubmit,
		session, refresh, preventivoStore,
	});

	return {
		shipmentFlowStore, sv, promoSettings,
		isDestinationItaly, isOriginItaly,
		messageError, isCalculating, isSyncingQuote, isAdvancingToServices,
		isEuropeMonocollo: packages.isEuropeMonocollo,
		europeRestrictionMessage: packages.europeRestrictionMessage,
		packageTypeList: packages.packageTypeList,
		addPackageInline: packages.addPackageInline,
		deletePack: packages.deletePack,
		updatePackageType: packages.updatePackageType,
		calcQuantity: packages.calcQuantity,
		incrementQuantity: packages.incrementQuantity,
		decrementQuantity: packages.decrementQuantity,
		...locations,
		formRef: form.formRef,
		europeCountryOptions: form.europeCountryOptions,
		onWeightInput: form.onWeightInput, onWeightBlur: form.onWeightBlur,
		onDimInput: form.onDimInput, onDimBlur: form.onDimBlur,
		onOriginManualInput: form.onOriginManualInput, onOriginManualBlur: form.onOriginManualBlur,
		onDestManualInput: form.onDestManualInput, onDestManualBlur: form.onDestManualBlur,
		applyOriginCountrySelection: form.applyOriginCountrySelection,
		applyDestinationCountrySelection: form.applyDestinationCountrySelection,
		resetForm: form.resetForm,
		originLocationError: quote.originLocationError, destLocationError: quote.destLocationError,
		liveQuotePrice: quote.liveQuotePrice, continueButtonLabel: quote.continueButtonLabel,
		preventivoSubtitle: quote.preventivoSubtitle, packageCountLabel: quote.packageCountLabel,
		originPlaceholder: quote.originPlaceholder, destinationPlaceholder: quote.destinationPlaceholder,
		isStandalonePreventivoRoute: quote.isStandalonePreventivoRoute,
		isHomepageLikeRoute: quote.isHomepageLikeRoute,
		hasFormData: quote.hasFormData,
		continueToNextStep: quote.continueToNextStep,
	};
};
