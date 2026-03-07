<script setup>
import MapPudo from '~/components/MapPudo.client.vue';

const props = defineProps({
	initialCity: { type: String, default: '' },
	initialZip: { type: String, default: '' },
});

const emit = defineEmits(['select', 'deselect']);
const config = useRuntimeConfig();
const apiBase = config.public?.apiBase || '';

const publicApiFetch = async (path) => {
	const url = path.startsWith('http') ? path : `${apiBase}${path}`;
	return await $fetch(url, {
		method: 'GET',
		credentials: 'include',
		timeout: 15000,
	});
};

const getErrorStatus = (error) => {
	return Number(error?.status ?? error?.response?.status ?? error?.data?.statusCode ?? 0);
};

const getErrorMessage = (error) => {
	return error?.data?.error || error?.data?.message || error?.response?._data?.message || error?.message || '';
};

const searchAddress = ref('');
const searchCity = ref(props.initialCity || '');
const searchZip = ref(props.initialZip || '');

const loading = ref(false);
const geolocating = ref(false);
const searched = ref(false);
const searchError = ref(null);
const searchMeta = ref(null);
const referenceUpdateMessage = ref('');

const pudoResults = ref([]);
const selectedPudoKey = ref(null);
const expandedPudoKey = ref(null);
const loadingDetailsKey = ref(null);
const pudoDetails = ref({});
const detailsErrors = ref({});
const mapClickLoading = ref(false);

const referencePoint = ref(null); // { latitude, longitude, address, city, zip_code, label, source }
const nowTick = ref(Date.now());
let nowTimer = null;

const hasSearchInput = computed(() => Boolean(searchCity.value?.trim() || searchZip.value?.trim()));
const mapPoints = computed(() => pudoResults.value.filter((p) => isFiniteCoordinate(p.latitude) && isFiniteCoordinate(p.longitude)));

const mapReferencePoint = computed(() => {
	if (!referencePoint.value) return null;
	return {
		latitude: referencePoint.value.latitude,
		longitude: referencePoint.value.longitude,
		address: referencePoint.value.address || '',
		city: referencePoint.value.city || '',
		zip_code: referencePoint.value.zip_code || '',
		label: referencePoint.value.label || '',
	};
});

const strategyListLabel = computed(() => {
	const strategies = Array.isArray(searchMeta.value?.strategy_used) ? searchMeta.value.strategy_used : [];
	if (!strategies.length) return '';

	const labels = {
		city_zip: 'citta + CAP',
		city_only: 'solo citta',
		city_alt_zip: 'citta con CAP alternativi',
		zip_only: 'solo CAP',
		nearby_geo: 'integrazione nearby geolocalizzata',
		nearby_geo_input: 'nearby da geocodifica indirizzo',
		nearby_geo_grid: 'copertura geografica estesa (griglia)',
		fallback_db: 'fallback database locale',
		fallback_db_coordinates: 'fallback database da coordinate',
	};

	return strategies.map((item) => labels[item] || item).join(' • ');
});

watch(
	() => props.initialCity,
	(value) => {
		if (value && !searchCity.value) searchCity.value = value;
	}
);

watch(
	() => props.initialZip,
	(value) => {
		if (value && !searchZip.value) searchZip.value = value;
	}
);

onMounted(() => {
	nowTimer = window.setInterval(() => {
		nowTick.value = Date.now();
	}, 60000);
});

onBeforeUnmount(() => {
	if (nowTimer) {
		window.clearInterval(nowTimer);
		nowTimer = null;
	}
});

const parseCoordinate = (value) => {
	if (value === null || value === undefined || value === '') return null;
	const parsed = Number.parseFloat(String(value).trim().replace(',', '.'));
	return Number.isFinite(parsed) ? parsed : null;
};

const extractLatitude = (point = {}) =>
	parseCoordinate(
		point.latitude ??
		point.lat ??
		point?.coordinates?.latitude ??
		point?.coordinates?.lat ??
		point?.coordinate?.latitude ??
		point?.coordinate?.lat ??
		point?.geo?.latitude ??
		point?.geo?.lat ??
		point?.location?.latitude ??
		point?.location?.lat ??
		point?.address_coordinates?.latitude ??
		point?.address_coordinates?.lat
	);

const extractLongitude = (point = {}) =>
	parseCoordinate(
		point.longitude ??
		point.lng ??
		point.lon ??
		point?.coordinates?.longitude ??
		point?.coordinates?.lng ??
		point?.coordinates?.lon ??
		point?.coordinate?.longitude ??
		point?.coordinate?.lng ??
		point?.coordinate?.lon ??
		point?.geo?.longitude ??
		point?.geo?.lng ??
		point?.geo?.lon ??
		point?.location?.longitude ??
		point?.location?.lng ??
		point?.location?.lon ??
		point?.address_coordinates?.longitude ??
		point?.address_coordinates?.lng ??
		point?.address_coordinates?.lon
	);

