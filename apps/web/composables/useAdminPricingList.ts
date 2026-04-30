/**
 * Admin pricing list/preview section.
 *
 * Pure view state and computed entries for the pricing admin page. Business
 * calculations still come from the pricing helpers passed in by the caller.
 */
import { computed, ref, type Ref } from 'vue';
import type {
	EuropePricing,
	EuropeRate,
	ExtraRules,
	PriceBand,
	PricingRule,
	PricingRuleGroup,
	SupplementRule,
} from '~/types/pricing';

type PricingSection = 'service_pricing' | 'automatic_supplements' | 'operational_fees';
type PricingEntry = { key: string; rule: PricingRule; section: PricingSection };
type PricingPreviewType = 'weight' | 'volume';

type CreateListSectionArgs = {
	servicePricing: Ref<PricingRuleGroup>;
	automaticSupplements: Ref<PricingRuleGroup>;
	operationalFees: Ref<PricingRuleGroup>;
	europePricing: Ref<EuropePricing>;
	weightBands: Ref<PriceBand[]>;
	volumeBands: Ref<PriceBand[]>;
	extraRules: Ref<ExtraRules>;
	bandsFromDb: Ref<boolean>;
	originalWeightBands: Ref<PriceBand[]>;
	originalVolumeBands: Ref<PriceBand[]>;
	originalExtraRules: Ref<ExtraRules | null>;
	originalSupplementRules: Ref<SupplementRule[] | null>;
	supplementRules: Ref<SupplementRule[]>;
	originalEuropePricing: Ref<EuropePricing | null>;
	originalServicePricing: Ref<PricingRuleGroup | null>;
	originalAutomaticSupplements: Ref<PricingRuleGroup | null>;
	originalOperationalFees: Ref<PricingRuleGroup | null>;
	buildPricingPayload: () => unknown;
	centsToEuro: (cents: number) => string;
	calculateBandPriceCentsLocal: (type: PricingPreviewType, value: number) => number;
};

const toComparable = (obj: unknown) => JSON.stringify(obj);

const createPricingEntries = (rules: PricingRuleGroup, section: PricingSection): PricingEntry[] =>
	Object.entries(rules || {}).map(([key, rule]) => ({ key, rule, section }));

