/**
 * COMPOSABLE: usePriceBands (usePriceBands.js)
 * SCOPO: Carica le fasce di prezzo dall'API pubblica con fallback hardcoded.
 *
 * DOVE SI USA: components/Preventivo.vue (calcolo prezzo),
 *              components/ContenutoHeader.vue (prezzo minimo nel hero),
 *              pages/account/amministrazione/prezzi.vue (gestione admin)
 *
 * COSA RESTITUISCE:
 *   - priceBands: ref con tutte le fasce {weight: [...], volume: [...]}
 *   - promoSettings: ref con impostazioni promo {active, label_text, label_color, label_image, show_badges}
 *   - getWeightPrice(weightKg): prezzo in euro per il peso dato
 *   - getVolumePrice(volumeM3): prezzo in euro per il volume dato
 *   - getWeightBandInfo(weightKg): info dettagliate sulla fascia peso
 *   - getVolumeBandInfo(volumeM3): info dettagliate sulla fascia volume
 *   - getMinPrice(): info sul prezzo minimo disponibile
 *   - loading, loaded: stato del caricamento
 *   - loadPriceBands(): carica dal server (rispetta TTL di 5 min)
 *   - forceReload(): forza il ricaricamento ignorando il TTL
 * ESEMPIO D'USO: const { loadPriceBands, getWeightPrice, getVolumePrice } = usePriceBands()
 *
 * VINCOLI: i prezzi nel DB sono in CENTESIMI (890 = 8.90€). Il composable converte in euro.
 *          Se l'API non risponde, usa le fasce hardcoded (FALLBACK_WEIGHT_BANDS / FALLBACK_VOLUME_BANDS).
 * ERRORI TIPICI: chiamare getWeightPrice() prima di loadPriceBands() → ritorna null
 * COLLEGAMENTI: laravel-spedizionefacile-main/app/Http/Controllers/PublicPriceBandController.php,
 *               docs/guide/MODIFICARE-REGOLA-PREZZO.md
 *
 * TTL: I prezzi vengono ricaricati dal server ogni 5 minuti,
 * cosi' quando l'admin modifica le fasce i nuovi prezzi appaiono rapidamente.
 * Le richieste concorrenti vengono deduplicate (una sola chiamata HTTP).
 */

// Fasce hardcoded di fallback (stessi valori storici)
const FALLBACK_WEIGHT_BANDS = [
	{ min_value: 0, max_value: 2, base_price: 890 },
	{ min_value: 2, max_value: 5, base_price: 1190 },
	{ min_value: 5, max_value: 10, base_price: 1490 },
	{ min_value: 10, max_value: 25, base_price: 1990 },
	{ min_value: 25, max_value: 50, base_price: 2990 },
	{ min_value: 50, max_value: 75, base_price: 3990 },
	{ min_value: 75, max_value: 100, base_price: 4990 },
];

const FALLBACK_VOLUME_BANDS = [
	{ min_value: 0, max_value: 0.010, base_price: 890 },
	{ min_value: 0.010, max_value: 0.020, base_price: 1190 },
	{ min_value: 0.020, max_value: 0.040, base_price: 1490 },
	{ min_value: 0.040, max_value: 0.100, base_price: 1990 },
	{ min_value: 0.100, max_value: 0.200, base_price: 2990 },
	{ min_value: 0.200, max_value: 0.300, base_price: 3990 },
	{ min_value: 0.300, max_value: 0.400, base_price: 4990 },
];

// Stato condiviso tra componenti - INIZIALIZZATO CON FALLBACK
const priceBands = ref({ weight: FALLBACK_WEIGHT_BANDS, volume: FALLBACK_VOLUME_BANDS });
const promoSettings = ref({ active: false, label_text: '', label_color: '#E44203', label_image: null, show_badges: false, description: '' });
const loading = ref(false);
const loaded = ref(false);
let lastFetchTime = 0;
const TTL_MS = 5 * 60 * 1000; // 5 minuti
// Deduplica richieste concorrenti: se piu' componenti chiamano loadPriceBands()
// contemporaneamente, condividono la stessa Promise (una sola richiesta HTTP).
let pendingFetchPromise = null;