const parseDistanceMeters = (value) => {
	if (value === null || value === undefined || value === '') return null;
	const raw = String(value).trim().toLowerCase();
	const cleaned = raw
		.trim()
		.replace(',', '.')
		.replace(/[^\d.-]/g, '');
	if (!cleaned) return null;
	const parsed = Number.parseFloat(cleaned);
	if (!Number.isFinite(parsed)) return null;
	// Alcune sorgenti ritornano distanze in km (es. "0.45 km"), convertiamo correttamente in metri.
	if (raw.includes('km')) return Math.round(parsed * 1000);
	return Math.round(parsed);
};

const isFiniteCoordinate = (value) => Number.isFinite(parseCoordinate(value));

const normalizeTextKey = (value) => String(value || '').trim().toLowerCase();

const getPudoUiKey = (point) => {
	const primary = String(point?.pudo_id || point?.carrier_pudo_id || point?.id || '').trim();
	if (primary) return primary;

	const lat = extractLatitude(point);
	const lng = extractLongitude(point);
	const latPart = Number.isFinite(lat) ? lat.toFixed(6) : 'na';
	const lngPart = Number.isFinite(lng) ? lng.toFixed(6) : 'na';
	return [
		normalizeTextKey(point?.name),
		normalizeTextKey(point?.address),
		normalizeTextKey(point?.zip_code),
		normalizeTextKey(point?.city),
		latPart,
		lngPart,
	].join('|');
};

const setReferencePoint = (latitude, longitude, source = 'fields', extra = {}) => {
	const lat = parseCoordinate(latitude);
	const lng = parseCoordinate(longitude);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

	referencePoint.value = {
		latitude: lat,
		longitude: lng,
		source,
		address: extra.address || searchAddress.value || '',
		city: extra.city || searchCity.value || '',
		zip_code: extra.zip_code || searchZip.value || '',
		label: extra.label || '',
	};
	return true;
};

const toRadians = (deg) => deg * (Math.PI / 180);

const distanceInMeters = (from, to) => {
	if (!from || !to) return null;
	const earthRadius = 6371000;
	const dLat = toRadians(to.latitude - from.latitude);
	const dLng = toRadians(to.longitude - from.longitude);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLng / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return Math.round(earthRadius * c);
};

const normalizePudoPoint = (rawPoint) => {
	const point = rawPoint || {};
	const id = point.pudo_id || point.carrier_pudo_id || point.id || '';
	const latitude = extractLatitude(point);
	const longitude = extractLongitude(point);
	const distance = parseDistanceMeters(point.distance_meters ?? point.distance ?? point.distance_text ?? point.distance_label);

	return {
		pudo_id: String(id),
		carrier_pudo_id: String(point.carrier_pudo_id || id || ''),
		ui_key: getPudoUiKey(point),
		provider: String(point.provider || 'BRT'),
		name: point.name || 'Punto di ritiro BRT',
		address: point.address || '',
		city: point.city || '',
		zip_code: point.zip_code || '',
		province: point.province || '',
		country: point.country || 'ITA',
		latitude,
		longitude,
		distance_meters: distance,
		enabled: typeof point.enabled === 'boolean' ? point.enabled : true,
		opening_hours: point.opening_hours || null,
		localization_hint: point.localization_hint || '',
	};
};

const dedupePudoPoints = (points) => {
	const byKey = new Map();

	points.forEach((point) => {
		const key = getPudoUiKey(point);
		if (!byKey.has(key)) {
			byKey.set(key, point);
			return;
		}

		const current = byKey.get(key);
		const currentDistance = Number.isFinite(Number(current.distance_meters)) ? Number(current.distance_meters) : Number.POSITIVE_INFINITY;
		const incomingDistance = Number.isFinite(Number(point.distance_meters)) ? Number(point.distance_meters) : Number.POSITIVE_INFINITY;
		if (incomingDistance < currentDistance) {
			byKey.set(key, point);
		}
	});

	return Array.from(byKey.values());
};

const sortByDistance = (points) => {
	return [...points].sort((a, b) => {
		const aDistance = Number.isFinite(Number(a.distance_meters)) ? Number(a.distance_meters) : Number.POSITIVE_INFINITY;
		const bDistance = Number.isFinite(Number(b.distance_meters)) ? Number(b.distance_meters) : Number.POSITIVE_INFINITY;
		if (aDistance !== bDistance) return aDistance - bDistance;
		return String(a.name || '').localeCompare(String(b.name || ''), 'it', { sensitivity: 'base' });
	});
};

const inferReferenceFromResults = (points = []) => {
	const coords = points
		.map((point) => ({
			latitude: parseCoordinate(point?.latitude ?? point?.lat),
			longitude: parseCoordinate(point?.longitude ?? point?.lng),
		}))
		.filter((coord) => Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude));

	if (!coords.length) return null;

	const latitude = coords.reduce((sum, coord) => sum + coord.latitude, 0) / coords.length;
	const longitude = coords.reduce((sum, coord) => sum + coord.longitude, 0) / coords.length;

	return {
		latitude,
		longitude,
		source: 'results',
		address: searchAddress.value || '',
		city: searchCity.value || '',
		zip_code: searchZip.value || '',
		label: [searchCity.value, searchZip.value].filter(Boolean).join(' ').trim() || 'Area selezionata',
	};
};

