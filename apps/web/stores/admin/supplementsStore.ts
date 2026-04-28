/**
 * supplementsStore — supplementi CAP + supplementi automatici + fee operative.
 *
 * Estratto dalla sezione "supplementi" di composables/useAdminPrezzi.js
 * (split atomico Pinia 2026-04-26). Comprende:
 *   - state delle 3 categorie (cap-based, automatici, operativi) + snapshot originali
 *   - CRUD dei supplementi CAP base
 *   - helper per aggiornare amount/min-fee/array-field/tier-row di regole keyed
 */
import { defineStore } from 'pinia'
import {
	adminEuroToCents,
	ADMIN_DEFAULT_AUTOMATIC_SUPPLEMENTS,
	ADMIN_DEFAULT_OPERATIONAL_FEES,
	ADMIN_DEFAULT_SUPPLEMENTS,
	buildPricingRulesPayload,
	cloneForSnapshot,
	normalizeArrayFieldInput,
	normalizePricingGroup,
	type SupplementRule,
} from '~/utils/adminPrezziHelpers'

type KeyedRule = Record<string, unknown>
type KeyedGroup = Record<string, KeyedRule>

export const useAdminSupplementsStore = defineStore('admin-supplements', () => {
	// ---------- STATE ----------
	const supplementRules = ref<SupplementRule[]>(
		ADMIN_DEFAULT_SUPPLEMENTS[0] ? [{ ...ADMIN_DEFAULT_SUPPLEMENTS[0] }] : [],
	)
	const originalSupplementRules = ref<SupplementRule[]>([])

	const automaticSupplements = ref<KeyedGroup>({})
	const originalAutomaticSupplements = ref<KeyedGroup>({})

	const operationalFees = ref<KeyedGroup>({})
	const originalOperationalFees = ref<KeyedGroup>({})

	// ---------- SUPPLEMENTI CAP: CRUD ----------
	const addSupplement = (): void => {
		supplementRules.value.push({
			id: `supplement-${Date.now()}`,
			prefix: '',
			amount_cents: 0,
			apply_to: 'both',
			enabled: true,
		})
	}

	const removeSupplement = (idx: number): void => {
		supplementRules.value.splice(idx, 1)
	}

	const supplementAmountToEuro = (rule: SupplementRule): string => {
		const cents = Number(rule?.amount_cents || 0)
		return (cents / 100).toFixed(2).replace('.', ',')
	}

	const updateSupplementAmountFromEuro = (rule: SupplementRule, rawValue: string): void => {
		const cleaned = String(rawValue || '').replace(/[€\s]/g, '').replace(',', '.')
		const value = Number.parseFloat(cleaned)
		if (!Number.isFinite(value) || value < 0) {
			rule.amount_cents = 0
			return
		}
		rule.amount_cents = Math.round(value * 100)
	}

	// ---------- KEYED RULES: helpers (servizi/automatici/operative) ----------
	const keyedRuleAmountToEuro = (rule: KeyedRule): string =>
		(Number((rule?.price_cents as number) || 0) / 100).toFixed(2).replace('.', ',')

	const updateKeyedRuleAmountFromEuro = (rule: KeyedRule, rawValue: string): void => {
		const cents = adminEuroToCents(rawValue)
		rule.price_cents = Math.max(0, cents ?? 0)
	}

	const keyedRuleMinFeeToEuro = (rule: KeyedRule): string =>
		(Number((rule?.min_fee_cents as number) || 0) / 100).toFixed(2).replace('.', ',')

	const updateKeyedRuleMinFeeFromEuro = (rule: KeyedRule, rawValue: string): void => {
		const cents = adminEuroToCents(rawValue)
		rule.min_fee_cents = Math.max(0, cents ?? 0)
	}

	const updateArrayField = (
		rule: KeyedRule,
		field: string,
		rawValue: string,
		{ uppercase = false }: { uppercase?: boolean } = {},
	): void => {
		rule[field] = normalizeArrayFieldInput(rawValue, { uppercase })
	}

	interface TierRow { up_to_kg: number | null, price_cents: number }

	const addTierRow = (rule: KeyedRule & { tiers?: TierRow[] }): void => {
		const last = Array.isArray(rule.tiers) && rule.tiers.length ? rule.tiers[rule.tiers.length - 1] : null
		rule.tiers = Array.isArray(rule.tiers) ? rule.tiers : []
		rule.tiers.push({
			up_to_kg: last?.up_to_kg != null ? Number(last.up_to_kg) + 5 : null,
			price_cents: Number(last?.price_cents || 0),
		})
	}

	const removeTierRow = (
		rule: KeyedRule & { tiers?: TierRow[] },
		idx: number,
		onError?: (msg: string) => void,
	): void => {
		if (!Array.isArray(rule.tiers) || rule.tiers.length <= 1) {
			onError?.('Serve almeno uno scaglione per la regola selezionata.')
			return
		}
		rule.tiers.splice(idx, 1)
	}

	// ---------- COMPUTED ENTRIES ----------
	const automaticSupplementEntries = computed(() =>
		Object.entries(automaticSupplements.value || {}).map(([key, rule]) => ({
			key,
			rule,
			section: 'automatic_supplements' as const,
		})),
	)

	const operationalFeeEntries = computed(() =>
		Object.entries(operationalFees.value || {}).map(([key, rule]) => ({
			key,
			rule,
			section: 'operational_fees' as const,
		})),
	)

	// ---------- HYDRATION ----------
	const applyDefaults = (): void => {
		supplementRules.value = ADMIN_DEFAULT_SUPPLEMENTS.map((rule) => ({ ...rule }))
		originalSupplementRules.value = cloneForSnapshot(supplementRules.value)
		automaticSupplements.value = normalizePricingGroup({}, ADMIN_DEFAULT_AUTOMATIC_SUPPLEMENTS)
		operationalFees.value = normalizePricingGroup({}, ADMIN_DEFAULT_OPERATIONAL_FEES)
		originalAutomaticSupplements.value = cloneForSnapshot(automaticSupplements.value)
		originalOperationalFees.value = cloneForSnapshot(operationalFees.value)
	}

	const hydrateFromApi = (data: Record<string, unknown>): void => {
		const supplementsFromApi = Array.isArray(data.supplements)
			? (data.supplements as SupplementRule[])
			: ADMIN_DEFAULT_SUPPLEMENTS
		supplementRules.value = supplementsFromApi.map((rule, idx) => ({
			...rule,
			id: rule.id || `supplement-${idx + 1}`,
		}))
		originalSupplementRules.value = cloneForSnapshot(supplementRules.value)
		automaticSupplements.value = normalizePricingGroup(
			(data.automatic_supplements as KeyedGroup) || {},
			ADMIN_DEFAULT_AUTOMATIC_SUPPLEMENTS,
		)
		operationalFees.value = normalizePricingGroup(
			(data.operational_fees as KeyedGroup) || {},
			ADMIN_DEFAULT_OPERATIONAL_FEES,
		)
		originalAutomaticSupplements.value = cloneForSnapshot(automaticSupplements.value)
		originalOperationalFees.value = cloneForSnapshot(operationalFees.value)
	}

	const persistApiResponse = (data: Record<string, unknown>, fallbackPayload: Record<string, unknown>): void => {
		originalSupplementRules.value = cloneForSnapshot(
			(data.supplements as SupplementRule[]) || (fallbackPayload.supplements as SupplementRule[]),
		)
		automaticSupplements.value = normalizePricingGroup(
			(data.automatic_supplements as KeyedGroup) || (fallbackPayload.automatic_supplements as KeyedGroup) || {},
			ADMIN_DEFAULT_AUTOMATIC_SUPPLEMENTS,
		)
		operationalFees.value = normalizePricingGroup(
			(data.operational_fees as KeyedGroup) || (fallbackPayload.operational_fees as KeyedGroup) || {},
			ADMIN_DEFAULT_OPERATIONAL_FEES,
		)
		originalAutomaticSupplements.value = cloneForSnapshot(automaticSupplements.value)
		originalOperationalFees.value = cloneForSnapshot(operationalFees.value)
	}

	// ---------- PAYLOAD ----------
	const buildSupplementsPayload = () => ({
		supplements: supplementRules.value
			.map((rule, idx) => ({
				id: rule.id || `supplement-${idx + 1}`,
				prefix: String(rule.prefix || '').replace(/\D+/g, ''),
				amount_cents: Number(rule.amount_cents || 0),
				apply_to: ['origin', 'destination', 'both'].includes(rule.apply_to) ? rule.apply_to : 'both',
				enabled: rule.enabled !== false,
			}))
			.filter((rule) => rule.prefix.length > 0),
		automatic_supplements: buildPricingRulesPayload(automaticSupplements.value),
		operational_fees: buildPricingRulesPayload(operationalFees.value),
	})

	return {
		// state
		supplementRules,
		originalSupplementRules,
		automaticSupplements,
		originalAutomaticSupplements,
		operationalFees,
		originalOperationalFees,
		// computed
		automaticSupplementEntries,
		operationalFeeEntries,
		// CRUD CAP
		addSupplement,
		removeSupplement,
		supplementAmountToEuro,
		updateSupplementAmountFromEuro,
		// keyed-rule helpers
		keyedRuleAmountToEuro,
		updateKeyedRuleAmountFromEuro,
		keyedRuleMinFeeToEuro,
		updateKeyedRuleMinFeeFromEuro,
		updateArrayField,
		addTierRow,
		removeTierRow,
		// hydration / payload
		applyDefaults,
		hydrateFromApi,
		persistApiResponse,
		buildSupplementsPayload,
	}
})
