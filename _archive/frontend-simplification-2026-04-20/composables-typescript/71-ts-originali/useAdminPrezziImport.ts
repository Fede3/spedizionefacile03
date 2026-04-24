import type { Ref } from 'vue';
import type {
	EuropePricing,
	ExtraRules,
	LadderRow,
	PriceBand,
	PricingRuleGroup,
	PromoSettings,
	SupplementRule,
} from '~/types';
import {
	DEFAULT_VOLUME_BANDS,
	DEFAULT_WEIGHT_BANDS,
} from './useAdminPrezziDefaults';
import {
	DEFAULT_AUTOMATIC_SUPPLEMENTS,
	DEFAULT_EUROPE_PRICING,
	DEFAULT_EXTRA_RULES,
	DEFAULT_OPERATIONAL_FEES,
	DEFAULT_SERVICE_PRICING,
	DEFAULT_SUPPLEMENTS,
} from './usePriceBandsDefaults';
import {
	buildPricingRulesPayload,
	normalizeEuropePricingForAdmin,
	normalizePricingGroupForAdmin,
} from './useAdminPrezziNormalize';

interface UseAdminPrezziImportOptions {
	weightBands: Ref<PriceBand[]>;
	volumeBands: Ref<PriceBand[]>;
	bandsFromDb: Ref<boolean>;
	extraRules: Ref<ExtraRules>;
	supplementRules: Ref<SupplementRule[]>;
	pricingVersion: Ref<string | null>;
	europePricing: Ref<EuropePricing>;
	servicePricing: Ref<PricingRuleGroup>;
	automaticSupplements: Ref<PricingRuleGroup>;
	operationalFees: Ref<PricingRuleGroup>;
	originalWeightBands: Ref<PriceBand[]>;
	originalVolumeBands: Ref<PriceBand[]>;
	originalExtraRules: Ref<ExtraRules>;
	originalSupplementRules: Ref<SupplementRule[]>;
	originalEuropePricing: Ref<EuropePricing>;
	originalServicePricing: Ref<PricingRuleGroup>;
	originalAutomaticSupplements: Ref<PricingRuleGroup>;
	originalOperationalFees: Ref<PricingRuleGroup>;
	normalizeLadderForPayload: (rows: Partial<LadderRow>[] | null | undefined, fallbackIncrement: number | string | null | undefined) => LadderRow[];
	showSuccess: (text: string) => void;
	showError: (e: unknown, fallback: string) => void;
}

interface PromoApiPayload {
	promo_active?: string | boolean;
	promo_label_text?: string;
	promo_label_color?: string;
	promo_label_image?: string | null;
	promo_show_badges?: string | boolean;
	promo_description?: string;
	[key: string]: unknown;
}

interface PricingApiPayload {
	weight?: PriceBand[];
	volume?: PriceBand[];
	extra_rules?: Partial<ExtraRules>;
	supplements?: SupplementRule[];
	europe?: Partial<EuropePricing>;
	service_pricing?: PricingRuleGroup;
	automatic_supplements?: PricingRuleGroup;
	operational_fees?: PricingRuleGroup;
	version?: string | null;
	[key: string]: unknown;
}

