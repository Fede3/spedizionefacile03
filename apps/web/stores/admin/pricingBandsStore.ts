/**
 * pricingBandsStore — fasce nazionali (peso/volume) + extra rules + Europa.
 * State, CRUD bande, ladder, edit inline, computed Europa, anteprima prezzi.
 * Le actions di rete vivono nel wrapper composable useAdminPricing().
 */
import { defineStore } from 'pinia';
import { adminCentsToEuro, adminEuroToCents, adminIncrementCentsToEuro, adminNormalizeEuropePricing, ADMIN_DEFAULT_EUROPE_PRICING, ADMIN_DEFAULT_EXTRA_RULES, ADMIN_DEFAULT_WEIGHT_BANDS, ADMIN_DEFAULT_VOLUME_BANDS, calculateBandPriceCents, cloneForSnapshot, discountInfo, effectivePrice, normalizeLadderForPayload, } from '~/utils/adminPricingHelpers';
import type { BandType, EuropePricing, EuropeRate, ExtraRules, IncrementLadderRow, PriceBand, PriceBandsState } from '~/types/pricing';

const DEFAULT_INCREMENT_LADDER = [{ from_step: 1, to_step: null, increment_cents: 500 }];
type PricingBandsPayload = Partial<Pick<PriceBandsState, 'weight' | 'volume' | 'extra_rules' | 'europe' | 'version'>>;
const cloneBands = (bands: PriceBand[] | undefined): PriceBand[] => (Array.isArray(bands) ? bands.map((b) => ({ ...b })) : []);
const num = (v: unknown, fallback = 0): number => Number(v ?? fallback);
const numFixed = (v: number, digits = 4): number => Number(v.toFixed(digits));

