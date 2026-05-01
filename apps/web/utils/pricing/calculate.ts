/**
 * API pubblica del modulo pricing: calculateShipmentServiceSurcharge.
 *
 * normalize + matchers per produrre il SurchargeResult per una spedizione.
 */
import {
	buildFixedItem,
	calculateThresholdFeeCents,
	findTierPriceCents,
	matchesMinorIsland,
	matchesOutOfGauge,
	matchesProvince,
	matchesRodsAndTubes,
} from './matchers'
import {
	getAssicurazioneAmount,
	getContrassegnoAmount,
	getNested,
	normalizeAddress,
	normalizePackages,
	normalizePricingConfig,
	normalizeSelectedServices,
	roundCurrency,
} from './normalize'
import type {
	AutomaticSupplementsInput,
	CalculateShipmentSurchargeOptions,
	SurchargeItem,
	SurchargeResult,
} from './types'

/**
 * Calcola la lista di supplementi automatici attivi per lo shipment corrente.
 */
const calculateAutomaticSupplementItems = ({
	automaticConfig,
	serviceData,
	packages,
	destinationAddress,
	deliveryMode,
	requiresManualQuote,
}: AutomaticSupplementsInput): SurchargeItem[] => {
	const items: SurchargeItem[] = []
	const destination = normalizeAddress(destinationAddress)

	if (
		automaticConfig.calabria_sardegna_sicilia?.enabled
		&& matchesProvince(destination, automaticConfig.calabria_sardegna_sicilia.province_codes)
	) {
		for (const pkg of packages) {
			const fee = findTierPriceCents(pkg.weight_kg, automaticConfig.calabria_sardegna_sicilia.tiers)
			if (fee > 0) {
				items.push(buildFixedItem('calabria_sardegna_sicilia', automaticConfig.calabria_sardegna_sicilia, fee * pkg.quantity, true))
			}
		}
	}

	if (
		automaticConfig.brt_point_csi?.enabled
		&& deliveryMode === 'pudo'
		&& matchesProvince(destination, automaticConfig.brt_point_csi.province_codes)
	) {
		const maxWeight = Number(automaticConfig.brt_point_csi.max_weight_kg || 0)
		const fee = Math.max(0, Math.round(Number(automaticConfig.brt_point_csi.price_cents || 0)))
		for (const pkg of packages) {
			if (fee > 0 && pkg.weight_kg > 0 && (!maxWeight || pkg.weight_kg <= maxWeight)) {
				items.push(buildFixedItem('brt_point_csi', automaticConfig.brt_point_csi, fee * pkg.quantity, true))
			}
		}
	}

	if (automaticConfig.isole_minori_italia?.enabled && matchesMinorIsland(destination, automaticConfig.isole_minori_italia)) {
		items.push(buildFixedItem('isole_minori_italia', automaticConfig.isole_minori_italia, automaticConfig.isole_minori_italia.price_cents, true))
	}

	if (automaticConfig.isole_minori_europa?.enabled && matchesMinorIsland(destination, automaticConfig.isole_minori_europa)) {
		items.push(buildFixedItem('isole_minori_europa', automaticConfig.isole_minori_europa, automaticConfig.isole_minori_europa.price_cents, true))
	}

	if (automaticConfig.fuori_sagoma?.enabled) {
		for (const pkg of packages) {
			if (!matchesOutOfGauge(pkg, serviceData, automaticConfig.fuori_sagoma)) continue
			const fee = findTierPriceCents(pkg.weight_kg, automaticConfig.fuori_sagoma.tiers)
			if (fee > 0) {
				items.push(buildFixedItem('fuori_sagoma', automaticConfig.fuori_sagoma, fee * pkg.quantity, true))
			}
		}
	}

	if (automaticConfig.lato_superiore_130cm?.enabled) {
		const threshold = Number(automaticConfig.lato_superiore_130cm.threshold_cm || 130)
		const fee = Math.max(0, Math.round(Number(automaticConfig.lato_superiore_130cm.price_cents || 0)))
		for (const pkg of packages) {
			if (fee > 0 && pkg.max_side_cm > threshold) {
				items.push(buildFixedItem('lato_superiore_130cm', automaticConfig.lato_superiore_130cm, fee * pkg.quantity, true))
			}
		}
	}

	if (automaticConfig.aste_tubi?.enabled) {
		const fee = Math.max(0, Math.round(Number(automaticConfig.aste_tubi.price_cents || 0)))
		for (const pkg of packages) {
			if (fee > 0 && matchesRodsAndTubes(pkg, serviceData, automaticConfig.aste_tubi)) {
				items.push(buildFixedItem('aste_tubi', automaticConfig.aste_tubi, fee * pkg.quantity, true))
			}
		}
	}

	if (automaticConfig.eu_manual_extra?.enabled && requiresManualQuote) {
		items.push(buildFixedItem('eu_manual_extra', automaticConfig.eu_manual_extra, automaticConfig.eu_manual_extra.price_cents, true))
	}

	return items.filter((item) => item.amount_cents > 0)
}

