export const useLocationSearch = (client) => {
	const locationSearchError = ref("");

	const setLocationSearchError = () => {
		locationSearchError.value = "Ricerca località temporaneamente non disponibile. Riprova tra pochi secondi.";
	};

	const clearLocationSearchError = () => {
		locationSearchError.value = "";
	};

	const normalizeCountryCode = (value = "") => {
		const normalized = String(value || "").trim().toUpperCase();
		return normalized.length === 2 ? normalized : "";
	};

	const buildCountryQuery = (countryCode) => {
		const normalized = normalizeCountryCode(countryCode);
		return normalized ? `&country=${encodeURIComponent(normalized)}` : "";
	};

	const normalizeLocationText = (value = "") =>
		String(value)
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/\s+/g, " ")
			.trim();

	const getProvinceLabel = (location) =>
		String(location?.province ?? location?.province_name ?? "")
			.toUpperCase()
			.trim();

	const locationKey = (location) => [
		String(location?.postal_code || "").trim(),
		normalizeLocationText(location?.place_name),
		getProvinceLabel(location),
	].join("|");

	const dedupeLocations = (locations = []) => {
		const map = new Map();
		for (const location of locations) {
			if (!location?.place_name || !location?.postal_code) continue;
			const key = locationKey(location);
			if (!map.has(key)) map.set(key, location);
		}
		return Array.from(map.values());
	};

	const cityMatchesQuery = (cityValue, rawQuery) => {
		const city = normalizeLocationText(cityValue);
		const query = normalizeLocationText(rawQuery);
		if (!query) return true;
		return city.startsWith(query);
	};

	const sortLocations = (a, b) => {
		const aName = normalizeLocationText(a?.place_name || "");
		const bName = normalizeLocationText(b?.place_name || "");
		if (aName !== bName) return aName.localeCompare(bName);
		return String(a?.postal_code || "").localeCompare(String(b?.postal_code || ""));
	};

	const cityRelevanceScore = (location, rawQuery) => {
		const query = normalizeLocationText(rawQuery);
		const city = normalizeLocationText(location?.place_name || "");
		if (!query) return 99;

		if (city === query) return 0;
		if (city.startsWith(`${query} `) || city.startsWith(`${query}'`) || city.startsWith(`${query}-`)) return 1;
		if (city.startsWith(query)) return 2;
		return 99;
	};

	const sortCitySuggestionsByRelevance = (locations, query) => {
		return [...locations].sort((a, b) => {
			const scoreA = cityRelevanceScore(a, query);
			const scoreB = cityRelevanceScore(b, query);
			if (scoreA !== scoreB) return scoreA - scoreB;

			const nameA = normalizeLocationText(a?.place_name || "");
			const nameB = normalizeLocationText(b?.place_name || "");
			if (nameA.length !== nameB.length) return nameA.length - nameB.length;
			if (nameA !== nameB) return nameA.localeCompare(nameB);

			return String(a?.postal_code || "").localeCompare(String(b?.postal_code || ""));
		});
	};

	const requestLocations = async (url) => {
		let primaryError = null;

		if (typeof client === "function") {
			try {
				return await client(url);
			} catch (error) {
				primaryError = error;
			}
		}

		try {
			return await $fetch(url, {
				credentials: "include",
			});
		} catch (fallbackError) {
			throw primaryError || fallbackError;
		}
	};

	const searchLocations = async (query, limit = 200, countryCode = "") => {
		if (!query || String(query).trim().length < 2) return [];
		try {
			const q = encodeURIComponent(String(query).trim());
			const results = await requestLocations(`/api/locations/search?q=${q}&limit=${limit}${buildCountryQuery(countryCode)}`);
			clearLocationSearchError();
			return dedupeLocations(results || []);
		} catch {
			setLocationSearchError();
			return [];
		}
	};

	const searchLocationsByCap = async (cap, countryCode = "") => {
		if (!cap) return [];
		try {
			const q = encodeURIComponent(String(cap).trim());
			const results = await requestLocations(`/api/locations/by-cap?cap=${q}${buildCountryQuery(countryCode)}`);
			clearLocationSearchError();
			return dedupeLocations(results || []);
		} catch {
			setLocationSearchError();
			return [];
		}
	};

	const searchLocationsByCity = async (city, limit = 200, countryCode = "") => {
		if (!city || String(city).trim().length < 2) return [];
		try {
			const q = encodeURIComponent(String(city).trim());
			const results = await requestLocations(`/api/locations/by-city?city=${q}&limit=${limit}${buildCountryQuery(countryCode)}`);
			clearLocationSearchError();
			return dedupeLocations(results || []);
		} catch {
			setLocationSearchError();
			return [];
		}
	};

	return {
		cityMatchesQuery,
		clearLocationSearchError,
		dedupeLocations,
		getProvinceLabel,
		locationKey,
		locationSearchError,
		normalizeLocationText,
		searchLocations,
		searchLocationsByCap,
		searchLocationsByCity,
		sortCitySuggestionsByRelevance,
		sortLocations,
	};
};