export const useAdminPrezziImport = ({
	weightBands,
	volumeBands,
	bandsFromDb,
	extraRules,
	supplementRules,
	pricingVersion,
	europePricing,
	servicePricing,
	automaticSupplements,
	operationalFees,
	originalWeightBands,
	originalVolumeBands,
	originalExtraRules,
	originalSupplementRules,
	originalEuropePricing,
	originalServicePricing,
	originalAutomaticSupplements,
	originalOperationalFees,
	normalizeLadderForPayload,
	showSuccess,
	showError,
}: UseAdminPrezziImportOptions) => {
	const sanctum = useSanctumClient();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { forceReload: reloadPublicPriceBands } = usePriceBands() as any;

	// ── Loading state ────────────────────────────────────
	const isLoading = ref<boolean>(true);
	const saving = ref<boolean>(false);
	const seeding = ref<boolean>(false);

	// ── Promo state ──────────────────────────────────────
	const promoLoading = ref<boolean>(false);
	const promoSaving = ref<boolean>(false);
	const promoImageUploading = ref<boolean>(false);
	const promo = ref<PromoSettings>({
		active: false,
		label_text: '',
		label_color: '#E44203',
		label_image: null,
		show_badges: true,
		description: '',
	});

	// ── Payload builders ─────────────────────────────────
	const buildEuropePricingPayload = () => {
		const normalized = normalizeEuropePricingForAdmin(europePricing.value);
		return {
			enabled: normalized.enabled !== false,
			origin_country_code: 'IT',
			max_packages: 1,
			max_quantity_per_package: 1,
			bands: normalized.bands.map((band) => ({
				id: band.id,
				label: band.label,
				max_weight_kg: Number(band.max_weight_kg || 0),
				max_volume_m3: Number(band.max_volume_m3 || 0),
				volumetric_factor: Number(band.volumetric_factor || 250),
				rates: band.rates.map((rate) => ({
					country_code: String(rate.country_code || '').trim().toUpperCase(),
					country_name: String(rate.country_name || '').trim(),
					price_cents: rate.quote_required || rate.price_cents === null || (rate.price_cents as unknown) === '' || rate.price_cents === undefined
						? null
						: Number(rate.price_cents || 0),
					quote_required: rate.quote_required === true,
				})),
			})),
		};
	};

	const buildPricingPayload = () => ({
		weight: weightBands.value.map((band, idx) => ({
			id: band.id || `w-${idx + 1}`,
			min_value: Number(band.min_value),
			max_value: Number(band.max_value),
			base_price: Number(band.base_price || 0),
			discount_price: band.discount_price === null || (band.discount_price as unknown) === '' ? null : Number(band.discount_price),
			show_discount: band.show_discount !== false,
			sort_order: idx + 1,
		})),
		volume: volumeBands.value.map((band, idx) => ({
			id: band.id || `v-${idx + 1}`,
			min_value: Number(band.min_value),
			max_value: Number(band.max_value),
			base_price: Number(band.base_price || 0),
			discount_price: band.discount_price === null || (band.discount_price as unknown) === '' ? null : Number(band.discount_price),
			show_discount: band.show_discount !== false,
			sort_order: idx + 1,
		})),
		extra_rules: {
			enabled: extraRules.value.enabled !== false,
			weight_start: Number(extraRules.value.weight_start),
			weight_step: Number(extraRules.value.weight_step),
			volume_start: Number(extraRules.value.volume_start),
			volume_step: Number(extraRules.value.volume_step),
			increment_cents: Number(extraRules.value.increment_cents || 0),
			increment_mode: 'flat',
			weight_increment_ladder: normalizeLadderForPayload([{ from_step: 1, to_step: null, increment_cents: Number(extraRules.value.increment_cents || 0) }], Number(extraRules.value.increment_cents || 0)),
			volume_increment_ladder: normalizeLadderForPayload([{ from_step: 1, to_step: null, increment_cents: Number(extraRules.value.increment_cents || 0) }], Number(extraRules.value.increment_cents || 0)),
			base_price_cents_mode: extraRules.value.base_price_cents_mode === 'manual' ? 'manual' : 'last_band_effective',
			base_price_cents_manual: extraRules.value.base_price_cents_mode === 'manual'
				? Number(extraRules.value.base_price_cents_manual || 0)
				: null,
			weight_resolution: Number(extraRules.value.weight_resolution || 1),
			volume_resolution: Number(extraRules.value.volume_resolution || 0.001),
		},
		supplements: supplementRules.value
			.map((rule, idx) => ({
				id: rule.id || `supplement-${idx + 1}`,
				prefix: String(rule.prefix || '').replace(/\D+/g, ''),
				amount_cents: Number(rule.amount_cents || 0),
				apply_to: ['origin', 'destination', 'both'].includes(rule.apply_to) ? rule.apply_to : 'both',
				enabled: rule.enabled !== false,
			}))
			.filter((rule) => rule.prefix.length > 0),
		europe: buildEuropePricingPayload(),
		service_pricing: buildPricingRulesPayload(servicePricing.value),
		automatic_supplements: buildPricingRulesPayload(automaticSupplements.value),
		operational_fees: buildPricingRulesPayload(operationalFees.value),
	});

	// ── Defaults ─────────────────────────────────────────
	const applyDefaults = (): void => {
		weightBands.value = DEFAULT_WEIGHT_BANDS.map((b, i) => ({ ...b, id: `new-w-${i}` }));
		volumeBands.value = DEFAULT_VOLUME_BANDS.map((b, i) => ({ ...b, id: `new-v-${i}` }));
		extraRules.value = { ...DEFAULT_EXTRA_RULES };
		extraRules.value.increment_mode = 'flat';
		extraRules.value.weight_increment_ladder = normalizeLadderForPayload(extraRules.value.weight_increment_ladder, extraRules.value.increment_cents);
		extraRules.value.volume_increment_ladder = normalizeLadderForPayload(extraRules.value.volume_increment_ladder, extraRules.value.increment_cents);
		supplementRules.value = DEFAULT_SUPPLEMENTS.map(rule => ({ ...rule }));
		originalExtraRules.value = JSON.parse(JSON.stringify(extraRules.value));
		originalSupplementRules.value = JSON.parse(JSON.stringify(supplementRules.value));
		europePricing.value = normalizeEuropePricingForAdmin(DEFAULT_EUROPE_PRICING);
		originalEuropePricing.value = JSON.parse(JSON.stringify(europePricing.value));
		servicePricing.value = normalizePricingGroupForAdmin({}, DEFAULT_SERVICE_PRICING);
		automaticSupplements.value = normalizePricingGroupForAdmin({}, DEFAULT_AUTOMATIC_SUPPLEMENTS);
		operationalFees.value = normalizePricingGroupForAdmin({}, DEFAULT_OPERATIONAL_FEES);
		originalServicePricing.value = JSON.parse(JSON.stringify(servicePricing.value));
		originalAutomaticSupplements.value = JSON.parse(JSON.stringify(automaticSupplements.value));
		originalOperationalFees.value = JSON.parse(JSON.stringify(operationalFees.value));
		pricingVersion.value = null;
		bandsFromDb.value = false;
	};

	// ── Fetch ────────────────────────────────────────────
	const fetchPriceBands = async (): Promise<void> => {
		isLoading.value = true;
		try {
			const res = await sanctum("/api/admin/price-bands") as { data?: PricingApiPayload } | PricingApiPayload | null;
			const payload = (res && typeof res === 'object' && 'data' in res ? (res as { data?: PricingApiPayload }).data : res) || {};
			const data = ((payload as { data?: PricingApiPayload }).data || payload) as PricingApiPayload;
			const w = data.weight || [];
			const v = data.volume || [];
			if (w.length > 0 || v.length > 0) {
				weightBands.value = w.map(b => ({ ...b }));
				volumeBands.value = v.map(b => ({ ...b }));
				originalWeightBands.value = w.map(b => ({ ...b }));
				originalVolumeBands.value = v.map(b => ({ ...b }));
				extraRules.value = { ...DEFAULT_EXTRA_RULES, ...(data.extra_rules || {}) } as ExtraRules;
				extraRules.value.increment_mode = 'flat';
				extraRules.value.weight_increment_ladder = normalizeLadderForPayload(extraRules.value.weight_increment_ladder, extraRules.value.increment_cents);
				extraRules.value.volume_increment_ladder = normalizeLadderForPayload(extraRules.value.volume_increment_ladder, extraRules.value.increment_cents);
				const supplementsFromApi = Array.isArray(data.supplements) ? data.supplements : DEFAULT_SUPPLEMENTS;
				supplementRules.value = supplementsFromApi.map((rule, idx) => ({ ...rule, id: rule.id || `supplement-${idx + 1}` }));
				originalExtraRules.value = JSON.parse(JSON.stringify(extraRules.value));
				originalSupplementRules.value = JSON.parse(JSON.stringify(supplementRules.value));
				europePricing.value = normalizeEuropePricingForAdmin(data.europe || DEFAULT_EUROPE_PRICING);
				originalEuropePricing.value = JSON.parse(JSON.stringify(europePricing.value));
				servicePricing.value = normalizePricingGroupForAdmin(data.service_pricing || {}, DEFAULT_SERVICE_PRICING);
				automaticSupplements.value = normalizePricingGroupForAdmin(data.automatic_supplements || {}, DEFAULT_AUTOMATIC_SUPPLEMENTS);
				operationalFees.value = normalizePricingGroupForAdmin(data.operational_fees || {}, DEFAULT_OPERATIONAL_FEES);
				originalServicePricing.value = JSON.parse(JSON.stringify(servicePricing.value));
				originalAutomaticSupplements.value = JSON.parse(JSON.stringify(automaticSupplements.value));
				originalOperationalFees.value = JSON.parse(JSON.stringify(operationalFees.value));
				pricingVersion.value = data.version || null;
				bandsFromDb.value = true;
			} else {
				applyDefaults();
			}
		} catch {
			applyDefaults();
		} finally {
			isLoading.value = false;
		}
	};

	const fetchPromoSettings = async (): Promise<void> => {
		promoLoading.value = true;
		try {
			const res = await sanctum("/api/admin/promo-settings") as { data?: PromoApiPayload } | PromoApiPayload | null;
			const data = ((res && typeof res === 'object' && 'data' in res ? (res as { data?: PromoApiPayload }).data : res) || {}) as PromoApiPayload;
			promo.value = {
				active: data.promo_active === 'true' || data.promo_active === true,
				label_text: data.promo_label_text || '',
				label_color: data.promo_label_color || '#E44203',
				label_image: data.promo_label_image || null,
				show_badges: data.promo_show_badges === 'true' || data.promo_show_badges === true,
				description: data.promo_description || '',
			};
		} catch {
			// Default values already set
		} finally {
			promoLoading.value = false;
		}
	};

	// ── Save ─────────────────────────────────────────────
	const seedBands = async (): Promise<void> => {
		seeding.value = true;
		try {
			await sanctum("/api/admin/price-bands/seed", { method: "POST" });
			showSuccess("Fasce di prezzo inizializzate nel database.");
			await fetchPriceBands();
			await reloadPublicPriceBands();
		} catch (e) {
			showError(e, "Errore durante l'inizializzazione delle fasce.");
		} finally {
			seeding.value = false;
		}
	};

	const savePriceBands = async (): Promise<void> => {
		saving.value = true;
		try {
			const payload = buildPricingPayload();
			const response = await sanctum("/api/admin/price-bands", { method: "PUT", body: payload }) as { data?: PricingApiPayload } | null;
			const data = (response?.data || {}) as PricingApiPayload;
			showSuccess("Configurazione prezzi nazionale ed Europa salvata con successo.");
			bandsFromDb.value = true;
			originalWeightBands.value = (data.weight || payload.weight).map((b: PriceBand) => ({ ...b }));
			originalVolumeBands.value = (data.volume || payload.volume).map((b: PriceBand) => ({ ...b }));
			originalExtraRules.value = JSON.parse(JSON.stringify(data.extra_rules || payload.extra_rules));
			originalSupplementRules.value = JSON.parse(JSON.stringify(data.supplements || payload.supplements));
			europePricing.value = normalizeEuropePricingForAdmin(data.europe || payload.europe || DEFAULT_EUROPE_PRICING);
			originalEuropePricing.value = JSON.parse(JSON.stringify(europePricing.value));
			servicePricing.value = normalizePricingGroupForAdmin(data.service_pricing || payload.service_pricing || {}, DEFAULT_SERVICE_PRICING);
			automaticSupplements.value = normalizePricingGroupForAdmin(data.automatic_supplements || payload.automatic_supplements || {}, DEFAULT_AUTOMATIC_SUPPLEMENTS);
			operationalFees.value = normalizePricingGroupForAdmin(data.operational_fees || payload.operational_fees || {}, DEFAULT_OPERATIONAL_FEES);
			originalServicePricing.value = JSON.parse(JSON.stringify(servicePricing.value));
			originalAutomaticSupplements.value = JSON.parse(JSON.stringify(automaticSupplements.value));
			originalOperationalFees.value = JSON.parse(JSON.stringify(operationalFees.value));
			pricingVersion.value = data.version || pricingVersion.value;
			await reloadPublicPriceBands();
		} catch (e) {
			showError(e, "Errore durante il salvataggio della configurazione prezzi.");
		} finally {
			saving.value = false;
		}
	};

	const savePromo = async (): Promise<void> => {
		promoSaving.value = true;
		try {
			await sanctum("/api/admin/promo-settings", {
				method: "POST",
				body: {
					promo_active: promo.value.active ? 'true' : 'false',
					promo_label_text: promo.value.label_text,
					promo_label_color: promo.value.label_color,
					promo_show_badges: promo.value.show_badges ? 'true' : 'false',
					promo_description: promo.value.description,
				},
			});
			showSuccess("Impostazioni promozione salvate con successo.");
			await reloadPublicPriceBands();
		} catch (e) {
			showError(e, "Errore durante il salvataggio della promozione.");
		} finally {
			promoSaving.value = false;
		}
	};

	const uploadPromoImage = async (event: Event): Promise<void> => {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
		if (!validTypes.includes(file.type)) {
			showError(null, "Formato file non valido. Usa JPG, PNG, GIF o WebP.");
			target.value = '';
			return;
		}
		const maxSize = 2 * 1024 * 1024;
		if (file.size > maxSize) {
			showError(null, "File troppo grande. Dimensione massima: 2MB.");
			target.value = '';
			return;
		}
		promoImageUploading.value = true;
		try {
			const formData = new FormData();
			formData.append('image', file);
			const res = await sanctum("/api/admin/promo-settings/upload-image", { method: "POST", body: formData }) as { image_url?: string | null } | null;
			promo.value.label_image = res?.image_url || null;
			showSuccess("Immagine promo caricata.");
		} catch (e) {
			showError(e, "Errore durante l'upload dell'immagine.");
		} finally {
			promoImageUploading.value = false;
			target.value = '';
		}
	};

	return {
		// Loading state
		isLoading,
		saving,
		seeding,
		// Promo state
		promoLoading,
		promoSaving,
		promoImageUploading,
		promo,
		// Payload builder (needed by List composable for hasChanges)
		buildPricingPayload,
		// Fetch/save
		fetchPriceBands,
		fetchPromoSettings,
		seedBands,
		savePriceBands,
		savePromo,
		uploadPromoImage,
	};
};
