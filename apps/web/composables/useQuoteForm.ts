import type { Ref } from 'vue'
import type { EuropePricing } from '~/types/pricing'

type QuoteTimer = ReturnType<typeof setTimeout> | null
type QuoteDimensionField = 'first_size' | 'second_size' | 'third_size'
type QuotePackage = {
	package_type?: string
	quantity?: number
	weight?: string | number
	first_size?: string | number
	second_size?: string | number
	third_size?: string | number
	[key: string]: unknown
}
type QuoteShipmentDetails = {
	origin_city: string
	origin_postal_code: string
	origin_country_code: string
	origin_country: string
	destination_city: string
	destination_postal_code: string
	destination_country_code: string
	destination_country: string
	date: string
}
type QuoteStore = {
	packages: QuotePackage[]
	shipmentDetails: QuoteShipmentDetails
	totalPrice: number
	stepNumber: number
	isQuoteStarted: boolean
}
type SmartValidation = {
	isTouched: (key: string) => boolean
	onBlur: (key: string, validate: () => void) => void
	validatePeso: (key: string, value: unknown) => void
	validateDimensione: (key: string, value: unknown, label: string) => void
	clearError: (key: string) => void
}
type LocationSearchApi = {
	clearLocationSearchError: () => void
}
type QuoteFormDeps = {
	shipmentFlowStore: QuoteStore
	locationSearch: LocationSearchApi
	priceBands: { value: { europe?: EuropePricing } | null | undefined }
	packageTypeList: readonly unknown[]
	selectPackageType: (pack?: unknown) => void
	calcPriceWithWeight: (pack: QuotePackage) => void
	calcPriceWithVolume: (pack: QuotePackage) => void
	originQuery: Ref<string>
	originSuggestions: Ref<unknown[]>
	showOriginSuggestions: Ref<boolean>
	destQuery: Ref<string>
	destSuggestions: Ref<unknown[]>
	showDestSuggestions: Ref<boolean>
	settleOriginQuery: () => Promise<unknown>
	settleDestQuery: () => Promise<unknown>
	isOriginItaly: Ref<boolean>
	isDestinationItaly: Ref<boolean>
	autoQuoteTimerRef: {
		(value?: QuoteTimer): QuoteTimer
	}
	sv: SmartValidation
}