/**
 * Calcola il totale dei supplementi (servizi selezionati + supplementi
 * automatici) per una spedizione.
 *
 * API pubblica del modulo pricing — chiamata dai composable funnel,
 * pagamento, summary, quick-quote.
 */
export const calculateShipmentServiceSurcharge = ({
	selectedServices = [],
	serviceType = '',
	serviceData = {},
	smsEmailNotification = false,
	pricingConfig = null,
	packages = [],
	originAddress = {},
	destinationAddress = {},
	deliveryMode = '',
	selectedPudo = null,
	requiresManualQuote = false,
}: CalculateShipmentSurchargeOptions = {}): SurchargeResult => {
	const config = normalizePricingConfig(pricingConfig || {})
	const servicePricing = config.service_pricing
	const automaticConfig = config.automatic_supplements
	const normalizedServices = normalizeSelectedServices(
		(Array.isArray(selectedServices) && selectedServices.length) ? selectedServices : serviceType,
	)
	const selected = new Set(normalizedServices)
	const normalizedPackages = normalizePackages(packages)
	const effectiveDeliveryMode = String(
		deliveryMode
		|| serviceData?.delivery_mode
		|| serviceData?.deliveryMode
		|| (selectedPudo ? 'pudo' : 'home'),
	).trim().toLowerCase()
	const effectiveDestination = effectiveDeliveryMode === 'pudo' && selectedPudo
		? selectedPudo
		: destinationAddress
	const items: SurchargeItem[] = []

	if (selected.has('senza_etichetta') && servicePricing.senza_etichetta?.enabled) {
		items.push(buildFixedItem('senza_etichetta', servicePricing.senza_etichetta, servicePricing.senza_etichetta.price_cents))
	}

	if (selected.has('sponda_idraulica') && servicePricing.sponda_idraulica?.enabled) {
		items.push(buildFixedItem('sponda_idraulica', servicePricing.sponda_idraulica, servicePricing.sponda_idraulica.price_cents))
	}

	if (selected.has('contrassegno') && servicePricing.contrassegno?.enabled) {
		const amountCents = calculateThresholdFeeCents(getContrassegnoAmount(serviceData), servicePricing.contrassegno)
		if (amountCents > 0) {
			items.push(buildFixedItem('contrassegno', servicePricing.contrassegno, amountCents))
		}
	}

	if (selected.has('assicurazione') && servicePricing.assicurazione?.enabled) {
		const amountCents = calculateThresholdFeeCents(getAssicurazioneAmount(serviceData), servicePricing.assicurazione)
		if (amountCents > 0) {
			items.push(buildFixedItem('assicurazione', servicePricing.assicurazione, amountCents))
		}
	}

	const notificationsEnabled = Boolean(
		smsEmailNotification
		|| getNested(serviceData, ['sms_email_notification', 'smsEmailNotification']),
	)
	if (notificationsEnabled && servicePricing.notifications?.enabled) {
		items.push(buildFixedItem('notifications', servicePricing.notifications, servicePricing.notifications.price_cents))
	}

	items.push(...calculateAutomaticSupplementItems({
		automaticConfig,
		serviceData,
		packages: normalizedPackages,
		destinationAddress: effectiveDestination,
		deliveryMode: effectiveDeliveryMode,
		requiresManualQuote: Boolean(requiresManualQuote),
		originAddress,
	}))

	const total = roundCurrency(items.reduce((sum, item) => sum + item.amount, 0))

	return {
		total,
		total_cents: Math.round(total * 100),
		items,
	}
}
