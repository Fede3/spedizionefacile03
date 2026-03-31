export const useQuickQuoteLocations = ({
	shipmentDetails,
	search,
	smartValidation,
	onCapInputSmart,
	debounceMs = 180,
}) => {
	const {
		cityMatchesQuery,
		clearLocationSearchError,
		getProvinceLabel,
		locationKey,
		normalizeLocationText,
		searchLocations,
		searchLocationsByCap,
		searchLocationsByCity,
		sortCitySuggestionsByRelevance,
		sortLocations,
	} = search;

	const originSuggestions = ref([]);
	const destSuggestions = ref([]);
	const showOriginSuggestions = ref(false);
	const showDestSuggestions = ref(false);
	const originQuery = ref("");
	const destQuery = ref("");

	let originHideTimeout = null;
	let destHideTimeout = null;
	let originSearchTimeout = null;
	let destSearchTimeout = null;
	let originSearchSeq = 0;
	let destSearchSeq = 0;

	const isCapQuery = (value = "") => /^\d+$/.test(String(value).trim());
	const normalizeCap = (value = "", countryCode = "IT") => smartValidation.filterCAP(String(value).trim(), { countryCode });
	const resolveCountryCode = (location) => String(location?.country_code || "IT").trim().toUpperCase() || "IT";
	const resolveCountryName = (location) => String(location?.country_name || (resolveCountryCode(location) === "IT" ? "Italia" : resolveCountryCode(location))).trim();

	const formatLocationDisplay = (city = "", cap = "") => {
		const trimmedCity = String(city || "").trim();
		const trimmedCap = String(cap || "").trim();
		if (trimmedCity && trimmedCap) return `${trimmedCity} · ${trimmedCap}`;
		return trimmedCity || trimmedCap || "";
	};

	const applyQueryDraftToShipment = (queryRef, cityKey, capKey, fieldKey, countryCodeKey, countryNameKey) => {
		const rawQuery = String(queryRef.value || "").trim();
		const currentCountryCode = String(shipmentDetails[countryCodeKey] || "IT").trim().toUpperCase() || "IT";
		const currentCountryName = String(
			shipmentDetails[countryNameKey]
			|| (currentCountryCode === "IT" ? "Italia" : currentCountryCode),
		).trim();

		if (!rawQuery) {
			clearLocationSearchError?.();
			shipmentDetails[cityKey] = "";
			shipmentDetails[capKey] = "";
			shipmentDetails[countryCodeKey] = currentCountryCode;
			shipmentDetails[countryNameKey] = currentCountryName;
			smartValidation.clearError(fieldKey);
			return "";
		}

		if (isCapQuery(rawQuery)) {
			clearLocationSearchError?.();
			const filteredCap = normalizeCap(rawQuery, currentCountryCode);
			queryRef.value = filteredCap;
			shipmentDetails[capKey] = filteredCap;
			shipmentDetails[cityKey] = "";
			shipmentDetails[countryCodeKey] = currentCountryCode;
			shipmentDetails[countryNameKey] = currentCountryName;
			onCapInputSmart(fieldKey, filteredCap, currentCountryCode);
			return filteredCap;
		}

		clearLocationSearchError?.();
		shipmentDetails[cityKey] = rawQuery;
		shipmentDetails[capKey] = "";
		shipmentDetails[countryCodeKey] = currentCountryCode;
		shipmentDetails[countryNameKey] = currentCountryName;
		smartValidation.clearError(fieldKey);
		return rawQuery;
	};

	const getCitySuggestions = async (query, countryCode = "IT") => {
		if (!query || query.length < 2) return [];

		let results = await searchLocationsByCity(query, 200, countryCode);
		if (!results.length) {
			results = await searchLocations(query, 500, countryCode);
		}

		return sortCitySuggestionsByRelevance(
			results
				.filter((location) => cityMatchesQuery(location.place_name, query))
				.sort(sortLocations),
			query,
		);
	};

	const getCapSuggestions = async (capQuery, linkedCityQuery = "", countryCode = "IT") => {
		if (!capQuery || capQuery.length < 3) return [];

		let results = [];
		if (capQuery.length === 5) {
			results = await searchLocationsByCap(capQuery, countryCode);
		} else {
			results = await searchLocations(capQuery, 500, countryCode);
		}

		return results
			.filter((location) => String(location.postal_code || "").startsWith(capQuery))
			.filter((location) => !linkedCityQuery || cityMatchesQuery(location.place_name, linkedCityQuery))
			.sort(sortLocations);
	};

	const getSuggestionsForQuery = async (queryValue, linkedCity = "", countryCode = "IT") => {
		const query = String(queryValue || "").trim();
		if (!query) return [];

		if (isCapQuery(query)) {
			return getCapSuggestions(normalizeCap(query, countryCode), linkedCity, countryCode);
		}

		return getCitySuggestions(query, countryCode);
	};

	const findAutoResolvedLocation = (queryValue, suggestions = [], countryCode = "IT") => {
		const query = String(queryValue || "").trim();
		if (!query || !suggestions.length) return null;

		if (isCapQuery(query)) {
			const filteredCap = normalizeCap(query, countryCode);
			return suggestions.find((location) => String(location.postal_code || "") === filteredCap) || null;
		}

		const normalizedQuery = normalizeLocationText(query);
		const exactMatches = suggestions.filter(
			(location) => normalizeLocationText(location.place_name) === normalizedQuery,
		);

		return exactMatches.length === 1 ? exactMatches[0] : null;
	};

	const hideOriginSuggestions = () => {
		clearTimeout(originHideTimeout);
		originHideTimeout = setTimeout(() => {
			showOriginSuggestions.value = false;
			originHideTimeout = null;
		}, 200);
	};

	const hideDestSuggestions = () => {
		clearTimeout(destHideTimeout);
		destHideTimeout = setTimeout(() => {
			showDestSuggestions.value = false;
			destHideTimeout = null;
		}, 200);
	};

	const selectOriginLocation = (location) => {
		clearLocationSearchError?.();
		shipmentDetails.origin_city = location.place_name;
		shipmentDetails.origin_postal_code = location.postal_code;
		shipmentDetails.origin_country_code = resolveCountryCode(location);
		shipmentDetails.origin_country = resolveCountryName(location);
		originQuery.value = formatLocationDisplay(location.place_name, location.postal_code);
		onCapInputSmart("origin_cap", shipmentDetails.origin_postal_code, shipmentDetails.origin_country_code);
		smartValidation.clearError("origin_cap");
		clearTimeout(originHideTimeout);
		showOriginSuggestions.value = false;
	};

	const selectDestLocation = (location) => {
		clearLocationSearchError?.();
		shipmentDetails.destination_city = location.place_name;
		shipmentDetails.destination_postal_code = location.postal_code;
		shipmentDetails.destination_country_code = resolveCountryCode(location);
		shipmentDetails.destination_country = resolveCountryName(location);
		destQuery.value = formatLocationDisplay(location.place_name, location.postal_code);
		onCapInputSmart("dest_cap", shipmentDetails.destination_postal_code, shipmentDetails.destination_country_code);
		smartValidation.clearError("dest_cap");
		clearTimeout(destHideTimeout);
		showDestSuggestions.value = false;
	};

	const updateOriginSuggestions = async () => {
		const query = applyQueryDraftToShipment(originQuery, "origin_city", "origin_postal_code", "origin_cap", "origin_country_code", "origin_country");
		const seq = ++originSearchSeq;

		if ((isCapQuery(query) && query.length < 3) || (!isCapQuery(query) && query.length < 2)) {
			originSuggestions.value = [];
			showOriginSuggestions.value = false;
			return;
		}

		const suggestions = await getSuggestionsForQuery(
			query,
			shipmentDetails.origin_city,
			shipmentDetails.origin_country_code,
		);
		if (seq !== originSearchSeq) return;
		originSuggestions.value = suggestions;
		showOriginSuggestions.value = suggestions.length > 0;
	};

	const updateDestSuggestions = async () => {
		const query = applyQueryDraftToShipment(destQuery, "destination_city", "destination_postal_code", "dest_cap", "destination_country_code", "destination_country");
		const seq = ++destSearchSeq;

		if ((isCapQuery(query) && query.length < 3) || (!isCapQuery(query) && query.length < 2)) {
			destSuggestions.value = [];
			showDestSuggestions.value = false;
			return;
		}

		const suggestions = await getSuggestionsForQuery(
			query,
			shipmentDetails.destination_city,
			shipmentDetails.destination_country_code,
		);
		if (seq !== destSearchSeq) return;
		destSuggestions.value = suggestions;
		showDestSuggestions.value = suggestions.length > 0;
	};

	const onOriginQueryInput = () => {
		clearLocationSearchError?.();
		clearTimeout(originSearchTimeout);
		clearTimeout(originHideTimeout);
		originSearchTimeout = setTimeout(updateOriginSuggestions, debounceMs);
	};

	const onDestQueryInput = () => {
		clearLocationSearchError?.();
		clearTimeout(destSearchTimeout);
		clearTimeout(destHideTimeout);
		destSearchTimeout = setTimeout(updateDestSuggestions, debounceMs);
	};

	const onOriginQueryFocus = async () => {
		clearLocationSearchError?.();
		clearTimeout(originHideTimeout);
		const seq = ++originSearchSeq;
		const query = String(originQuery.value || "").trim()
			|| formatLocationDisplay(shipmentDetails.origin_city, shipmentDetails.origin_postal_code);

		if ((isCapQuery(query) && query.length < 3) || (!isCapQuery(query) && query.length < 2)) {
			return;
		}

		const suggestions = await getSuggestionsForQuery(
			query,
			shipmentDetails.origin_city,
			shipmentDetails.origin_country_code,
		);
		if (seq !== originSearchSeq) return;
		originSuggestions.value = suggestions;
		showOriginSuggestions.value = suggestions.length > 0;
	};

	const onDestQueryFocus = async () => {
		clearLocationSearchError?.();
		clearTimeout(destHideTimeout);
		const seq = ++destSearchSeq;
		const query = String(destQuery.value || "").trim()
			|| formatLocationDisplay(shipmentDetails.destination_city, shipmentDetails.destination_postal_code);

		if ((isCapQuery(query) && query.length < 3) || (!isCapQuery(query) && query.length < 2)) {
			return;
		}

		const suggestions = await getSuggestionsForQuery(
			query,
			shipmentDetails.destination_city,
			shipmentDetails.destination_country_code,
		);
		if (seq !== destSearchSeq) return;
		destSuggestions.value = suggestions;
		showDestSuggestions.value = suggestions.length > 0;
	};

	const settleOriginQuery = async () => {
		const query = String(originQuery.value || "").trim();
		if (!query) {
			hideOriginSuggestions();
			return;
		}

		const suggestions = await getSuggestionsForQuery(
			query,
			shipmentDetails.origin_city,
			shipmentDetails.origin_country_code,
		);
		const autoResolvedLocation = findAutoResolvedLocation(
			query,
			suggestions,
			shipmentDetails.origin_country_code,
		);
		if (autoResolvedLocation) {
			selectOriginLocation(autoResolvedLocation);
			return;
		}

		hideOriginSuggestions();
	};

	const settleDestQuery = async () => {
		const query = String(destQuery.value || "").trim();
		if (!query) {
			hideDestSuggestions();
			return;
		}

		const suggestions = await getSuggestionsForQuery(
			query,
			shipmentDetails.destination_city,
			shipmentDetails.destination_country_code,
		);
		const autoResolvedLocation = findAutoResolvedLocation(
			query,
			suggestions,
			shipmentDetails.destination_country_code,
		);
		if (autoResolvedLocation) {
			selectDestLocation(autoResolvedLocation);
			return;
		}

		hideDestSuggestions();
	};

	watch(
		() => [shipmentDetails.origin_city, shipmentDetails.origin_postal_code],
		([city, cap]) => {
			const formattedValue = formatLocationDisplay(city, cap);
			if (formattedValue !== originQuery.value) {
				originQuery.value = formattedValue;
			}
		},
		{ immediate: true },
	);

	watch(
		() => [shipmentDetails.destination_city, shipmentDetails.destination_postal_code],
		([city, cap]) => {
			const formattedValue = formatLocationDisplay(city, cap);
			if (formattedValue !== destQuery.value) {
				destQuery.value = formattedValue;
			}
		},
		{ immediate: true },
	);

	onBeforeUnmount(() => {
		clearTimeout(originSearchTimeout);
		clearTimeout(destSearchTimeout);
		clearTimeout(originHideTimeout);
		clearTimeout(destHideTimeout);
	});

	return {
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
	};
};
