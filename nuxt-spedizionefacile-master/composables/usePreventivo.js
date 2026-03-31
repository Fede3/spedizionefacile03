/**
 * COMPOSABLE: usePreventivo (usePreventivo.js)
 * SCOPO: Logica centralizzata per il modulo Preventivo Rapido.
 *
 * Estrae TUTTA la logica dello script che era in Preventivo.vue in un composable
 * riutilizzabile, mantenendo le stesse dipendenze (usePriceBands, useSmartValidation,
 * useQuickQuotePackages, useQuickQuoteLocations, usePreventivoQuoteSnapshot, useSession).
 *
 * DOVE SI USA: components/Preventivo.vue
 */
export const usePreventivo = async () => {
	// --- DIPENDENZE E STATO INIZIALE ---
	const userStore = useUserStore();
	const route = useRoute();
	const isHomepageLikeRoute = computed(() => route.path === '/' || route.path === '/preview/home-hero');

	const formRef = ref(null);

	// Carica fasce prezzo dinamiche dall'API (con fallback hardcoded)
	const { loadPriceBands, getWeightPrice, getVolumePrice, getCapSupplement, getEuropeQuote, priceBands, promoSettings } = usePriceBands();
	await loadPriceBands();

	const sanctum = useSanctumClient();
	const locationSearch = useLocationSearch(sanctum);

	// --- SESSIONE SERVER ---
	const { session, refresh } = useSession();
	const quoteTransitionLock = useState('shipment-flow-quote-transition-lock', () => false);

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
		userStore,
		getWeightPrice,
		getVolumePrice,
		getCapSupplement,
		getEuropeQuote,
		priceBands,
	});

	const ensurePrimaryPackage = () => {
		if (userStore.packages.length > 0) return;
		selectPackageType(packageTypeList[0]);
	};

	ensurePrimaryPackage();

	// --- VALIDAZIONE CAMPI ---
	const sv = useSmartValidation();

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
		shipmentDetails: userStore.shipmentDetails,
		search: locationSearch,
		smartValidation: sv,
		onCapInputSmart,
	});

	// --- STATO ERRORI E CALCOLO ---
	const messageError = ref(null);
	const isCalculating = ref(false);
	const isSyncingQuote = ref(false);
	const isAdvancingToServices = ref(false);
	const lastQuotedSignature = ref("");
	let autoQuoteTimer = null;
	let pendingQuotePromise = null;
	let pendingQuoteSignature = "";
	let pendingQuoteSilent = false;
	let pendingQuoteRequestId = 0;
	let latestQuoteRequestId = 0;

	const {
		buildQuotePayloadSnapshot,
		buildQuoteComparableSignature,
		extractSessionComparablePayload,
		formatResolvedLocation,
		quoteSignature,
	} = usePreventivoQuoteSnapshot(userStore);

	// --- COMPUTED ---
	const originLocationError = computed(() =>
		messageError.value?.origin_query?.[0]
			|| sv.getError("origin_cap")
			|| messageError.value?.["shipment_details.origin_city"]?.[0]
			|| messageError.value?.["shipment_details.origin_postal_code"]?.[0]
			|| locationSearch.locationSearchError.value
			|| "",
	);

	const destLocationError = computed(() =>
		messageError.value?.dest_query?.[0]
			|| sv.getError("dest_cap")
			|| messageError.value?.["shipment_details.destination_city"]?.[0]
			|| messageError.value?.["shipment_details.destination_postal_code"]?.[0]
			|| locationSearch.locationSearchError.value
			|| "",
	);

	const isDestinationItaly = computed(() => (
		String(userStore.shipmentDetails.destination_country_code || "IT").trim().toUpperCase() === "IT"
	));

	const isOriginItaly = computed(() => (
		String(userStore.shipmentDetails.origin_country_code || "IT").trim().toUpperCase() === "IT"
	));

	const hasResolvedLocations = computed(() => (
		!!String(userStore.shipmentDetails.origin_city || "").trim()
		&& (
			!isOriginItaly.value
			|| !!String(userStore.shipmentDetails.origin_postal_code || "").trim()
		)
		&& !!String(userStore.shipmentDetails.destination_city || "").trim()
		&& (
			!isDestinationItaly.value
			|| !!String(userStore.shipmentDetails.destination_postal_code || "").trim()
		)
	));

	const hasCompletePackages = computed(() => (
		Array.isArray(userStore.packages)
		&& userStore.packages.length > 0
		&& userStore.packages.every((pack) => (
			!!String(pack?.weight || "").trim()
			&& !!String(pack?.first_size || "").trim()
			&& !!String(pack?.second_size || "").trim()
			&& !!String(pack?.third_size || "").trim()
			&& Number(pack?.single_price) > 0
		))
	));

	const quoteReadyForRealtime = computed(() => (
		hasResolvedLocations.value
		&& hasCompletePackages.value
	));

	const formatLivePrice = (amount) => (
		new Intl.NumberFormat("it-IT", {
			style: "currency",
			currency: "EUR",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(Number(amount) || 0).replace(/\s/g, "")
	);

	const liveQuotePrice = computed(() => (
		quoteReadyForRealtime.value && Number(userStore.totalPrice) > 0
			? formatLivePrice(userStore.totalPrice)
			: ""
	));

	const continueButtonLabel = computed(() => (
		liveQuotePrice.value
			? "Continua ai servizi"
			: "Calcola il prezzo"
	));

	const preventivoSubtitle = computed(() => (
		isEuropeMonocollo.value
			? "Europa monocollo · Ritiro a domicilio"
			: "Prezzo immediato · IVA e ritiro inclusi"
	));

	const packageCountLabel = computed(() => userStore.packages.length || 0);

	const originPlaceholder = computed(() => (
		isOriginItaly.value ? "Es. Comune o CAP (Roma / 00118)" : "Citta di partenza"
	));

	const destinationPlaceholder = computed(() => (
		isDestinationItaly.value ? "Es. Comune o CAP (Milano / 20121)" : "Citta di destinazione"
	));

	const isStandalonePreventivoRoute = computed(() => route.path === '/preventivo');

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

	const hasFormData = computed(() => {
		const sd = userStore.shipmentDetails;
		return userStore.packages.length > 0 || sd.origin_city || sd.origin_postal_code || sd.destination_city || sd.destination_postal_code;
	});

	// --- COUNTRY SELECTION ---
	const applyOriginCountrySelection = (resetFields = false) => {
		const countryCode = String(userStore.shipmentDetails.origin_country_code || "IT").trim().toUpperCase() || "IT";
		const option = europeCountryOptions.value.find((entry) => entry.code === countryCode);

		userStore.shipmentDetails.origin_country_code = countryCode;
		userStore.shipmentDetails.origin_country = option?.label || countryCode;
		originSuggestions.value = [];
		showOriginSuggestions.value = false;
		messageError.value = null;
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
		messageError.value = null;
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

	// --- SESSION SYNC ---
	const syncQuoteStateFromSession = (sessionData = {}, options = {}) => {
		const sourceSignature = String(options?.sourceSignature || "");
		const sessionSignature = buildQuoteComparableSignature(extractSessionComparablePayload(sessionData));

		if (sourceSignature) {
			if (sourceSignature !== sessionSignature) {
				return;
			}

			userStore.totalPrice = Number(sessionData?.total_price || userStore.totalPrice || 0);
			userStore.stepNumber = Number(sessionData?.step || 2);
			userStore.isQuoteStarted = true;
			ensurePackagesIdentity();
			ensurePrimaryPackage();
			return;
		}

		const shipmentDetails = sessionData?.shipment_details || {};
		for (const [key, value] of Object.entries(shipmentDetails)) {
			if (key in userStore.shipmentDetails) {
				userStore.shipmentDetails[key] = value ?? "";
			}
		}

		const packages = Array.isArray(sessionData?.packages)
			? sessionData.packages.map((pack) => ({ ...pack }))
			: null;

		if (packages) {
			userStore.packages.splice(0, userStore.packages.length, ...packages);
			ensurePackagesIdentity();
		}

		userStore.totalPrice = Number(sessionData?.total_price || userStore.totalPrice || 0);
		userStore.stepNumber = Number(sessionData?.step || 2);
		userStore.isQuoteStarted = true;
		ensurePrimaryPackage();
	};

	// --- FLUSH DRAFTS ---
	const flushLocationDraftsForSubmit = async () => {
		if (autoQuoteTimer) {
			clearTimeout(autoQuoteTimer);
			autoQuoteTimer = null;
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

	// --- CALCOLO TARIFFA ---
	const calculateRate = async ({ silent = false, payload = null } = {}) => {
		if (silent && isAdvancingToServices.value) {
			return false;
		}

		if (!silent) {
			messageError.value = null;
		}

		const quotePayload = payload || buildQuotePayloadSnapshot();
		const currentSignature = buildQuoteComparableSignature(quotePayload);
		if (
			pendingQuotePromise
			&& pendingQuoteSignature === currentSignature
			&& pendingQuoteSilent === silent
		) {
			return pendingQuotePromise;
		}

		const requestId = ++latestQuoteRequestId;

		if (!formRef.value || !formRef.value.checkValidity()) {
			if (!silent) {
				formRef.value?.reportValidity();
			}
			return false;
		}

		if (
			!String(userStore.shipmentDetails.origin_city || "").trim()
			|| (isOriginItaly.value && !String(userStore.shipmentDetails.origin_postal_code || "").trim())
			|| !String(userStore.shipmentDetails.destination_city || "").trim()
			|| (isDestinationItaly.value && !String(userStore.shipmentDetails.destination_postal_code || "").trim())
		) {
			if (!silent) {
				messageError.value = {
					...(!String(userStore.shipmentDetails.origin_city || "").trim()
						|| (isOriginItaly.value && !String(userStore.shipmentDetails.origin_postal_code || "").trim())
						? { origin_query: [isOriginItaly.value
							? "Seleziona una località valida per la partenza."
							: "Inserisci almeno la città di partenza per il paese selezionato."] }
						: {}),
					...(!String(userStore.shipmentDetails.destination_city || "").trim()
						|| (isDestinationItaly.value && !String(userStore.shipmentDetails.destination_postal_code || "").trim())
						? { dest_query: [isDestinationItaly.value
							? "Seleziona una località valida per la destinazione."
							: "Inserisci almeno la città di destinazione per il paese selezionato."] }
						: {}),
				};
				scrollToFirstError();
			}
			return false;
		}

		if (isEuropeMonocollo.value) {
			if (userStore.packages.length !== 1) {
				if (!silent) {
					messageError.value = { packages: ["Per l'Europa e disponibile un solo collo per spedizione."] };
					scrollToFirstError();
				}
				return false;
			}

			if ((Number(userStore.packages[0]?.quantity) || 1) !== 1) {
				if (!silent) {
					messageError.value = { packages: ["Per l'Europa la quantita deve essere 1."] };
					scrollToFirstError();
				}
				return false;
			}
		}

		if (!userStore.packages || userStore.packages.length === 0) {
			if (!silent) {
				messageError.value = { packages: ["Seleziona almeno un tipo di collo."] };
				scrollToFirstError();
			}
			return false;
		}

		for (let i = 0; i < userStore.packages.length; i++) {
			const pack = userStore.packages[i];
			if (!pack.weight || !pack.first_size || !pack.second_size || !pack.third_size) {
				if (!silent) {
					messageError.value = { packages: ["Compila peso e dimensioni per tutti i colli."] };
					scrollToFirstError();
				}
				return false;
			}

			if (pack.weight_price == null) {
				calcPriceWithWeight(pack);
			}
			if (pack.volume_price == null && pack.first_size && pack.second_size && pack.third_size) {
				calcPriceWithVolume(pack);
			}
			if (pack.single_price == null || pack.single_price === undefined) {
				checkPrices(pack);
			}
			if (pack.single_price == null || pack.single_price === undefined) {
				if (!silent) {
					messageError.value = { packages: ["Errore nel calcolo del prezzo. Reinserisci peso e dimensioni."] };
				}
				return false;
			}
		}

		const runRequest = async () => {
			if (silent) {
				isSyncingQuote.value = true;
			} else {
				isCalculating.value = true;
			}
			try {
				await sanctum("/sanctum/csrf-cookie");
				const response = await sanctum("/api/session/first-step", {
					method: "POST",
					body: quotePayload,
				});
				if (requestId !== latestQuoteRequestId) {
					return false;
				}
				syncQuoteStateFromSession(response?.data || response, { sourceSignature: currentSignature });
				lastQuotedSignature.value = currentSignature;
				if (!silent) {
					messageError.value = null;
				}
				return true;
			} catch (error) {
				if (!silent) {
					messageError.value = error?.data?.errors || { packages: ["Errore durante il calcolo. Riprova."] };
					scrollToFirstError();
				}
				return false;
			} finally {
				if (silent) {
					isSyncingQuote.value = false;
				} else {
					isCalculating.value = false;
				}
				if (pendingQuoteRequestId === requestId) {
					pendingQuoteSignature = "";
					pendingQuoteSilent = false;
					pendingQuoteRequestId = 0;
					pendingQuotePromise = null;
				}
			}
		};

		pendingQuoteSignature = currentSignature;
		pendingQuoteSilent = silent;
		pendingQuoteRequestId = requestId;
		pendingQuotePromise = runRequest();
		return pendingQuotePromise;
	};

	// --- NAVIGAZIONE STEP ---
	const continueToNextStep = async () => {
		if (isCalculating.value || isAdvancingToServices.value) return;

		messageError.value = null;
		isAdvancingToServices.value = true;
		quoteTransitionLock.value = true;
		if (autoQuoteTimer) {
			clearTimeout(autoQuoteTimer);
			autoQuoteTimer = null;
		}
		const unlockTimer = setTimeout(() => {
			quoteTransitionLock.value = false;
		}, 8000);
		try {
			await flushLocationDraftsForSubmit();
			const payloadSnapshot = buildQuotePayloadSnapshot();
			const payloadSignature = buildQuoteComparableSignature(payloadSnapshot);
			const hasPendingSameQuote = Boolean(
				pendingQuotePromise
				&& pendingQuoteSignature === payloadSignature
			);
			let isValid = false;

			if (hasPendingSameQuote) {
				isValid = await pendingQuotePromise;
				if (!isValid) {
					isValid = await calculateRate({ silent: false, payload: payloadSnapshot });
				}
			} else {
				isValid = await calculateRate({ silent: false, payload: payloadSnapshot });
			}

			if (!isValid) return;

			const refreshedSession = await refresh().catch(() => session.value);
			const refreshedData = refreshedSession?.data || refreshedSession || null;

			if (refreshedData) {
				syncQuoteStateFromSession(refreshedData, { sourceSignature: payloadSignature });
			} else {
				syncQuoteStateFromSession(payloadSnapshot, { sourceSignature: payloadSignature });
			}

			lastQuotedSignature.value = payloadSignature;
			await nextTick();
			await navigateTo('/la-tua-spedizione/2', { replace: true });
			userStore.stepNumber = 2;
			userStore.isQuoteStarted = true;
		} finally {
			clearTimeout(unlockTimer);
			await nextTick();
			quoteTransitionLock.value = false;
			isAdvancingToServices.value = false;
		}
	};

	// --- WATCHERS ---
	const resetQuoteState = () => {
		if (isAdvancingToServices.value) return;
		messageError.value = null;
		if (autoQuoteTimer) {
			clearTimeout(autoQuoteTimer);
			autoQuoteTimer = null;
		}
	};

	watch(
		() => userStore.packages,
		resetQuoteState,
		{ deep: true },
	);

	watch(
		() => userStore.shipmentDetails,
		resetQuoteState,
		{ deep: true },
	);

	watch(
		() => userStore.shipmentDetails.destination_country_code,
		() => {
			applyDestinationCountrySelection(false);
		},
		{ immediate: true },
	);

	watch(
		() => userStore.shipmentDetails.origin_country_code,
		() => {
			applyOriginCountrySelection(false);
		},
		{ immediate: true },
	);

	watch(
		() => [userStore.shipmentDetails.origin_postal_code, userStore.shipmentDetails.destination_postal_code],
		() => {
			for (const pack of userStore.packages) {
				if (pack.weight_price != null || pack.volume_price != null) {
					checkPrices(pack);
				}
			}
		},
	);

	watch(
		() => [quoteSignature.value, quoteReadyForRealtime.value],
		() => {
			if (autoQuoteTimer) {
				clearTimeout(autoQuoteTimer);
				autoQuoteTimer = null;
			}

			if (isAdvancingToServices.value || isCalculating.value) return;
			if (!quoteReadyForRealtime.value) return;
			if (lastQuotedSignature.value === quoteSignature.value) return;

			autoQuoteTimer = setTimeout(() => {
				calculateRate({ silent: true }).catch(() => null);
			}, 450);
		},
		{ flush: "post" },
	);

	watch(
		() => userStore.packages.length,
		(length) => {
			if (length === 0) {
				ensurePrimaryPackage();
			}
		},
	);

	// --- RESET FORM ---
	const resetForm = () => {
		if (autoQuoteTimer) {
			clearTimeout(autoQuoteTimer);
			autoQuoteTimer = null;
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

	onBeforeUnmount(() => {
		if (autoQuoteTimer) {
			clearTimeout(autoQuoteTimer);
		}
	});

	return {
		// Refs
		formRef,
		messageError,
		isCalculating,
		isSyncingQuote,
		isAdvancingToServices,

		// Store
		userStore,

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