export const createListSection = ({
	servicePricing,
	automaticSupplements,
	operationalFees,
	europePricing,
	extraRules,
	bandsFromDb,
	originalWeightBands,
	originalVolumeBands,
	originalExtraRules,
	originalSupplementRules,
	supplementRules,
	originalEuropePricing,
	originalServicePricing,
	originalAutomaticSupplements,
	originalOperationalFees,
	buildPricingPayload,
	centsToEuro,
	calculateBandPriceCentsLocal,
}: CreateListSectionArgs) => {
	const adminView = ref('nazionale');
	const compactEuropeView = ref(false);
	const europeSearch = ref('');
	const europeStatusFilter = ref('all');
	const europeBandFilter = ref('all');
	const europeSort = ref('country_asc');
	const serviceSearch = ref('');
	const serviceFilter = ref('all');

	const hasChanges = computed(() => {
		const current = toComparable(buildPricingPayload());
		const original = toComparable({
			weight: originalWeightBands.value,
			volume: originalVolumeBands.value,
			extra_rules: originalExtraRules.value || extraRules.value,
			supplements: originalSupplementRules.value || supplementRules.value,
			europe: originalEuropePricing.value || europePricing.value,
			service_pricing: originalServicePricing.value || servicePricing.value,
			automatic_supplements: originalAutomaticSupplements.value || automaticSupplements.value,
			operational_fees: originalOperationalFees.value || operationalFees.value,
		});
		return !bandsFromDb.value || current !== original;
	});

	const servicePricingEntries = computed(() => createPricingEntries(servicePricing.value, 'service_pricing'));
	const automaticSupplementEntries = computed(() =>
		createPricingEntries(automaticSupplements.value, 'automatic_supplements'),
	);
	const operationalFeeEntries = computed(() => createPricingEntries(operationalFees.value, 'operational_fees'));

	const filteredServiceEntries = computed(() => {
		const search = serviceSearch.value.trim().toLowerCase();
		const activeFilter = serviceFilter.value;
		const entries = [
			...(activeFilter === 'all' || activeFilter === 'service_pricing' ? servicePricingEntries.value : []),
			...(activeFilter === 'all' || activeFilter === 'automatic_supplements' ? automaticSupplementEntries.value : []),
			...(activeFilter === 'all' || activeFilter === 'operational_fees' ? operationalFeeEntries.value : []),
		];
		return entries.filter(({ rule }) => {
			if (!search) return true;
			return `${rule.label} ${rule.description || ''} ${rule.note || ''}`.toLowerCase().includes(search);
		});
	});

	const europeBandFilters = computed(() => [
		{ value: 'all', label: 'Tutte le fasce' },
		...(europePricing.value?.bands || []).map((band) => ({ value: band.id, label: band.label })),
	]);

	const sortEuropeRates = (rates: EuropeRate[]) =>
		[...rates].sort((left, right) => {
			if (europeSort.value === 'price_asc') {
				return (left.price_cents ?? Number.POSITIVE_INFINITY) - (right.price_cents ?? Number.POSITIVE_INFINITY);
			}
			if (europeSort.value === 'price_desc') return (right.price_cents ?? -1) - (left.price_cents ?? -1);
			if (europeSort.value === 'status') return Number(left.quote_required) - Number(right.quote_required);
			return String(left.country_name || left.country_code).localeCompare(String(right.country_name || right.country_code), 'it');
		});

	const filteredEuropeBands = computed(() => {
		const search = europeSearch.value.trim().toLowerCase();
		const status = europeStatusFilter.value;
		const selectedBand = europeBandFilter.value;

		return (europePricing.value?.bands || [])
			.filter((band) => selectedBand === 'all' || band.id === selectedBand)
			.map((band) => {
				const rates = sortEuropeRates(
					(band.rates || []).filter((rate) => {
						const matchesSearch = !search || `${rate.country_name} ${rate.country_code}`.toLowerCase().includes(search);
						const matchesStatus =
							status === 'all' ||
							(status === 'quote_required' && rate.quote_required) ||
							(status === 'active' && !rate.quote_required);
						return matchesSearch && matchesStatus;
					}),
				);
				return {
					...band,
					rates,
					activeCount: rates.filter((rate) => !rate.quote_required).length,
					quoteCount: rates.filter((rate) => rate.quote_required).length,
				};
			})
			.filter((band) => band.rates.length > 0);
	});

	const extraRuleExamples = computed(() => {
		const firstWeightFrom = Number(extraRules.value.weight_start || 101);
		const firstWeightTo = Number(
			(firstWeightFrom + Number(extraRules.value.weight_step || 50) - Number(extraRules.value.weight_resolution || 1)).toFixed(4),
		);
		const secondWeightFrom = Number((firstWeightFrom + Number(extraRules.value.weight_step || 50)).toFixed(4));
		const secondWeightTo = Number(
			(secondWeightFrom + Number(extraRules.value.weight_step || 50) - Number(extraRules.value.weight_resolution || 1)).toFixed(4),
		);
		const firstVolumeFrom = Number(extraRules.value.volume_start || 0.401);
		const firstVolumeTo = Number(
			(firstVolumeFrom + Number(extraRules.value.volume_step || 0.2) - Number(extraRules.value.volume_resolution || 0.001)).toFixed(4),
		);
		const secondVolumeFrom = Number((firstVolumeFrom + Number(extraRules.value.volume_step || 0.2)).toFixed(4));
		const secondVolumeTo = Number(
			(secondVolumeFrom + Number(extraRules.value.volume_step || 0.2) - Number(extraRules.value.volume_resolution || 0.001)).toFixed(4),
		);
		return { firstWeightFrom, firstWeightTo, secondWeightFrom, secondWeightTo, firstVolumeFrom, firstVolumeTo, secondVolumeFrom, secondVolumeTo };
	});

	const pricingPreviewCases = computed(() => {
		const weightStart = Number(extraRules.value.weight_start || 101);
		const weightStep = Number(extraRules.value.weight_step || 50);
		const weightResolution = Number(extraRules.value.weight_resolution || 1);
		const volumeStart = Number(extraRules.value.volume_start || 0.401);
		const volumeStep = Number(extraRules.value.volume_step || 0.2);
		const volumeResolution = Number(extraRules.value.volume_resolution || 0.001);

		const rows = [
			{ id: 'standard', label: 'Ultima fascia standard', weight: Number((weightStart - weightResolution).toFixed(4)), volume: Number((volumeStart - volumeResolution).toFixed(4)) },
			{ id: 'extra1w', label: 'Primo extra (inizio)', weight: weightStart, volume: volumeStart },
			{ id: 'extra1max', label: 'Primo extra (limite)', weight: Number((weightStart + weightStep - weightResolution).toFixed(4)), volume: Number((volumeStart + volumeStep - volumeResolution).toFixed(4)) },
			{ id: 'extra2', label: 'Secondo extra', weight: Number((weightStart + weightStep).toFixed(4)), volume: Number((volumeStart + volumeStep).toFixed(4)) },
		];

		return rows.map((row) => {
			const weightPriceCents = calculateBandPriceCentsLocal('weight', row.weight);
			const volumePriceCents = calculateBandPriceCentsLocal('volume', row.volume);
			const totalCents = Math.max(weightPriceCents, volumePriceCents);
			return {
				...row,
				weightPriceLabel: centsToEuro(weightPriceCents),
				volumePriceLabel: centsToEuro(volumePriceCents),
				totalLabel: centsToEuro(totalCents),
			};
		});
	});

	return {
		adminView,
		compactEuropeView,
		europeSearch,
		europeStatusFilter,
		europeBandFilter,
		europeSort,
		serviceSearch,
		serviceFilter,
		hasChanges,
		servicePricingEntries,
		automaticSupplementEntries,
		operationalFeeEntries,
		filteredServiceEntries,
		europeBandFilters,
		filteredEuropeBands,
		extraRuleExamples,
		pricingPreviewCases,
	};
};
