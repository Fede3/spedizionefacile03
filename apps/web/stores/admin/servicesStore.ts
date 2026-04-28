/**
 * servicesStore — servizi utente (sezione "Servizi e supplementi" pannello admin).
 *
 * Estratto dalla sezione "services" di composables/useAdminPrezzi.js
 * (split atomico Pinia 2026-04-26). Comprende:
 *   - state servicePricing (etichetta, notifiche, sponda, contrassegno, assicurazione)
 *   - UI state della vista admin (tab attivo + filtri/search)
 *   - computed entries + filtraggio combinato (con supplementi/fee dal supplementsStore)
 */
import { defineStore } from 'pinia'
import {
	buildPricingRulesPayload,
	cloneForSnapshot,
	ADMIN_DEFAULT_SERVICE_PRICING,
	normalizePricingGroup,
} from '~/utils/adminPrezziHelpers'
import { useAdminSupplementsStore } from '~/stores/admin/supplementsStore'

type KeyedRule = Record<string, unknown>
type KeyedGroup = Record<string, KeyedRule>
type ServiceSection = 'service_pricing' | 'automatic_supplements' | 'operational_fees'

export const useAdminServicesStore = defineStore('admin-services', () => {
	// ---------- STATE ----------
	const servicePricing = ref<KeyedGroup>({})
	const originalServicePricing = ref<KeyedGroup>({})

	// ---------- UI STATE ----------
	const adminView = ref<'nazionale' | 'europa' | 'servizi'>('nazionale')
	const serviceSearch = ref('')
	const serviceFilter = ref<'all' | ServiceSection>('all')

	// ---------- COMPUTED ----------
	const servicePricingEntries = computed(() =>
		Object.entries(servicePricing.value || {}).map(([key, rule]) => ({
			key,
			rule,
			section: 'service_pricing' as const,
		})),
	)

	const filteredServiceEntries = computed(() => {
		const supplements = useAdminSupplementsStore()
		const search = serviceSearch.value.trim().toLowerCase()
		const activeFilter = serviceFilter.value
		return [
			...(activeFilter === 'all' || activeFilter === 'service_pricing' ? servicePricingEntries.value : []),
			...(activeFilter === 'all' || activeFilter === 'automatic_supplements' ? supplements.automaticSupplementEntries : []),
			...(activeFilter === 'all' || activeFilter === 'operational_fees' ? supplements.operationalFeeEntries : []),
		].filter(({ rule }) => {
			if (!search) return true
			const r = rule as { label?: string, description?: string, note?: string }
			return `${r.label ?? ''} ${r.description ?? ''} ${r.note ?? ''}`.toLowerCase().includes(search)
		})
	})

	// ---------- HYDRATION ----------
	const applyDefaults = (): void => {
		servicePricing.value = normalizePricingGroup({}, ADMIN_DEFAULT_SERVICE_PRICING)
		originalServicePricing.value = cloneForSnapshot(servicePricing.value)
	}

	const hydrateFromApi = (data: Record<string, unknown>): void => {
		servicePricing.value = normalizePricingGroup(
			(data.service_pricing as KeyedGroup) || {},
			ADMIN_DEFAULT_SERVICE_PRICING,
		)
		originalServicePricing.value = cloneForSnapshot(servicePricing.value)
	}

	const persistApiResponse = (data: Record<string, unknown>, fallbackPayload: Record<string, unknown>): void => {
		servicePricing.value = normalizePricingGroup(
			(data.service_pricing as KeyedGroup) || (fallbackPayload.service_pricing as KeyedGroup) || {},
			ADMIN_DEFAULT_SERVICE_PRICING,
		)
		originalServicePricing.value = cloneForSnapshot(servicePricing.value)
	}

	// ---------- PAYLOAD ----------
	const buildServicesPayload = () => ({
		service_pricing: buildPricingRulesPayload(servicePricing.value),
	})

	return {
		// state
		servicePricing,
		originalServicePricing,
		adminView,
		serviceSearch,
		serviceFilter,
		// computed
		servicePricingEntries,
		filteredServiceEntries,
		// hydration / payload
		applyDefaults,
		hydrateFromApi,
		persistApiResponse,
		buildServicesPayload,
	}
})
