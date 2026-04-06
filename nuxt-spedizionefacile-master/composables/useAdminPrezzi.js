/**
 * COMPOSABLE: useAdminPrezzi (useAdminPrezzi.js) — FACADE
 * SCOPO: Punto di ingresso unico per il pannello admin prezzi.
 *        Delega tutta la logica a tre sotto-composable e ri-esporta l'interfaccia completa
 *        in modo che tutti i consumer esistenti funzionino senza modifiche.
 *
 * SOTTO-COMPOSABLE:
 *   - useAdminPrezziForm.js   — form state, editing inline, CRUD band/supplement/service/europe, utility
 *   - useAdminPrezziImport.js — fetch, save, seed, promo, payload builders, costanti, normalizzatori
 *   - useAdminPrezziList.js   — view state, filtri, computed entries/filtered/preview
 *
 * DOVE SI USA: pages/account/amministrazione/prezzi.vue e sotto-componenti admin prezzi via props.
 */

import { useAdminPrezziForm } from './useAdminPrezziForm';
import { useAdminPrezziImport } from './useAdminPrezziImport';
import { useAdminPrezziList } from './useAdminPrezziList';

export const useAdminPrezzi = () => {
	const { actionMessage, showSuccess, showError } = useAdmin();

	// ── Shared reactive state (owned here, passed to sub-composables) ──
	const weightBands = ref([]);
	const volumeBands = ref([]);
	const bandsFromDb = ref(false);
	const originalWeightBands = ref([]);
	const originalVolumeBands = ref([]);
	const extraRules = ref({});
	const supplementRules = ref([
		{ id: 'supplement-1', prefix: '90', amount_cents: 250, apply_to: 'both', enabled: true },
	]);
	const originalExtraRules = ref(null);
	const originalSupplementRules = ref([]);
	const pricingVersion = ref(null);
	const europePricing = ref({});
	const originalEuropePricing = ref(null);
	const servicePricing = ref({});
	const automaticSupplements = ref({});
	const operationalFees = ref({});
	const originalServicePricing = ref({});
	const originalAutomaticSupplements = ref({});
	const originalOperationalFees = ref({});

	// ── Form composable (editing, CRUD, utility) ────────
	const form = useAdminPrezziForm({
		weightBands,
		volumeBands,
		extraRules,
		supplementRules,
		showError,
	});

	// ── Import composable (fetch, save, seed, promo, payloads) ──
	const importC = useAdminPrezziImport({
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
		normalizeLadderForPayload: form.normalizeLadderForPayload,
		showSuccess,
		showError,
	});

	// ── List composable (view state, filters, computed) ──
	const list = useAdminPrezziList({
		servicePricing,
		automaticSupplements,
		operationalFees,
		europePricing,
		weightBands,
		volumeBands,
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
		buildPricingPayload: importC.buildPricingPayload,
		centsToEuro: form.centsToEuro,
		calculateBandPriceCentsLocal: form.calculateBandPriceCentsLocal,
	});

	// ── Return unified interface (backward compatible) ──
	return {
		// State
		isLoading: importC.isLoading,
		saving: importC.saving,
		seeding: importC.seeding,
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
		adminView: list.adminView,
		compactEuropeView: list.compactEuropeView,
		europeSearch: list.europeSearch,
		europeStatusFilter: list.europeStatusFilter,
		europeBandFilter: list.europeBandFilter,
		europeSort: list.europeSort,
		serviceSearch: list.serviceSearch,
		serviceFilter: list.serviceFilter,
		promoLoading: importC.promoLoading,
		promoSaving: importC.promoSaving,
		promoImageUploading: importC.promoImageUploading,
		promo: importC.promo,
		editingCell: form.editingCell,
		editValue: form.editValue,
		actionMessage,
		// Computed
		hasChanges: list.hasChanges,
		servicePricingEntries: list.servicePricingEntries,
		automaticSupplementEntries: list.automaticSupplementEntries,
		operationalFeeEntries: list.operationalFeeEntries,
		filteredServiceEntries: list.filteredServiceEntries,
		europeBandFilters: list.europeBandFilters,
		filteredEuropeBands: list.filteredEuropeBands,
		extraRuleExamples: list.extraRuleExamples,
		pricingPreviewCases: list.pricingPreviewCases,
		// Utility
		centsToEuro: form.centsToEuro,
		euroToCents: form.euroToCents,
		effectivePrice: form.effectivePrice,
		discountInfo: form.discountInfo,
		formatApplicationLabel: form.formatApplicationLabel,
		incrementCentsToEuro: form.incrementCentsToEuro,
		updateLadderIncrementFromEuro: form.updateLadderIncrementFromEuro,
		// Band actions
		startEdit: form.startEdit,
		confirmEdit: form.confirmEdit,
		cancelEdit: form.cancelEdit,
		toggleShowDiscount: form.toggleShowDiscount,
		addBand: form.addBand,
		removeBand: form.removeBand,
		moveBand: form.moveBand,
		// Supplement actions
		addSupplement: form.addSupplement,
		removeSupplement: form.removeSupplement,
		supplementAmountToEuro: form.supplementAmountToEuro,
		updateSupplementAmountFromEuro: form.updateSupplementAmountFromEuro,
		// Ladder actions
		addLadderRow: form.addLadderRow,
		removeLadderRow: form.removeLadderRow,
		ensureLadderContinuity: form.ensureLadderContinuity,
		ladderRowsFor: form.ladderRowsFor,
		// Service/keyed rule helpers
		keyedRuleAmountToEuro: form.keyedRuleAmountToEuro,
		updateKeyedRuleAmountFromEuro: form.updateKeyedRuleAmountFromEuro,
		keyedRuleMinFeeToEuro: form.keyedRuleMinFeeToEuro,
		updateKeyedRuleMinFeeFromEuro: form.updateKeyedRuleMinFeeFromEuro,
		updateArrayField: form.updateArrayField,
		addTierRow: form.addTierRow,
		removeTierRow: form.removeTierRow,
		// Europe helpers
		updateEuropeRateAmountFromEuro: form.updateEuropeRateAmountFromEuro,
		toggleEuropeRateQuote: form.toggleEuropeRateQuote,
		// Fetch/save
		fetchPriceBands: importC.fetchPriceBands,
		fetchPromoSettings: importC.fetchPromoSettings,
		seedBands: importC.seedBands,
		savePriceBands: importC.savePriceBands,
		savePromo: importC.savePromo,
		uploadPromoImage: importC.uploadPromoImage,
	};
};