const applyResults = (rawPoints) => {
	const normalized = (rawPoints || []).map(normalizePudoPoint);
	let distanceReference = referencePoint.value;
	const allApiDistancesZero =
		normalized.length > 0 &&
		normalized.every((point) => Number.isFinite(Number(point.distance_meters)) && Number(point.distance_meters) === 0);

	// Se l'utente non ha indicato la via, usiamo comunque un riferimento stabile (centro risultati)
	// per calcolare distanze coerenti ed evitare "0 m" su tutti i punti.
	if (!distanceReference) {
		const inferredReference = inferReferenceFromResults(normalized);
		if (inferredReference) {
			referencePoint.value = inferredReference;
			distanceReference = inferredReference;
		}
	}

	const withComputedDistance = normalized.map((point) => {
		const apiDistance = Number(point.distance_meters);
		const hasApiDistance = Number.isFinite(apiDistance);
		if (distanceReference && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) {
			const computedDistance = distanceInMeters(distanceReference, {
				latitude: point.latitude,
				longitude: point.longitude,
			});

			const shouldReplaceApiDistance =
				!hasApiDistance ||
				apiDistance <= 0 ||
				allApiDistancesZero;

			if (shouldReplaceApiDistance && Number.isFinite(computedDistance)) {
				return {
					...point,
					distance_meters: computedDistance,
				};
			}

			if (hasApiDistance && apiDistance > 0 && Number.isFinite(computedDistance)) {
				// Mantiene la distanza API ma evita outlier grossolani.
				const delta = Math.abs(apiDistance - computedDistance);
				if (delta > 200000) {
					return {
						...point,
						distance_meters: computedDistance,
					};
				}
			}

			return {
				...point,
				distance_meters: hasApiDistance ? apiDistance : computedDistance ?? null,
			};
		}

		// Evita di mostrare "0 m" non affidabili quando non possiamo calcolare.
		if (allApiDistancesZero && Number(point.distance_meters) === 0) {
			return {
				...point,
				distance_meters: null,
			};
		}
		return point;
	});

	const deduped = dedupePudoPoints(withComputedDistance);
	pudoResults.value = sortByDistance(deduped);

	if (selectedPudoKey.value) {
		const exists = pudoResults.value.some((point) => String(point.ui_key) === String(selectedPudoKey.value));
		if (!exists) {
			selectedPudoKey.value = null;
			emit('deselect');
		}
	}

};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 4500) => {
	const controller = new AbortController();
	const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, {
			...options,
			signal: controller.signal,
		});
	} finally {
		window.clearTimeout(timeoutId);
	}
};

