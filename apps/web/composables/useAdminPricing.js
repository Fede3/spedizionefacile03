/**
 * useAdminPrezzi — thin wrapper retro-compat sui 4 store admin (Pinia).
 *
 * Sostituisce la versione monolitica da 1426 LOC con un orchestratore che
 * compone bands + supplements + services + promos. L'API pubblica e' invariata:
 * il caller pages/account/amministrazione/prezzi.vue destruttura gli stessi
 * nomi della versione precedente. La logica delle azioni di rete cross-store
 * (fetchPriceBands / savePriceBands / seedBands) vive qui perche' coinvolge
 * piu' store contemporaneamente.
 */
import { storeToRefs } from 'pinia'
import { useAdminPricingBandsStore } from '~/stores/admin/pricingBandsStore'
import { useAdminSupplementsStore } from '~/stores/admin/supplementsStore'
import { useAdminServicesStore } from '~/stores/admin/servicesStore'
import { useAdminPromosStore } from '~/stores/admin/promosStore'
import { formatApplicationLabel } from '~/utils/adminPrezziHelpers'

export const useAdminPrezzi = () => {
	const { actionMessage, showSuccess, showError } = useAdmin()
	const { forceReload: reloadPublicPriceBands } = usePriceBands()
	const sanctum = useSanctumClient()

	const bands = useAdminPricingBandsStore()
	const supplements = useAdminSupplementsStore()
	const services = useAdminServicesStore()
	const promos = useAdminPromosStore()

	const isLoading = ref(true)
	const saving = ref(false)
	const seeding = ref(false)

	const buildPricingPayload = () => ({
		...bands.buildBandsPayload(),
		...supplements.buildSupplementsPayload(),
		europe: bands.buildEuropePayload(),
		...services.buildServicesPayload(),
	})

	const hasChanges = computed(() => {
		const original = JSON.stringify({
			weight: bands.originalWeightBands,
			volume: bands.originalVolumeBands,
			extra_rules: bands.originalExtraRules || bands.extraRules,
			supplements: supplements.originalSupplementRules || supplements.supplementRules,
			europe: bands.originalEuropePricing || bands.europePricing,
			service_pricing: services.originalServicePricing || services.servicePricing,
			automatic_supplements: supplements.originalAutomaticSupplements || supplements.automaticSupplements,
			operational_fees: supplements.originalOperationalFees || supplements.operationalFees,
		})
		return !bands.bandsFromDb || JSON.stringify(buildPricingPayload()) !== original
	})

	const applyAllDefaults = () => {
		bands.applyDefaults()
		supplements.applyDefaults()
		services.applyDefaults()
	}

	const fetchPriceBands = async () => {
		isLoading.value = true
		try {
			const res = await sanctum('/api/admin/price-bands')
			const data = (res?.data || res || {})?.data || (res?.data || res || {})
			if ((data.weight || []).length || (data.volume || []).length) {
				bands.hydrateFromApi(data)
				supplements.hydrateFromApi(data)
				services.hydrateFromApi(data)
			} else {
				applyAllDefaults()
			}
		} catch {
			applyAllDefaults()
		} finally {
			isLoading.value = false
		}
	}

	const seedBands = async () => {
		seeding.value = true
		try {
			await sanctum('/api/admin/price-bands/seed', { method: 'POST' })
			showSuccess('Fasce di prezzo inizializzate nel database.')
			await fetchPriceBands()
			await reloadPublicPriceBands()
		} catch (e) {
			showError(e, "Errore durante l'inizializzazione delle fasce.")
		} finally {
			seeding.value = false
		}
	}

	const savePriceBands = async () => {
		saving.value = true
		try {
			const payload = buildPricingPayload()
			const data = (await sanctum('/api/admin/price-bands', { method: 'PUT', body: payload }))?.data || {}
			showSuccess('Configurazione prezzi nazionale ed Europa salvata con successo.')
			bands.persistApiResponse(data, payload)
			supplements.persistApiResponse(data, payload)
			services.persistApiResponse(data, payload)
			await reloadPublicPriceBands()
		} catch (e) {
			showError(e, 'Errore durante il salvataggio della configurazione prezzi.')
		} finally {
			saving.value = false
		}
	}

	const promoHandlers = { showSuccess, showError, reloadPublicPriceBands }

	return {
		// state + computed (reactive refs via storeToRefs)
		...storeToRefs(bands),
		...storeToRefs(supplements),
		...storeToRefs(services),
		...storeToRefs(promos),
		isLoading,
		saving,
		seeding,
		actionMessage,
		hasChanges,
		formatApplicationLabel,
		// actions: bands
		startEdit: bands.startEdit,
		confirmEdit: bands.confirmEdit,
		cancelEdit: bands.cancelEdit,
		toggleShowDiscount: bands.toggleShowDiscount,
		addBand: bands.addBand,
		removeBand: (type, idx) => bands.removeBand(type, idx, (msg) => showError(null, msg)),
		moveBand: bands.moveBand,
		addLadderRow: bands.addLadderRow,
		removeLadderRow: (kind, idx) => bands.removeLadderRow(kind, idx, (msg) => showError(null, msg)),
		ensureLadderContinuity: bands.ensureLadderContinuity,
		ladderRowsFor: bands.ladderRowsFor,
		updateLadderIncrementFromEuro: bands.updateLadderIncrementFromEuro,
		updateEuropeRateAmountFromEuro: bands.updateEuropeRateAmountFromEuro,
		toggleEuropeRateQuote: bands.toggleEuropeRateQuote,
		centsToEuro: bands.centsToEuro,
		euroToCents: bands.euroToCents,
		effectivePrice: bands.effectivePrice,
		discountInfo: bands.discountInfo,
		incrementCentsToEuro: bands.incrementCentsToEuro,
		// actions: supplementi + keyed rules
		addSupplement: supplements.addSupplement,
		removeSupplement: supplements.removeSupplement,
		supplementAmountToEuro: supplements.supplementAmountToEuro,
		updateSupplementAmountFromEuro: supplements.updateSupplementAmountFromEuro,
		keyedRuleAmountToEuro: supplements.keyedRuleAmountToEuro,
		updateKeyedRuleAmountFromEuro: supplements.updateKeyedRuleAmountFromEuro,
		keyedRuleMinFeeToEuro: supplements.keyedRuleMinFeeToEuro,
		updateKeyedRuleMinFeeFromEuro: supplements.updateKeyedRuleMinFeeFromEuro,
		updateArrayField: supplements.updateArrayField,
		addTierRow: supplements.addTierRow,
		removeTierRow: (rule, idx) => supplements.removeTierRow(rule, idx, (msg) => showError(null, msg)),
		// API rete
		fetchPriceBands,
		fetchPromoSettings: promos.fetchPromoSettings,
		seedBands,
		savePriceBands,
		savePromo: () => promos.savePromo(promoHandlers),
		uploadPromoImage: (event) => promos.uploadPromoImage(event, promoHandlers),
	}
}