export const useQuoteFormInternal = ({
	shipmentFlowStore,
	locationSearch,
	priceBands,
	packageTypeList,
	selectPackageType,
	calcPriceWithWeight,
	calcPriceWithVolume,
	originQuery,
	originSuggestions,
	showOriginSuggestions,
	destQuery,
	destSuggestions,
	showDestSuggestions,
	settleOriginQuery,
	settleDestQuery,
	isOriginItaly,
	isDestinationItaly,
	autoQuoteTimerRef,
	sv,
}: QuoteFormDeps) => {
	const formRef = ref<HTMLFormElement | null>(null)

	const onWeightInput = (pack: QuotePackage, packIndex: number) => {
		calcPriceWithWeight(pack)
		const key = `peso_${packIndex}`
		if (sv.isTouched(key)) sv.validatePeso(key, pack.weight)
	}
	const onWeightBlur = (pack: QuotePackage, packIndex: number) => {
		const key = `peso_${packIndex}`
		sv.onBlur(key, () => sv.validatePeso(key, pack.weight))
	}
	const onDimInput = (pack: QuotePackage, packIndex: number, dimName: QuoteDimensionField, label: string) => {
		calcPriceWithVolume(pack)
		const key = `${dimName}_${packIndex}`
		if (sv.isTouched(key)) sv.validateDimensione(key, pack[dimName], label)
	}
	const onDimBlur = (pack: QuotePackage, packIndex: number, dimName: QuoteDimensionField, label: string) => {
		const key = `${dimName}_${packIndex}`
		sv.onBlur(key, () => sv.validateDimensione(key, pack[dimName], label))
	}

	const europeCountryOptions = computed(() => {
		const countries = new Map([['IT', 'Italia']])

		for (const band of priceBands.value?.europe?.bands || []) {
			for (const rate of band.rates || []) {
				const code = String(rate.country_code || '').trim().toUpperCase()
				const name = String(rate.country_name || code).trim()
				if (code && !countries.has(code)) countries.set(code, name)
			}
		}

		return Array.from(countries.entries())
			.map(([code, label]) => ({ code, label }))
			.sort((a, b) => {
				if (a.code === 'IT') return -1
				if (b.code === 'IT') return 1
				return a.label.localeCompare(b.label, 'it')
			})
	})

	const clearOriginLocationUi = () => {
		originSuggestions.value = []
		showOriginSuggestions.value = false
		locationSearch.clearLocationSearchError()
		sv.clearError('origin_cap')
	}
	const clearDestinationLocationUi = () => {
		destSuggestions.value = []
		showDestSuggestions.value = false
		locationSearch.clearLocationSearchError()
		sv.clearError('dest_cap')
	}
	const applyOriginCountrySelection = (resetFields = false) => {
		const details = shipmentFlowStore.shipmentDetails
		const countryCode = String(details.origin_country_code || 'IT').trim().toUpperCase() || 'IT'
		const option = europeCountryOptions.value.find((entry) => entry.code === countryCode)

		details.origin_country_code = countryCode
		details.origin_country = option?.label || countryCode
		clearOriginLocationUi()

		if (countryCode === 'IT' || resetFields) {
			if (resetFields) {
				details.origin_city = ''
				details.origin_postal_code = ''
				originQuery.value = ''
			}
			return
		}

		details.origin_postal_code = ''
		originQuery.value = String(details.origin_city || originQuery.value || '').trim()
	}
	const applyDestinationCountrySelection = (resetFields = false) => {
		const details = shipmentFlowStore.shipmentDetails
		const countryCode = String(details.destination_country_code || 'IT').trim().toUpperCase() || 'IT'
		const option = europeCountryOptions.value.find((entry) => entry.code === countryCode)

		details.destination_country_code = countryCode
		details.destination_country = option?.label || countryCode
		clearDestinationLocationUi()

		if (countryCode === 'IT' || resetFields) {
			if (resetFields) {
				details.destination_city = ''
				details.destination_postal_code = ''
				destQuery.value = ''
			}
			return
		}

		details.destination_postal_code = ''
		destQuery.value = String(details.destination_city || destQuery.value || '').trim()
	}
	const onDestManualInput = () => {
		const value = String(destQuery.value || '').trimStart()
		clearDestinationLocationUi()
		shipmentFlowStore.shipmentDetails.destination_city = value
		shipmentFlowStore.shipmentDetails.destination_postal_code = ''
	}
	const onDestManualBlur = () => {
		const value = String(destQuery.value || '').trim()
		clearDestinationLocationUi()
		destQuery.value = value
		shipmentFlowStore.shipmentDetails.destination_city = value
		shipmentFlowStore.shipmentDetails.destination_postal_code = ''
	}
	const onOriginManualInput = () => {
		const value = String(originQuery.value || '').trimStart()
		clearOriginLocationUi()
		shipmentFlowStore.shipmentDetails.origin_city = value
		shipmentFlowStore.shipmentDetails.origin_postal_code = ''
	}
	const onOriginManualBlur = () => {
		const value = String(originQuery.value || '').trim()
		clearOriginLocationUi()
		originQuery.value = value
		shipmentFlowStore.shipmentDetails.origin_city = value
		shipmentFlowStore.shipmentDetails.origin_postal_code = ''
	}
	const scrollToFirstError = () => {
		nextTick(() => {
			const invalidField = formRef.value?.querySelector<HTMLElement>(':invalid')
			if (invalidField) {
				invalidField.scrollIntoView({ behavior: 'smooth', block: 'center' })
				setTimeout(() => invalidField.focus(), 120)
				return
			}

			const requiredField = formRef.value?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
				'input[required], select[required], textarea[required]',
			)
			if (requiredField && !requiredField.value) {
				requiredField.scrollIntoView({ behavior: 'smooth', block: 'center' })
				setTimeout(() => requiredField.focus(), 120)
				return
			}

			document.querySelector<HTMLElement>('.route-card__error, .package-field-card__error, .preventivo-inline-error')
				?.scrollIntoView({ behavior: 'smooth', block: 'center' })
		})
	}
	const ensurePrimaryPackage = () => {
		if (shipmentFlowStore.packages.length > 0) return
		selectPackageType(packageTypeList[0])
	}
	const resetForm = (messageError: Ref<unknown>, lastQuotedSignature: Ref<string>) => {
		const timer = autoQuoteTimerRef()
		if (timer) {
			clearTimeout(timer)
			autoQuoteTimerRef(null)
		}

		shipmentFlowStore.packages.splice(0)
		Object.assign(shipmentFlowStore.shipmentDetails, {
			origin_city: '',
			origin_postal_code: '',
			origin_country_code: 'IT',
			origin_country: 'Italia',
			destination_city: '',
			destination_postal_code: '',
			destination_country_code: 'IT',
			destination_country: 'Italia',
			date: '',
		})
		shipmentFlowStore.totalPrice = 0
		shipmentFlowStore.stepNumber = 1
		shipmentFlowStore.isQuoteStarted = false
		messageError.value = null
		lastQuotedSignature.value = ''
		locationSearch.clearLocationSearchError()
		ensurePrimaryPackage()
	}
	const flushLocationDraftsForSubmit = async (formatResolvedLocationFn: (city: unknown, cap: unknown) => string) => {
		const timer = autoQuoteTimerRef()
		if (timer) {
			clearTimeout(timer)
			autoQuoteTimerRef(null)
		}

		const originDraft = String(originQuery.value || '').trim()
		const destinationDraft = String(destQuery.value || '').trim()
		const resolvedOrigin = formatResolvedLocationFn(
			shipmentFlowStore.shipmentDetails.origin_city,
			shipmentFlowStore.shipmentDetails.origin_postal_code,
		)
		const resolvedDestination = formatResolvedLocationFn(
			shipmentFlowStore.shipmentDetails.destination_city,
			shipmentFlowStore.shipmentDetails.destination_postal_code,
		)
		const activeFieldId = import.meta.client ? document.activeElement?.id : ''

		if (activeFieldId === 'origin_city' || (originDraft && originDraft !== resolvedOrigin)) {
			if (isOriginItaly.value) await settleOriginQuery()
			else onOriginManualBlur()
		}

		if (activeFieldId === 'destination_city' || (destinationDraft && destinationDraft !== resolvedDestination)) {
			if (isDestinationItaly.value) await settleDestQuery()
			else onDestManualBlur()
		}

		await nextTick()
	}

	return {
		formRef,
		onWeightInput,
		onWeightBlur,
		onDimInput,
		onDimBlur,
		europeCountryOptions,
		applyOriginCountrySelection,
		applyDestinationCountrySelection,
		onDestManualInput,
		onDestManualBlur,
		onOriginManualInput,
		onOriginManualBlur,
		scrollToFirstError,
		ensurePrimaryPackage,
		resetForm,
		flushLocationDraftsForSubmit,
	}
}