export const useAdminPricingBandsStore = defineStore('admin-pricing-bands', () => {
    // STATE
    const weightBands = ref<PriceBand[]>([]);
    const volumeBands = ref<PriceBand[]>([]);
    const originalWeightBands = ref<PriceBand[]>([]);
    const originalVolumeBands = ref<PriceBand[]>([]);
    const bandsFromDb = ref(false);
    const extraRules = ref<ExtraRules>({ ...ADMIN_DEFAULT_EXTRA_RULES });
    const originalExtraRules = ref<ExtraRules | null>(null);
    const europePricing = ref<EuropePricing>({ ...ADMIN_DEFAULT_EUROPE_PRICING });
    const originalEuropePricing = ref<EuropePricing | null>(null);
    const pricingVersion = ref<string | number | null>(null);
    const editingCell = ref<string | null>(null);
    const editValue = ref('');
    // UI Europa
    const compactEuropeView = ref(false);
    const europeSearch = ref('');
    const europeStatusFilter = ref('all');
    const europeBandFilter = ref('all');
    const europeSort = ref('country_asc');

    // HELPERS
    const bandsFor = (type: BandType) => (type === 'weight' ? weightBands.value : volumeBands.value);
    const ladderRowsFor = (kind: BandType) => (kind === 'weight' ? extraRules.value.weight_increment_ladder : extraRules.value.volume_increment_ladder);
    const setLadderRows = (kind: BandType, rows: IncrementLadderRow[]) => {
        if (kind === 'weight') extraRules.value.weight_increment_ladder = rows;
        else extraRules.value.volume_increment_ladder = rows;
    };
    const bandAt = (type: BandType, idx: number): PriceBand | undefined => bandsFor(type)[idx];
    const normalizeLadders = () => {
        extraRules.value.weight_increment_ladder = normalizeLadderForPayload(extraRules.value.weight_increment_ladder, extraRules.value.increment_cents);
        extraRules.value.volume_increment_ladder = normalizeLadderForPayload(extraRules.value.volume_increment_ladder, extraRules.value.increment_cents);
    };

    // BANDA CRUD
    const addBand = (type: BandType) => {
        const bands = bandsFor(type);
        const last = bands[bands.length - 1];
        const min = last ? num(last.max_value) : 0;
        const max = numFixed(min + (type === 'weight' ? 50 : 0.2), 3);
        bands.push({
            id: `${type}-new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type, min_value: numFixed(min, 3), max_value: max,
            base_price: last ? num(last.base_price) : 0,
            discount_price: null, show_discount: true, sort_order: bands.length + 1,
        });
    };
    const removeBand = (type: BandType, idx: number, onError?: (m: string) => void) => {
        const bands = bandsFor(type);
        if (bands.length <= 1) return onError?.('Deve rimanere almeno una fascia.');
        bands.splice(idx, 1);
    };
    const moveBand = (type: BandType, idx: number, direction: number) => {
        const bands = bandsFor(type);
        const target = idx + direction;
        if (target < 0 || target >= bands.length) return;
        const a = bands[idx], b = bands[target];
        if (!a || !b) return;
        [bands[idx], bands[target]] = [b, a];
    };
    const toggleShowDiscount = (type: BandType, idx: number) => {
        const band = bandAt(type, idx);
        if (band) band.show_discount = !band.show_discount;
    };

    // EDIT INLINE
    const startEdit = (type: BandType, idx: number, field: 'base_price' | 'discount_price') => {
        const key = `${type}-${idx}-${field}`;
        editingCell.value = key;
        const band = bandAt(type, idx);
        if (!band) return;
        const cents = band[field];
        editValue.value = cents != null ? (Number(cents) / 100).toFixed(2).replace('.', ',') : '';
        nextTick(() => {
            const input = document.getElementById(`edit-${key}`) as HTMLInputElement | null;
            if (input) { input.focus(); input.select(); }
        });
    };
    const confirmEdit = (type: BandType, idx: number, field: 'base_price' | 'discount_price', onError?: (m: string) => void) => {
        const key = `${type}-${idx}-${field}`;
        if (editingCell.value !== key) return;
        const band = bandAt(type, idx);
        if (!band) return;
        const newCents = adminEuroToCents(editValue.value);
        if (newCents !== null && newCents < 0) {
            onError?.("Il prezzo non può essere negativo.");
            editingCell.value = null; editValue.value = '';
            return;
        }
        band[field] = newCents;
        editingCell.value = null; editValue.value = '';
    };
    const cancelEdit = () => { editingCell.value = null; editValue.value = ''; };

    // LADDER
    const updateLadderIncrementFromEuro = (row: IncrementLadderRow, rawValue: number | string) => {
        row.increment_cents = Math.max(0, adminEuroToCents(rawValue) ?? 0);
    };
    const addLadderRow = (kind: BandType) => {
        const rows = ladderRowsFor(kind);
        const payloadRows = normalizeLadderForPayload(rows, extraRules.value.increment_cents);
        const last = payloadRows[payloadRows.length - 1] ?? { from_step: 1, to_step: null, increment_cents: num(extraRules.value.increment_cents) };
        const fromStep = last.to_step == null ? (last.from_step + 1) : (last.to_step + 1);
        rows.push({ from_step: fromStep, to_step: null, increment_cents: num(last.increment_cents || extraRules.value.increment_cents) });
    };
    const removeLadderRow = (kind: BandType, idx: number, onError?: (m: string) => void) => {
        const rows = ladderRowsFor(kind);
        if (rows.length <= 1) return onError?.('Deve rimanere almeno uno scaglione incremento.');
        rows.splice(idx, 1);
    };
    const ensureLadderContinuity = (kind: BandType) => {
        const normalized = normalizeLadderForPayload(ladderRowsFor(kind), extraRules.value.increment_cents);
        const rebuilt = normalized.map((row, idx) => {
            const prev = normalized[idx - 1];
            return {
                from_step: idx === 0 || !prev ? 1 : (prev.to_step ?? prev.from_step) + 1,
                to_step: idx === normalized.length - 1 ? null : (row.to_step ?? row.from_step),
                increment_cents: row.increment_cents,
            };
        });
        setLadderRows(kind, rebuilt);
    };

    // EUROPA
    const updateEuropeRateAmountFromEuro = (rate: EuropeRate, rawValue: number | string) => {
        const cents = adminEuroToCents(rawValue);
        rate.price_cents = cents == null ? null : Math.max(0, cents);
    };
    const toggleEuropeRateQuote = (rate: EuropeRate) => {
        rate.quote_required = !rate.quote_required;
        if (rate.quote_required) rate.price_cents = null;
    };

    // COMPUTED EUROPA
    const europeBandFilters = computed(() => [
        { value: 'all', label: 'Tutte le fasce' },
        ...(europePricing.value?.bands || []).map((b) => ({ value: b.id, label: b.label })),
    ]);
    const filteredEuropeBands = computed(() => {
        const search = europeSearch.value.trim().toLowerCase();
        const status = europeStatusFilter.value;
        const sortMode = europeSort.value;
        const selectedBand = europeBandFilter.value;
        const sortRates = (rates: EuropeRate[]) => [...rates].sort((l, r) => {
            if (sortMode === 'price_asc') return (l.price_cents ?? Number.POSITIVE_INFINITY) - (r.price_cents ?? Number.POSITIVE_INFINITY);
            if (sortMode === 'price_desc') return (r.price_cents ?? -1) - (l.price_cents ?? -1);
            if (sortMode === 'status') return Number(l.quote_required) - Number(r.quote_required);
            return String(l.country_name || l.country_code).localeCompare(String(r.country_name || r.country_code), 'it');
        });
        return (europePricing.value?.bands || [])
            .filter((b) => selectedBand === 'all' || b.id === selectedBand)
            .map((band) => {
                const rates = sortRates((band.rates || []).filter((r) => {
                    const matchesSearch = !search || `${r.country_name} ${r.country_code}`.toLowerCase().includes(search);
                    const matchesStatus = status === 'all' || (status === 'quote_required' && r.quote_required) || (status === 'active' && !r.quote_required);
                    return matchesSearch && matchesStatus;
                }));
                return { ...band, rates, activeCount: rates.filter((r) => !r.quote_required).length, quoteCount: rates.filter((r) => r.quote_required).length };
            })
            .filter((b) => b.rates.length > 0);
    });

    // ANTEPRIMA PREZZI
    const calcLocalPrice = (type: BandType, rawValue: number) => calculateBandPriceCents(type, rawValue, {
        weight: weightBands.value, volume: volumeBands.value, extra_rules: extraRules.value,
    });
    const extraRuleExamples = computed(() => {
        const r = extraRules.value;
        const wStart = num(r.weight_start, 101), wStep = num(r.weight_step, 50), wRes = num(r.weight_resolution, 1);
        const vStart = num(r.volume_start, 0.401), vStep = num(r.volume_step, 0.2), vRes = num(r.volume_resolution, 0.001);
        return {
            firstWeightFrom: wStart, firstWeightTo: numFixed(wStart + wStep - wRes),
            secondWeightFrom: numFixed(wStart + wStep), secondWeightTo: numFixed(wStart + wStep * 2 - wRes),
            firstVolumeFrom: vStart, firstVolumeTo: numFixed(vStart + vStep - vRes),
            secondVolumeFrom: numFixed(vStart + vStep), secondVolumeTo: numFixed(vStart + vStep * 2 - vRes),
        };
    });
    const pricingPreviewCases = computed(() => {
        const r = extraRules.value;
        const wStart = num(r.weight_start, 101), wStep = num(r.weight_step, 50), wRes = num(r.weight_resolution, 1);
        const vStart = num(r.volume_start, 0.401), vStep = num(r.volume_step, 0.2), vRes = num(r.volume_resolution, 0.001);
        const rows = [
            { id: 'standard', label: 'Ultima fascia standard', weight: numFixed(wStart - wRes), volume: numFixed(vStart - vRes) },
            { id: 'extra1w', label: 'Primo extra (inizio)', weight: wStart, volume: vStart },
            { id: 'extra1max', label: 'Primo extra (limite)', weight: numFixed(wStart + wStep - wRes), volume: numFixed(vStart + vStep - vRes) },
            { id: 'extra2', label: 'Secondo extra', weight: numFixed(wStart + wStep), volume: numFixed(vStart + vStep) },
        ];
        return rows.map((row) => {
            const wp = calcLocalPrice('weight', row.weight);
            const vp = calcLocalPrice('volume', row.volume);
            const total = Math.max(wp ?? 0, vp ?? 0);
            return { ...row, weightPriceLabel: adminCentsToEuro(wp), volumePriceLabel: adminCentsToEuro(vp), totalLabel: adminCentsToEuro(total) };
        });
    });

    // HYDRATATION
    const applyDefaults = () => {
        weightBands.value = ADMIN_DEFAULT_WEIGHT_BANDS.map((b, i) => ({ ...b, id: `new-w-${i}` }));
        volumeBands.value = ADMIN_DEFAULT_VOLUME_BANDS.map((b, i) => ({ ...b, id: `new-v-${i}` }));
        extraRules.value = {
            ...ADMIN_DEFAULT_EXTRA_RULES, increment_mode: 'flat',
            weight_increment_ladder: [...DEFAULT_INCREMENT_LADDER],
            volume_increment_ladder: [...DEFAULT_INCREMENT_LADDER],
        };
        normalizeLadders();
        originalExtraRules.value = cloneForSnapshot(extraRules.value);
        europePricing.value = adminNormalizeEuropePricing(ADMIN_DEFAULT_EUROPE_PRICING);
        originalEuropePricing.value = cloneForSnapshot(europePricing.value);
        pricingVersion.value = null;
        bandsFromDb.value = false;
    };
    const hydrateFromApi = (data: PricingBandsPayload) => {
        const w = cloneBands(data.weight), v = cloneBands(data.volume);
        weightBands.value = cloneBands(w);
        volumeBands.value = cloneBands(v);
        originalWeightBands.value = cloneBands(w);
        originalVolumeBands.value = cloneBands(v);
        extraRules.value = { ...ADMIN_DEFAULT_EXTRA_RULES, ...(data.extra_rules || {}), increment_mode: 'flat' };
        normalizeLadders();
        originalExtraRules.value = cloneForSnapshot(extraRules.value);
        europePricing.value = adminNormalizeEuropePricing(data.europe || ADMIN_DEFAULT_EUROPE_PRICING);
        originalEuropePricing.value = cloneForSnapshot(europePricing.value);
        pricingVersion.value = data.version || null;
        bandsFromDb.value = true;
    };
    const persistApiResponse = (data: PricingBandsPayload, fallback: PricingBandsPayload) => {
        bandsFromDb.value = true;
        originalWeightBands.value = cloneBands(data.weight || fallback.weight);
        originalVolumeBands.value = cloneBands(data.volume || fallback.volume);
        originalExtraRules.value = cloneForSnapshot(data.extra_rules || fallback.extra_rules || extraRules.value);
        europePricing.value = adminNormalizeEuropePricing(data.europe || fallback.europe || ADMIN_DEFAULT_EUROPE_PRICING);
        originalEuropePricing.value = cloneForSnapshot(europePricing.value);
        pricingVersion.value = data.version || pricingVersion.value;
    };

    // PAYLOAD
    const mapBandPayload = (band: PriceBand, idx: number, prefix: 'w' | 'v') => ({
        id: band.id || `${prefix}-${idx + 1}`,
        min_value: num(band.min_value), max_value: num(band.max_value),
        base_price: num(band.base_price),
        discount_price: band.discount_price == null ? null : Number(band.discount_price),
        show_discount: band.show_discount !== false, sort_order: idx + 1,
    });
    const buildBandsPayload = () => {
        const inc = num(extraRules.value.increment_cents);
        const stepLadder = normalizeLadderForPayload([{ from_step: 1, to_step: null, increment_cents: inc }], inc);
        return {
            weight: weightBands.value.map((b, i) => mapBandPayload(b, i, 'w')),
            volume: volumeBands.value.map((b, i) => mapBandPayload(b, i, 'v')),
            extra_rules: {
                enabled: extraRules.value.enabled !== false,
                weight_start: num(extraRules.value.weight_start), weight_step: num(extraRules.value.weight_step),
                volume_start: num(extraRules.value.volume_start), volume_step: num(extraRules.value.volume_step),
                increment_cents: inc, increment_mode: 'flat' as const,
                weight_increment_ladder: stepLadder, volume_increment_ladder: stepLadder,
                base_price_cents_mode: extraRules.value.base_price_cents_mode === 'manual' ? 'manual' : 'last_band_effective',
                base_price_cents_manual: extraRules.value.base_price_cents_mode === 'manual' ? num(extraRules.value.base_price_cents_manual) : null,
                weight_resolution: num(extraRules.value.weight_resolution, 1),
                volume_resolution: num(extraRules.value.volume_resolution, 0.001),
            },
        };
    };
    const buildEuropePayload = () => {
        const normalized = adminNormalizeEuropePricing(europePricing.value);
        return {
            enabled: normalized.enabled !== false,
            origin_country_code: 'IT', max_packages: 1, max_quantity_per_package: 1,
            bands: normalized.bands.map((band) => ({
                id: band.id, label: band.label,
                max_weight_kg: num(band.max_weight_kg), max_volume_m3: num(band.max_volume_m3),
                volumetric_factor: num(band.volumetric_factor, 250),
                rates: band.rates.map((rate) => ({
                    country_code: String(rate.country_code || '').trim().toUpperCase(),
                    country_name: String(rate.country_name || '').trim(),
                    price_cents: rate.quote_required || rate.price_cents == null ? null : num(rate.price_cents),
                    quote_required: rate.quote_required === true,
                })),
            })),
        };
    };

    return {
        weightBands, volumeBands, originalWeightBands, originalVolumeBands, bandsFromDb,
        extraRules, originalExtraRules, europePricing, originalEuropePricing, pricingVersion,
        editingCell, editValue,
        compactEuropeView, europeSearch, europeStatusFilter, europeBandFilter, europeSort,
        europeBandFilters, filteredEuropeBands, extraRuleExamples, pricingPreviewCases,
        centsToEuro: adminCentsToEuro, euroToCents: adminEuroToCents,
        effectivePrice, discountInfo, incrementCentsToEuro: adminIncrementCentsToEuro,
        addBand, removeBand, moveBand, toggleShowDiscount,
        startEdit, confirmEdit, cancelEdit,
        addLadderRow, removeLadderRow, ensureLadderContinuity, ladderRowsFor, updateLadderIncrementFromEuro,
        updateEuropeRateAmountFromEuro, toggleEuropeRateQuote,
        applyDefaults, hydrateFromApi, persistApiResponse,
        buildBandsPayload, buildEuropePayload, calcLocalPrice,
    };
});
