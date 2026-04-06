/**
 * COMPOSABLE: usePreventivoCalc (usePreventivoCalc.js)
 * SCOPO: Calcolo tariffe, chiamate API, sync sessione, auto-quote, de-duplicazione richieste.
 *
 * Sub-composable di usePreventivo. Gestisce tutto cio che riguarda
 * la comunicazione col backend: CSRF, richieste API, calcolo tariffa,
 * sincronizzazione sessione, auto-quote timer e de-duplicazione.
 *
 * @param {Object} deps - Dipendenze iniettate dall'orchestratore
 */
export const usePreventivoCalc = (deps) => {
	const {
		userStore,
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
	} = deps;

	// --- STATO CALCOLO ---
	const messageError = ref(null);
	const isCalculating = ref(false);
	const isSyncingQuote = ref(false);
	const isAdvancingToServices = ref(false);
	const lastQuotedSignature = ref("");

	// --- STATO RICHIESTE PENDENTI ---
	let pendingQuotePromise = null;
	let pendingQuoteSignature = "";
	let pendingQuoteSilent = false;
	let pendingQuoteRequestId = 0;
	let latestQuoteRequestId = 0;

	// --- API HELPERS ---
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

		return await publicApiFetch(path, {
			...options,
			method,
			headers,
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
				await requestClient("/sanctum/csrf-cookie");
				const response = await requestClient("/api/session/first-step", {
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

	// --- RESET QUOTE STATE (for watchers) ---
	const resetQuoteState = () => {
		if (isAdvancingToServices.value) return;
		messageError.value = null;
		const timer = autoQuoteTimerRef();
		if (timer) {
			clearTimeout(timer);
			autoQuoteTimerRef(null);
		}
	};

	return {
		messageError,
		isCalculating,
		isSyncingQuote,
		isAdvancingToServices,
		lastQuotedSignature,
		publicApiFetch,
		requestClient,
		syncQuoteStateFromSession,
		calculateRate,
		resetQuoteState,
		// Expose pending state for continueToNextStep
		getPendingQuotePromise: () => pendingQuotePromise,
		getPendingQuoteSignature: () => pendingQuoteSignature,
	};
};
