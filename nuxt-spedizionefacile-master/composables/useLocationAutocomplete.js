/**
 * Composable riutilizzabile per l'autocomplete citta'/CAP.
 *
 * USO:
 *   const { suggestions, show, onCityInput, onCapInput, select, hide } = useLocationAutocomplete()
 *
 * Ogni istanza gestisce un singolo campo citta'+CAP (es. origine o destinazione).
 * Chiama endpoint contestuali:
 *   - citta' -> /api/locations/by-city
 *   - CAP completo -> /api/locations/by-cap
 *   - CAP parziale -> /api/locations/search
 * Al click su un suggerimento, compila sia citta' che CAP.
 */
export function useLocationAutocomplete() {
	const sanctum = useSanctumClient();
	const suggestions = ref([]);
	const show = ref(false);
	let searchTimeout = null;

	// Cleanup timeout on component unmount to prevent memory leaks
	onUnmounted(() => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
			searchTimeout = null;
		}
	});

	const sanitizeProvinceCode = (value) => {
		const province = String(value || '')
			.replace(/[^a-z]/gi, '')
			.slice(0, 2)
			.toUpperCase();
		return province.length === 2 ? province : '';
	};

	const sanitizeLocationRows = (rows = []) => {
		const seen = new Set();
		return (Array.isArray(rows) ? rows : [])
			.map((row) => {
				const postalCode = String(row?.postal_code || '')
					.replace(/\D/g, '')
					.slice(0, 5);
				const placeName = String(row?.place_name || '')
					.replace(/\d/g, '')
					.replace(/\s{2,}/g, ' ')
					.trim();
				const province = sanitizeProvinceCode(row?.province || '');

				if (postalCode.length !== 5 || !placeName || !province) return null;

				const key = `${postalCode}|${placeName}|${province}`;
				if (seen.has(key)) return null;
				seen.add(key);

				return {
					...row,
					postal_code: postalCode,
					place_name: placeName,
					province,
				};
			})
			.filter(Boolean);
	};

	const searchLocations = async (query, field) => {
		if (!query || query.length < 2) return [];
		try {
			const encodedQuery = encodeURIComponent(query);
			let results = [];

			if (field === 'city') {
				results = await sanctum(`/api/locations/by-city?city=${encodedQuery}&limit=200`);
			} else if (query.length === 5) {
				results = await sanctum(`/api/locations/by-cap?cap=${encodedQuery}`);
			} else {
				results = await sanctum(`/api/locations/search?q=${encodedQuery}&limit=200`);
			}

			// Ordina per rilevanza: exact match > starts-with (più corto prima) > contains
			const queryLower = query.toLowerCase();
			results.sort((a, b) => {
				const aName = (a.place_name || '').toLowerCase();
				const bName = (b.place_name || '').toLowerCase();

				// 1. Exact match ha priorità ASSOLUTA
				if (aName === queryLower && bName !== queryLower) return -1;
				if (bName === queryLower && aName !== queryLower) return 1;

				// 2. Starts-with ha priorità su contains
				const aStarts = aName.startsWith(queryLower);
				const bStarts = bName.startsWith(queryLower);
				if (aStarts && !bStarts) return -1;
				if (bStarts && !aStarts) return 1;

				// 3. Se entrambi iniziano con la query, il PIÙ CORTO vince
				if (aStarts && bStarts) {
					return aName.length - bName.length;
				}

				// 4. Altrimenti ordine alfabetico
				return aName.localeCompare(bName);
			});

			return sanitizeLocationRows(results);
		} catch {
			return [];
		}
	};

	/**
	 * Chiama su @input del campo citta'.
	 * @param {string} cityValue - valore corrente del campo citta'
	 */
	const onCityInput = (cityValue) => {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(async () => {
			if (cityValue && cityValue.length >= 2) {
				suggestions.value = await searchLocations(cityValue, 'city');
				show.value = suggestions.value.length > 0;
			} else {
				show.value = false;
			}
		}, 300);
	};

	/**
	 * Chiama su @input del campo CAP.
	 * @param {string} capValue - valore corrente del campo CAP
	 */
	const onCapInput = (capValue) => {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(async () => {
			if (capValue && capValue.length >= 2) {
				suggestions.value = await searchLocations(capValue, 'cap');
				show.value = suggestions.value.length > 0;
			} else {
				show.value = false;
			}
		}, 300);
	};

	/**
	 * Chiama su @mousedown.prevent del suggerimento selezionato.
	 * Restituisce l'oggetto location selezionato.
	 * Il componente padre deve compilare i campi city e postal_code.
	 * @param {Object} loc - { postal_code, place_name, province }
	 */
	const select = (loc) => {
		show.value = false;
		suggestions.value = [];
		return loc;
	};

	const hide = () => {
		show.value = false;
	};

	const reset = () => {
		clearTimeout(searchTimeout);
		suggestions.value = [];
		show.value = false;
	};

	return {
		suggestions,
		show,
		onCityInput,
		onCapInput,
		select,
		hide,
		reset,
	};
}
