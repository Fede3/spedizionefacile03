/**
 * COMPOSABLE: usePreventivoForm (usePreventivoForm.js)
 * SCOPO: Stato del form, validazione campi, gestione location/country, input manuali, reset.
 *
 * Sub-composable di usePreventivo. Gestisce tutto cio che riguarda
 * l'interazione utente col form: validazione smart, selezione country,
 * location autocomplete, input manuali, scroll-to-error, e reset completo.
 *
 * @param {Object} deps - Dipendenze iniettate dall'orchestratore
 */
export const usePreventivoForm = (deps) => {
	const {
		userStore,
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

	const onCapBlur = (fieldKey, value) => {
		sv.onBlur(fieldKey, () => sv.validateCAP(fieldKey, value));
	};

	const onCapInputSmart = (fieldKey, value, countryCode = "IT") => {
		if (sv.isTouched(fieldKey)) {
			sv.validateCAP(fieldKey, value, { countryCode });
		}
	};

	// --- EUROPE COUNTRY OPTIONS ---
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

	// --- COUNTRY SELECTION ---
	const applyOriginCountrySelection = (resetFields = false) => {
		const countryCode = String(userStore.shipmentDetails.origin_country_code || "IT").trim().toUpperCase() || "IT";
		const option = europeCountryOptions.value.find((entry) => entry.code === countryCode);

		userStore.shipmentDetails.origin_country_code = countryCode;
		userStore.shipmentDetails.origin_country = option?.label || countryCode;
		originSuggestions.value = [];
		showOriginSuggestions.value = false;
		locationSearch.clearLocationSearchError();
		sv.clearError("origin_cap");

		if (countryCode === "IT") {
			if (resetFields) {
				userStore.shipmentDetails.origin_city = "";
				userStore.shipmentDetails.origin_postal_code = "";
				originQuery.value = "";
			}
			return;
		}

		if (resetFields) {
			userStore.shipmentDetails.origin_city = "";
			userStore.shipmentDetails.origin_postal_code = "";
			originQuery.value = "";
			return;
		}

		userStore.shipmentDetails.origin_postal_code = "";
		originQuery.value = String(userStore.shipmentDetails.origin_city || originQuery.value || "").trim();
	};

	const applyDestinationCountrySelection = (resetFields = false) => {
		const countryCode = String(userStore.shipmentDetails.destination_country_code || "IT").trim().toUpperCase() || "IT";
		const option = europeCountryOptions.value.find((entry) => entry.code === countryCode);

		userStore.shipmentDetails.destination_country_code = countryCode;
		userStore.shipmentDetails.destination_country = option?.label || countryCode;
		destSuggestions.value = [];
		showDestSuggestions.value = false;
		locationSearch.clearLocationSearchError();
		sv.clearError("dest_cap");

		if (countryCode === "IT") {
			if (resetFields) {
				userStore.shipmentDetails.destination_city = "";
				userStore.shipmentDetails.destination_postal_code = "";
				destQuery.value = "";
			}
			return;
		}

		if (resetFields) {
			userStore.shipmentDetails.destination_city = "";
			userStore.shipmentDetails.destination_postal_code = "";
			destQuery.value = "";
			return;
		}

		userStore.shipmentDetails.destination_postal_code = "";
		destQuery.value = String(userStore.shipmentDetails.destination_city || destQuery.value || "").trim();
	};

	// --- MANUAL LOCATION INPUT ---
	const onDestManualInput = () => {
		const value = String(destQuery.value || "").trimStart();
		locationSearch.clearLocationSearchError();
		userStore.shipmentDetails.destination_city = value;
		userStore.shipmentDetails.destination_postal_code = "";
		destSuggestions.value = [];
		showDestSuggestions.value = false;
		sv.clearError("dest_cap");
	};

	const onDestManualBlur = () => {
		const value = String(destQuery.value || "").trim();
		locationSearch.clearLocationSearchError();
		destQuery.value = value;
		userStore.shipmentDetails.destination_city = value;
		userStore.shipmentDetails.destination_postal_code = "";
		destSuggestions.value = [];
		showDestSuggestions.value = false;
	};

	const onOriginManualInput = () => {
		const value = String(originQuery.value || "").trimStart();
		locationSearch.clearLocationSearchError();
		userStore.shipmentDetails.origin_city = value;
		userStore.shipmentDetails.origin_postal_code = "";
		originSuggestions.value = [];
		showOriginSuggestions.value = false;
		sv.clearError("origin_cap");
	};

	const onOriginManualBlur = () => {
		const value = String(originQuery.value || "").trim();
		locationSearch.clearLocationSearchError();
		originQuery.value = value;
		userStore.shipmentDetails.origin_city = value;
		userStore.shipmentDetails.origin_postal_code = "";
		originSuggestions.value = [];
		showOriginSuggestions.value = false;
	};

	// --- SCROLL TO ERROR ---
	const scrollToFirstError = () => {
		nextTick(() => {
			const invalidField = formRef.value?.querySelector(':invalid');
			if (invalidField) {
				invalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
				setTimeout(() => invalidField.focus?.(), 120);
				return;
			}

			const requiredField = formRef.value?.querySelector('input[required], select[required], textarea[required]');
			if (requiredField && !requiredField.value) {
				requiredField.scrollIntoView({ behavior: 'smooth', block: 'center' });
				setTimeout(() => requiredField.focus?.(), 120);
				return;
			}

			const errorEl = document.querySelector('.route-card__error, .package-field-card__error, .preventivo-inline-error');
			if (errorEl) {
				errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		});
	};

	// --- ENSURE PRIMARY PACKAGE ---
	const ensurePrimaryPackage = () => {
		if (userStore.packages.length > 0) return;
		selectPackageType(packageTypeList[0]);
	};

	// --- RESET FORM ---
	const resetForm = (messageError, lastQuotedSignature) => {
		const timer = autoQuoteTimerRef();
		if (timer) {
			clearTimeout(timer);
			autoQuoteTimerRef(null);
		}
		userStore.packages.splice(0);
		userStore.shipmentDetails.origin_city = "";
		userStore.shipmentDetails.origin_postal_code = "";
		userStore.shipmentDetails.origin_country_code = "IT";
		userStore.shipmentDetails.origin_country = "Italia";
		userStore.shipmentDetails.destination_city = "";
		userStore.shipmentDetails.destination_postal_code = "";
		userStore.shipmentDetails.destination_country_code = "IT";
		userStore.shipmentDetails.destination_country = "Italia";
		userStore.shipmentDetails.date = "";
		userStore.totalPrice = 0;
		userStore.stepNumber = 1;
		userStore.isQuoteStarted = false;
		messageError.value = null;
		locationSearch.clearLocationSearchError();
		lastQuotedSignature.value = "";
		ensurePrimaryPackage();
	};

	// --- FLUSH DRAFTS ---
	const flushLocationDraftsForSubmit = async (formatResolvedLocation) => {
		const timer = autoQuoteTimerRef();
		if (timer) {
			clearTimeout(timer);
			autoQuoteTimerRef(null);
		}

		const originDraft = String(originQuery.value || "").trim();
		const destinationDraft = String(destQuery.value || "").trim();
		const resolvedOrigin = formatResolvedLocation(
			userStore.shipmentDetails.origin_city,
			userStore.shipmentDetails.origin_postal_code,
		);
		const resolvedDestination = formatResolvedLocation(
			userStore.shipmentDetails.destination_city,
			userStore.shipmentDetails.destination_postal_code,
		);
		const activeFieldId = process.client ? document?.activeElement?.id : "";
		if (activeFieldId === "origin_city" || (originDraft && originDraft !== resolvedOrigin)) {
			if (isOriginItaly.value) {
				await settleOriginQuery();
			} else {
				onOriginManualBlur();
			}
		}

		if (activeFieldId === "destination_city" || (destinationDraft && destinationDraft !== resolvedDestination)) {
			if (isDestinationItaly.value) {
				await settleDestQuery();
			} else {
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
};