export const usePriceBands = () => {
	const sanctum = useSanctumClient();

	const fetchFromApi = async () => {
		loading.value = true;
		try {
			const res = await sanctum('/api/public/price-bands');
			const data = res?.data || res;
			// L'API ora restituisce { data: { weight, volume }, promo: {...} }
			const bands = data?.data || data;
			const promo = data?.promo || res?.promo;

			if (bands?.weight?.length && bands?.volume?.length) {
				priceBands.value = { weight: bands.weight, volume: bands.volume };
			} else if (data?.weight?.length && data?.volume?.length) {
				// Fallback per vecchio formato API
				priceBands.value = data;
			} else {
				priceBands.value = { weight: FALLBACK_WEIGHT_BANDS, volume: FALLBACK_VOLUME_BANDS };
			}

			if (promo) {
				promoSettings.value = promo;
			}

			loaded.value = true;
			lastFetchTime = Date.now();
		} catch (e) {
			console.warn('[usePriceBands] API non disponibile, uso fasce hardcoded:', e?.message || e);
			priceBands.value = { weight: FALLBACK_WEIGHT_BANDS, volume: FALLBACK_VOLUME_BANDS };
			loaded.value = true;
			lastFetchTime = Date.now();
		} finally {
			loading.value = false;
		}
	};

	// Carica dal server, ma solo se il TTL e' scaduto.
	// Se una richiesta e' gia' in corso, riusa la stessa Promise (deduplica).
	const loadPriceBands = async () => {
		const expired = Date.now() - lastFetchTime > TTL_MS;
		if (loaded.value && !expired) return;
		// Se c'e' gia' una richiesta in volo, aspetta quella invece di farne un'altra
		if (pendingFetchPromise) return pendingFetchPromise;
		pendingFetchPromise = fetchFromApi().finally(() => { pendingFetchPromise = null; });
		return pendingFetchPromise;
	};

	// Forza il ricaricamento ignorando il TTL (usato dall'admin dopo il salvataggio)
	const forceReload = async () => {
		lastFetchTime = 0;
		loaded.value = false;
		await fetchFromApi();
	};

	/**
	 * Helper: trova la fascia per un valore dato.
	 */
	const findBand = (bands, value) => {
		if (!bands?.length) return null;
		for (const band of bands) {
			if (value <= Number(band.max_value)) return band;
		}
		return bands[bands.length - 1];
	};

	/**
	 * Restituisce info dettagliate per una fascia.
	 * { effectivePrice, basePrice, discountPercent, showDiscount, hasDiscount }
	 */
	const getBandInfo = (band) => {
		if (!band) return null;
		const basePriceCents = Number(band.base_price);
		const discountPriceCents = band.discount_price != null ? Number(band.discount_price) : null;
		const effectivePriceCents = discountPriceCents ?? basePriceCents;
		const discountPercent = band.discount_percent != null
			? Number(band.discount_percent)
			: (discountPriceCents !== null && discountPriceCents < basePriceCents
				? Math.round((1 - discountPriceCents / basePriceCents) * 100)
				: null);
		const showDiscount = band.show_discount !== undefined ? band.show_discount : true;
		const hasDiscount = discountPercent !== null && discountPercent > 0;

		return {
			effectivePrice: effectivePriceCents / 100,
			basePrice: basePriceCents / 100,
			discountPercent,
			showDiscount,
			hasDiscount,
		};
	};

	/**
	 * Restituisce il prezzo in euro per un dato peso in kg.
	 */
	const getWeightPrice = (weightKg) => {
		const weight = Number(weightKg);
		if (!weight || weight <= 0) return null;

		const band = findBand(priceBands.value.weight, weight);
		if (!band) return null;

		const cents = band.discount_price ?? band.effective_price ?? band.base_price;
		return Number(cents) / 100;
	};

	/**
	 * Restituisce il prezzo in euro per un dato volume in m³.
	 */
	const getVolumePrice = (volumeM3) => {
		const vol = Number(volumeM3);
		if (!vol || vol <= 0) return null;

		const band = findBand(priceBands.value.volume, vol);
		if (!band) return null;

		const cents = band.discount_price ?? band.effective_price ?? band.base_price;
		return Number(cents) / 100;
	};

	/**
	 * Restituisce info dettagliate sulla fascia peso per un dato peso.
	 */
	const getWeightBandInfo = (weightKg) => {
		const weight = Number(weightKg);
		if (!weight || weight <= 0) return null;
		return getBandInfo(findBand(priceBands.value.weight, weight));
	};

	/**
	 * Restituisce info dettagliate sulla fascia volume per un dato volume.
	 */
	const getVolumeBandInfo = (volumeM3) => {
		const vol = Number(volumeM3);
		if (!vol || vol <= 0) return null;
		return getBandInfo(findBand(priceBands.value.volume, vol));
	};

	/**
	 * Restituisce info sul prezzo minimo disponibile (prima fascia peso).
	 * { effectivePrice, basePrice, discountPercent, showDiscount, hasDiscount }
	 */
	const getMinPrice = () => {
		const bands = priceBands.value.weight;
		if (!bands?.length) return { effectivePrice: 8.90, basePrice: 8.90, discountPercent: null, showDiscount: false, hasDiscount: false };
		return getBandInfo(bands[0]);
	};

	return {
		priceBands,
		promoSettings,
		loading,
		loaded,
		loadPriceBands,
		forceReload,
		getWeightPrice,
		getVolumePrice,
		getWeightBandInfo,
		getVolumeBandInfo,
		getMinPrice,
	};
};