const geocodeFromSearchFields = async () => {
	const parts = [searchAddress.value, searchZip.value, searchCity.value, 'Italia']
		.map((item) => String(item || '').trim())
		.filter(Boolean);

	if (!parts.length) return null;

	const query = encodeURIComponent(parts.join(', '));
	const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`;
	const response = await fetchWithTimeout(url, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
		},
	}, 4000);

	if (!response.ok) return null;
	const payload = await response.json();
	const first = Array.isArray(payload) ? payload[0] : null;
	if (!first) return null;

	const latitude = parseCoordinate(first.lat);
	const longitude = parseCoordinate(first.lon);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

	return {
		latitude,
		longitude,
		label: first.display_name || '',
	};
};

const reverseGeocodeFromCoordinates = async (latitude, longitude) => {
	const lat = parseCoordinate(latitude);
	const lng = parseCoordinate(longitude);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

	try {
		const params = new URLSearchParams({
			format: 'jsonv2',
			lat: String(lat),
			lon: String(lng),
			addressdetails: '1',
		});

		const response = await fetchWithTimeout(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
			},
		}, 4000);

		if (!response.ok) return null;
		const payload = await response.json();
		const address = payload?.address || {};
		const street = address.road || address.pedestrian || address.path || '';
		const houseNumber = address.house_number || '';
		const fullAddress = [street, houseNumber].filter(Boolean).join(' ').trim();
		const city = address.city || address.town || address.village || address.municipality || '';
		const zipCode = String(address.postcode || '').replace(/\D/g, '').slice(0, 5);

		return {
			address: fullAddress,
			city,
			zip_code: zipCode,
			label: payload?.display_name || '',
		};
	} catch {
		return null;
	}
};

const fetchNearbyPudo = async (latitude, longitude, maxResults = 50) => {
	const params = new URLSearchParams();
	params.set('latitude', String(latitude));
	params.set('longitude', String(longitude));
	params.set('max_results', String(maxResults));
	const result = await publicApiFetch(`/api/brt/pudo/nearby?${params.toString()}`);
	return result?.pudo || result?.data?.pudo || [];
};

const searchPudo = async () => {
	if (!hasSearchInput.value) return;

	loading.value = true;
	searched.value = true;
	searchError.value = null;
	searchMeta.value = null;
	pudoResults.value = [];

	try {
		const params = new URLSearchParams();
		if (searchAddress.value?.trim()) params.set('address', searchAddress.value.trim());
		if (searchCity.value?.trim()) params.set('city', searchCity.value.trim());
		if (searchZip.value?.trim()) params.set('zip_code', searchZip.value.trim());
		params.set('country', 'ITA');
		params.set('max_results', '50');

		const result = await publicApiFetch(`/api/brt/pudo/search?${params.toString()}`);
		if (result?.success === false) {
			searchError.value = result?.error || 'Errore durante la ricerca dei punti di ritiro.';
			return;
		}

		let points = result?.pudo || result?.data?.pudo || [];
		const apiMeta = result?.meta || result?.data?.meta || {};
		let strategyUsed = Array.isArray(apiMeta.strategy_used) ? [...apiMeta.strategy_used] : [];

		if (!referencePoint.value || referencePoint.value.source !== 'manual') {
			try {
				const geocoded = await geocodeFromSearchFields();
				if (geocoded) {
					setReferencePoint(geocoded.latitude, geocoded.longitude, 'fields', {
						label: geocoded.label,
					});
				}
			} catch (error) {
				console.warn('Geocoding non disponibile:', error);
			}
		}

		// Mostra subito i risultati base: geocode/nearby non devono mai bloccare la UI.
		applyResults(points);
		searchMeta.value = {
			...apiMeta,
			strategy_used: strategyUsed.length ? strategyUsed : apiMeta.strategy_used,
			returned_count: pudoResults.value.length,
			requested_count: 50,
		};

		if (referencePoint.value) {
			try {
				const nearbyPoints = await fetchNearbyPudo(referencePoint.value.latitude, referencePoint.value.longitude, 50);
				if (nearbyPoints.length) {
					points = dedupePudoPoints([...points.map(normalizePudoPoint), ...nearbyPoints.map(normalizePudoPoint)]);
					strategyUsed = Array.from(new Set([...strategyUsed, 'nearby_geo']));
					applyResults(points);
				}
			} catch (error) {
				console.warn('Ricerca nearby non disponibile:', error);
			}
		}

		searchMeta.value = {
			...apiMeta,
			strategy_used: strategyUsed.length ? strategyUsed : apiMeta.strategy_used,
			returned_count: pudoResults.value.length,
			requested_count: 50,
		};
	} catch (error) {
		console.error('Errore ricerca PUDO:', error);
		const status = getErrorStatus(error);
		const backendMessage = getErrorMessage(error);

		if (status === 401 || status === 403) {
			searchError.value = 'Servizio punti di ritiro temporaneamente non disponibile. Riprova tra poco.';
		} else if (status === 422) {
			searchError.value = backendMessage || 'Inserisci almeno citta o CAP per cercare i punti di ritiro.';
		} else if (status >= 500) {
			searchError.value = 'Il servizio BRT non risponde al momento. Riprova tra qualche minuto.';
		} else {
			searchError.value = backendMessage ? `Errore: ${backendMessage}` : 'Errore durante la ricerca. Riprova.';
		}
		pudoResults.value = [];
	} finally {
		loading.value = false;
	}
};

const useCurrentLocation = async () => {
	if (!navigator?.geolocation) {
		searchError.value = 'Geolocalizzazione non supportata dal browser.';
		return;
	}

	geolocating.value = true;
	searchError.value = null;
	referenceUpdateMessage.value = '';

	try {
		const position = await new Promise((resolve, reject) => {
			navigator.geolocation.getCurrentPosition(resolve, reject, {
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 30000,
			});
		});

		const latitude = position?.coords?.latitude;
		const longitude = position?.coords?.longitude;
		const reversedAddress = await reverseGeocodeFromCoordinates(latitude, longitude);
		if (reversedAddress?.address) searchAddress.value = reversedAddress.address;
		if (reversedAddress?.city) searchCity.value = reversedAddress.city;
		if (reversedAddress?.zip_code) searchZip.value = reversedAddress.zip_code;

		if (!setReferencePoint(latitude, longitude, 'geo', {
			label: reversedAddress?.label || 'Posizione attuale',
			address: reversedAddress?.address || '',
			city: reversedAddress?.city || '',
			zip_code: reversedAddress?.zip_code || '',
		})) {
			throw new Error('Coordinate non valide.');
		}
		referenceUpdateMessage.value = 'Riferimento aggiornato dalla tua posizione. Ricerca punti avviata automaticamente.';

		// Se reverse geocode ha compilato almeno città o CAP, avvia la ricerca completa
		// (search + nearby merge) senza richiedere click manuale.
		if (hasSearchInput.value) {
			await searchPudo();
			return;
		}

		// Fallback: se non abbiamo campi testuali, usa comunque ricerca coordinate nearby.
		loading.value = true;
		searched.value = true;
		const nearbyPoints = await fetchNearbyPudo(latitude, longitude, 50);
		applyResults(nearbyPoints);
		searchMeta.value = {
			strategy_used: ['nearby_geo'],
			returned_count: pudoResults.value.length,
			requested_count: 50,
			provider: 'BRT',
			fallback: false,
		};
	} catch (error) {
		console.error('Errore geolocalizzazione:', error);
		const status = getErrorStatus(error);
		const geoCode = Number(error?.code || 0);
		if (status >= 500) {
			searchError.value = 'Servizio geolocalizzazione temporaneamente non disponibile.';
		} else if (geoCode === 1) {
			searchError.value = 'Permesso posizione negato. Attiva la geolocalizzazione per cercare i punti vicini.';
		} else if (geoCode === 3) {
			searchError.value = 'Timeout posizione. Riprova oppure usa citta e CAP.';
		} else {
			searchError.value = 'Impossibile recuperare la posizione attuale.';
		}
		pudoResults.value = [];
		searched.value = true;
	} finally {
		loading.value = false;
		geolocating.value = false;
	}
};

const onMapReferenceClick = async (payload) => {
	const latitude = parseCoordinate(payload?.latitude);
	const longitude = parseCoordinate(payload?.longitude);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

	mapClickLoading.value = true;
	searchError.value = null;
	referenceUpdateMessage.value = '';

	try {
		const reversedAddress = await reverseGeocodeFromCoordinates(latitude, longitude);
		if (reversedAddress?.address) searchAddress.value = reversedAddress.address;
		if (reversedAddress?.city) searchCity.value = reversedAddress.city;
		if (reversedAddress?.zip_code) searchZip.value = reversedAddress.zip_code;

		setReferencePoint(latitude, longitude, 'manual', {
			label: reversedAddress?.label || 'Punto selezionato da mappa',
			address: reversedAddress?.address || '',
			city: reversedAddress?.city || '',
			zip_code: reversedAddress?.zip_code || '',
		});
		referenceUpdateMessage.value = 'Riferimento mappa aggiornato. Ricerca punti avviata automaticamente.';

		if (hasSearchInput.value) {
			await searchPudo();
			return;
		}

		loading.value = true;
		searched.value = true;
		const nearbyPoints = await fetchNearbyPudo(latitude, longitude, 50);
		applyResults(nearbyPoints);
		searchMeta.value = {
			strategy_used: ['nearby_geo'],
			returned_count: pudoResults.value.length,
			requested_count: 50,
			provider: 'BRT',
			fallback: false,
		};
	} catch (error) {
		console.error('Errore click mappa PUDO:', error);
		searchError.value = 'Posizione mappa rilevata, ma non sono riuscito ad aggiornare i punti ora. Riprova.';
	} finally {
		loading.value = false;
		mapClickLoading.value = false;
	}
};

const selectPudo = (pudo) => {
	if (selectedPudoKey.value === pudo.ui_key) {
		selectedPudoKey.value = null;
		emit('deselect');
		return;
	}

	selectedPudoKey.value = pudo.ui_key;
	emit('select', pudo);
};

const toggleDetails = async (pudo) => {
	const detailKey = String(pudo.pudo_id || pudo.ui_key);
	if (expandedPudoKey.value === detailKey) {
		expandedPudoKey.value = null;
		return;
	}

	expandedPudoKey.value = detailKey;
	if (pudoDetails.value[detailKey]) return;
	detailsErrors.value[detailKey] = null;

	if (!pudo?.pudo_id) {
		detailsErrors.value[detailKey] = 'Dettagli non disponibili per questo punto.';
		return;
	}

	loadingDetailsKey.value = detailKey;
	try {
		const result = await publicApiFetch(`/api/brt/pudo/${pudo.pudo_id}`);
		const payload = result?.pudo || result?.data?.pudo || result?.data || result || {};
		pudoDetails.value[detailKey] = {
			opening_hours: payload.opening_hours ?? payload.hours ?? pudo.opening_hours ?? '',
			localization_hint: payload.localization_hint ?? payload.localizationHint ?? pudo.localization_hint ?? '',
			enabled: typeof payload.enabled === 'boolean' ? payload.enabled : pudo.enabled,
		};
	} catch (error) {
		console.error('Errore caricamento dettagli PUDO:', error);
		const status = getErrorStatus(error);
		if (status === 401) {
			detailsErrors.value[detailKey] = 'Dettagli non disponibili al momento.';
		} else if (status >= 500) {
			detailsErrors.value[detailKey] = 'Errore server nel caricamento dettagli.';
		} else {
			detailsErrors.value[detailKey] = 'Impossibile caricare i dettagli di questo punto.';
		}
	} finally {
		loadingDetailsKey.value = null;
	}
};

const formatDistance = (meters) => {
	const value = Number(meters);
	if (!Number.isFinite(value)) return '';
	if (value >= 1000) return `${(value / 1000).toFixed(1)} km`;
	return `${Math.round(value)} m`;
};

const hasDistance = (pudo) => Number.isFinite(Number(pudo?.distance_meters));

const distanceLabel = (pudo) => {
	if (hasDistance(pudo)) return formatDistance(pudo.distance_meters);
	return 'n/d';
};

const splitHoursParts = (rawHours) => {
	if (!rawHours) return [];
	if (Array.isArray(rawHours)) return rawHours.map((item) => String(item || '').trim()).filter(Boolean);
	if (typeof rawHours === 'object') {
		return Object.entries(rawHours)
			.map(([key, value]) => `${key}: ${value}`)
			.filter(Boolean);
	}
	return String(rawHours)
		.split(/\n|\||;/g)
		.map((item) => item.trim())
		.filter(Boolean);
};

const dayTokenMap = {
	0: ['dom', 'domenica', 'sun', 'sunday'],
	1: ['lun', 'lunedi', 'lunedi', 'mon', 'monday'],
	2: ['mar', 'martedi', 'martedi', 'tue', 'tuesday'],
	3: ['mer', 'mercoledi', 'mercoledi', 'wed', 'wednesday'],
	4: ['gio', 'giovedi', 'giovedi', 'thu', 'thursday'],
	5: ['ven', 'venerdi', 'venerdi', 'fri', 'friday'],
	6: ['sab', 'sabato', 'sat', 'saturday'],
};

const extractTodayHours = (rawHours) => {
	const dayTokens = dayTokenMap[new Date(nowTick.value).getDay()] || [];
	const parts = splitHoursParts(rawHours);
	if (!parts.length) return '';

	const dayMatches = parts.filter((part) => dayTokens.some((token) => part.toLowerCase().includes(token)));
	if (dayMatches.length) return dayMatches.join(' | ');

	if (parts.length === 1) return parts[0];
	return '';
};

const parseHourToMinutes = (hourText) => {
	const normalized = String(hourText || '').trim().replace('.', ':');
	const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
	if (!match) return null;
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
	return hours * 60 + minutes;
};

const isCurrentlyOpen = (hoursText) => {
	if (!hoursText) return null;
	const lower = hoursText.toLowerCase();
	if (lower.includes('chiuso')) return false;

	const ranges = [...hoursText.matchAll(/(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})/g)];
	if (!ranges.length) return null;

	const now = new Date(nowTick.value);
	const nowMinutes = now.getHours() * 60 + now.getMinutes();

	return ranges.some((range) => {
		const start = parseHourToMinutes(range[1]);
		const end = parseHourToMinutes(range[2]);
		if (start === null || end === null) return false;
		return nowMinutes >= start && nowMinutes <= end;
	});
};

const getRawOpeningHours = (pudo) => {
	const detailKey = String(pudo.pudo_id || pudo.ui_key);
	const details = pudoDetails.value[detailKey] || {};
	return details.opening_hours ?? pudo.opening_hours;
};

const getTodayHoursText = (pudo) => {
	const text = extractTodayHours(getRawOpeningHours(pudo));
	return text || 'Orari di oggi non disponibili';
};

const getPudoStatus = (pudo) => {
	const detailKey = String(pudo.pudo_id || pudo.ui_key);
	const details = pudoDetails.value[detailKey] || {};
	const enabled = typeof details.enabled === 'boolean' ? details.enabled : pudo.enabled;
	const openFromHours = isCurrentlyOpen(getTodayHoursText(pudo));

	if (enabled === false) return { label: 'Chiuso', className: 'text-rose-700 bg-rose-50 border-rose-200' };
	if (openFromHours === true) return { label: 'Aperto ora', className: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
	if (openFromHours === false) return { label: 'Chiuso ora', className: 'text-rose-700 bg-rose-50 border-rose-200' };
	return { label: 'Da verificare', className: 'text-slate-700 bg-slate-100 border-slate-200' };
};

const formatOpeningHours = (hours) => {
	if (!hours) return '';
	if (typeof hours === 'string') return hours;
	if (Array.isArray(hours)) return hours.join(' | ');
	if (typeof hours === 'object') {
		return Object.entries(hours)
			.map(([day, value]) => `${day}: ${value}`)
			.join(' | ');
	}
	return '';
};
</script>

<template>
	<div class="mt-[16px]">
		<div class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-[minmax(0,1fr)_190px_120px_auto] gap-[10px] items-end">
			<div class="w-full">
				<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Via / Indirizzo (opzionale)</label>
				<input
					id="pudo_search_address"
					v-model="searchAddress"
					type="text"
					placeholder="es. Via Roma 10"
					class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]"
					style="font-size: 16px;"
					@keydown.enter.prevent="searchPudo" />
			</div>

			<div class="w-full">
				<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Citta</label>
				<input
					id="pudo_search_city"
					v-model="searchCity"
					type="text"
					placeholder="es. Iglesias"
					class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]"
					style="font-size: 16px;"
					@keydown.enter.prevent="searchPudo" />
			</div>

			<div class="w-full tablet:max-w-[130px]">
				<label class="block text-[0.75rem] text-[#737373] mb-[4px]">CAP</label>
				<input
					id="pudo_search_zip"
					v-model="searchZip"
					type="text"
					maxlength="5"
					placeholder="es. 09016"
					class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]"
					style="font-size: 16px;"
					@keydown.enter.prevent="searchPudo" />
			</div>

			<div class="col-span-1 tablet:col-span-2 desktop:col-span-1 flex flex-col tablet:flex-row items-stretch tablet:items-end gap-[8px] w-full tablet:w-auto">
				<button
					type="button"
					@click="searchPudo"
					:disabled="loading || !hasSearchInput"
					class="inline-flex items-center justify-center gap-[6px] h-[44px] px-[16px] bg-[#095866] text-white rounded-[8px] text-[0.875rem] font-semibold hover:bg-[#074a56] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap min-w-0 tablet:min-w-[142px]">
					<svg v-if="!loading" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
					<span v-if="loading" class="inline-block w-[16px] h-[16px] border-2 border-white border-t-transparent rounded-full animate-spin"></span>
					{{ loading ? 'Ricerca...' : 'Cerca punti' }}
				</button>
				<button
					type="button"
					@click="useCurrentLocation"
					:disabled="geolocating || loading"
					class="inline-flex items-center justify-center gap-[6px] h-[44px] px-[14px] bg-white text-[#095866] border border-[#C6D2D5] rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#F2F8F9] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap min-w-0 tablet:min-w-[150px]">
					<span v-if="geolocating" class="inline-block w-[14px] h-[14px] border-2 border-[#095866] border-t-transparent rounded-full animate-spin"></span>
					<span v-else class="inline-flex items-center gap-[6px]">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
							<circle cx="12" cy="12" r="3"/>
						</svg>
						Usa posizione
					</span>
				</button>
			</div>
		</div>

		<p v-if="searchError" class="text-red-500 text-[0.875rem] mt-[12px]">{{ searchError }}</p>

		<div v-if="searched && !loading" class="mt-[12px] flex flex-wrap items-center gap-[8px] text-[0.8125rem]">
			<span class="inline-flex items-center h-[28px] px-[10px] rounded-full bg-[#ECF6F7] text-[#095866] font-semibold">
				{{ pudoResults.length }} risultati trovati
			</span>
			<span class="inline-flex items-center h-[28px] px-[10px] rounded-full bg-[#F4FAFB] text-[#095866] border border-[#CBE0E4] font-semibold">
				Provider: BRT
			</span>
			<span v-if="searchMeta?.fallback" class="inline-flex items-center h-[28px] px-[10px] rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
				Fallback attivo
			</span>
			<span v-if="strategyListLabel" class="text-[#64748B]">Strategia: {{ strategyListLabel }}</span>
		</div>

		<div v-if="searched" class="mt-[12px] grid grid-cols-1 desktop:grid-cols-2 gap-[14px] items-stretch">
			<div class="order-2 desktop:order-1 h-[360px] tablet:h-[420px] desktop:h-[520px]">
				<div v-if="loading" class="flex items-center justify-center h-full">
					<span class="inline-block w-[28px] h-[28px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></span>
				</div>

				<div v-else class="h-full flex flex-col">
					<p v-if="pudoResults.length === 0 && !searchError" class="text-[0.875rem] text-[#737373] px-[10px] text-center flex-1 flex items-center justify-center">
						Nessun punto di ritiro trovato per questa zona. Prova con un'altra citta o CAP.
					</p>

					<div v-else class="grid grid-cols-1 gap-[10px] content-start flex-1 overflow-y-auto pr-[4px]">
						<div
							v-for="pudo in pudoResults"
							:key="pudo.ui_key"
							class="bg-white rounded-[12px] border-2 p-[14px] transition-[border-color,box-shadow] duration-200 cursor-pointer min-h-[168px]"
							:class="[
								expandedPudoKey === String(pudo.pudo_id || pudo.ui_key) ? 'h-auto' : 'h-[168px]',
								selectedPudoKey === pudo.ui_key ? 'border-[#095866] shadow-md' : 'border-[#D0D0D0] hover:border-[#095866]/50'
							]"
							@click="selectPudo(pudo)">
							<div class="flex items-start justify-between gap-[10px]">
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-[6px]">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
										<span class="text-[0.875rem] font-bold text-[#252B42] truncate">{{ pudo.name }}</span>
									</div>
									<div class="mt-[6px] flex flex-wrap items-center gap-[6px]">
										<span class="inline-flex items-center h-[22px] px-[9px] rounded-full border border-[#CBE0E4] bg-[#F4FAFB] text-[#095866] text-[0.6875rem] font-semibold uppercase tracking-[0.2px]">
											Punto BRT
										</span>
									</div>
									<p class="text-[0.8125rem] text-[#737373] mt-[3px]">{{ pudo.address }}, {{ pudo.zip_code }} {{ pudo.city }}</p>
								</div>

								<div class="flex flex-col items-end gap-[6px] shrink-0">
									<span class="inline-flex items-center h-[26px] px-[10px] rounded-full bg-[#E7F3F6] border border-[#C0DFE6] text-[#0B5F70] text-[0.8125rem] font-black tracking-[0.15px] leading-none">
										Distanza: {{ distanceLabel(pudo) }}
									</span>
									<span class="inline-flex items-center px-[8px] h-[24px] rounded-full border text-[0.6875rem] font-semibold" :class="getPudoStatus(pudo).className">
										{{ getPudoStatus(pudo).label }}
									</span>
									<div
										class="w-[22px] h-[22px] rounded-full border-[2px] flex items-center justify-center"
										:class="selectedPudoKey === pudo.ui_key ? 'border-[#095866] bg-[#095866]' : 'border-[#95A3B3] bg-transparent'">
										<div v-if="selectedPudoKey === pudo.ui_key" class="w-[10px] h-[10px] rounded-full bg-white"></div>
									</div>
								</div>
							</div>

							<div class="mt-[2px] grid gap-[2px] text-[0.75rem] text-[#64748B]">
								<p class="inline-flex items-center gap-[4px]">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
									{{ getTodayHoursText(pudo) }}
								</p>
							</div>

							<div v-if="expandedPudoKey === String(pudo.pudo_id || pudo.ui_key)" class="mt-[10px] pt-[10px] border-t border-[#E4E4E4] text-[0.8125rem]" @click.stop>
								<div v-if="loadingDetailsKey === String(pudo.pudo_id || pudo.ui_key)" class="flex items-center gap-[6px] text-[#737373]">
									<span class="inline-block w-[14px] h-[14px] border-2 border-[#095866] border-t-transparent rounded-full animate-spin"></span>
									Caricamento dettagli...
								</div>
								<template v-else-if="pudoDetails[String(pudo.pudo_id || pudo.ui_key)]">
									<p v-if="pudoDetails[String(pudo.pudo_id || pudo.ui_key)].opening_hours" class="text-[#252B42]">
										<span class="font-semibold">Orari completi:</span>
										{{ formatOpeningHours(pudoDetails[String(pudo.pudo_id || pudo.ui_key)].opening_hours) }}
									</p>
									<p v-if="pudoDetails[String(pudo.pudo_id || pudo.ui_key)].localization_hint" class="text-[#737373] mt-[4px]">
										{{ pudoDetails[String(pudo.pudo_id || pudo.ui_key)].localization_hint }}
									</p>
								</template>
								<p v-else-if="detailsErrors[String(pudo.pudo_id || pudo.ui_key)]" class="text-rose-600">
									{{ detailsErrors[String(pudo.pudo_id || pudo.ui_key)] }}
								</p>
							</div>

							<button
								type="button"
								@click.stop="toggleDetails(pudo)"
								class="mt-[6px] text-[0.75rem] text-[#095866] font-semibold hover:underline cursor-pointer">
								{{ expandedPudoKey === String(pudo.pudo_id || pudo.ui_key) ? 'Chiudi dettagli' : 'Dettagli e orari' }}
							</button>
						</div>
					</div>
				</div>
			</div>

			<div class="order-1 desktop:order-2 h-[360px] tablet:h-[420px] desktop:h-[520px] desktop:sticky desktop:top-[92px]">
				<div class="h-full bg-white rounded-[12px] border border-[#D0D0D0] p-[8px] flex flex-col">
					<div class="shrink-0 rounded-[10px] border border-[#D8E6EB] bg-[#F8FCFD] px-[10px] py-[8px]">
						<p class="text-[0.75rem] text-[#506070]">
							Doppio clic sulla mappa per impostare il punto di riferimento e aggiornare automaticamente via, citta e CAP.
						</p>
						<p v-if="mapClickLoading" class="text-[0.75rem] font-semibold text-[#095866] mt-[4px]">Aggiornamento in corso...</p>
						<p v-else-if="referenceUpdateMessage" class="text-[0.75rem] text-emerald-700 mt-[4px]">{{ referenceUpdateMessage }}</p>
					</div>

					<div class="mt-[8px] flex-1 min-h-0">
						<MapPudo
							:points="mapPoints"
							:selected-id="selectedPudoKey"
							:reference-point="mapReferencePoint"
							@select="selectPudo"
							@map-click="onMapReferenceClick" />
					</div>

					<p
						v-if="!loading && mapPoints.length === 0 && !searchError"
						class="mt-[8px] text-[0.8125rem] text-[#6B7280]">
						Nessun punto trovato: la mappa mostra il riferimento inserito oppure la vista Italia.
					</p>
				</div>
			</div>
		</div>
	</div>
</template>
