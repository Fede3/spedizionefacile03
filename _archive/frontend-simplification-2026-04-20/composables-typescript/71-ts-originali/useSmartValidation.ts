/**
 * COMPOSABLE: useSmartValidation (useSmartValidation.ts)
 */

const ITALIAN_PROVINCES: string[] = [
	'AG','AL','AN','AO','AP','AQ','AR','AT','AV','BA','BG','BI','BL','BN','BO',
	'BR','BS','BT','BZ','CA','CB','CE','CH','CL','CN','CO','CR','CS','CT','CZ',
	'EN','FC','FE','FG','FI','FM','FR','GE','GO','GR','IM','IS','KR','LC','LE',
	'LI','LO','LT','LU','MB','MC','ME','MI','MN','MO','MS','MT','NA','NO','NU',
	'OG','OR','OT','PA','PC','PD','PE','PG','PI','PN','PO','PR','PT','PU','PV',
	'PZ','RA','RC','RE','RG','RI','RM','RN','RO','SA','SI','SO','SP','SR','SS',
	'SU','SV','TA','TE','TN','TO','TP','TR','TS','TV','UD','VA','VB','VC','VE',
	'VI','VR','VT','VV',
]

interface CapValidationOptions {
	countryCode?: string
}

export function useSmartValidation() {
	const errors = ref<Record<string, string>>({})
	const touched = ref<Record<string, boolean>>({})

	const markTouched = (key: string): void => {
		touched.value[key] = true
	}

	const isTouched = (key: string): boolean => Boolean(touched.value[key])

	const clearError = (key: string): void => {
		delete errors.value[key]
	}

	const setError = (key: string, msg: string): void => {
		errors.value[key] = msg
	}

	const getError = (key: string): string | null => {
		return touched.value[key] ? (errors.value[key] || null) : null
	}

	const hasError = (key: string): boolean => {
		return Boolean(touched.value[key]) && Boolean(errors.value[key])
	}

	const validateTelefono = (key: string, value: unknown): boolean => {
		if (!value || !String(value).trim()) {
			setError(key, 'Telefono è obbligatorio')
			return false
		}
		const cleaned = String(value).replace(/[\s\-\(\)]/g, '')
		if (!/^\+?\d+$/.test(cleaned)) {
			setError(key, 'Solo numeri consentiti')
			return false
		}
		const digits = cleaned.replace(/^\+?39/, '')
		if (digits.length < 6) {
			setError(key, 'Numero troppo corto')
			return false
		}
		if (digits.length > 10) {
			setError(key, 'Numero troppo lungo')
			return false
		}
		clearError(key)
		return true
	}

	const formatTelefono = (value: unknown): string => {
		if (!value) return value as string
		const cleaned = String(value).replace(/[^\d+]/g, '')
		return cleaned
	}

	const validateCAP = (key: string, value: unknown, options: CapValidationOptions = {}): boolean => {
		const countryCode = String(options?.countryCode || 'IT').trim().toUpperCase() || 'IT'
		if (!value || !String(value).trim()) {
			setError(key, 'CAP è obbligatorio')
			return false
		}
		if (countryCode !== 'IT') {
			const cleanedForeign = String(value).trim().toUpperCase().replace(/[^A-Z0-9-\s]/g, '')
			if (cleanedForeign.length < 2) {
				setError(key, 'Inserisci un CAP valido')
				return false
			}
			clearError(key)
			return true
		}
		const cleaned = String(value).replace(/[^0-9]/g, '')
		if (cleaned.length !== 5) {
			setError(key, 'Il CAP deve essere di 5 cifre')
			return false
		}
		const capNum = parseInt(cleaned, 10)
		if (capNum < 10 || capNum > 98168) {
			setError(key, 'CAP non valido')
			return false
		}
		clearError(key)
		return true
	}

	const filterCAP = (value: unknown, options: CapValidationOptions = {}): string => {
		const countryCode = String(options?.countryCode || 'IT').trim().toUpperCase() || 'IT'
		if (!value) return value as string
		if (countryCode !== 'IT') {
			return String(value).toUpperCase().replace(/[^A-Z0-9-\s]/g, '').slice(0, 12)
		}
		return String(value).replace(/[^0-9]/g, '').slice(0, 5)
	}

	const validateEmail = (key: string, value: unknown): boolean => {
		if (!value || !String(value).trim()) {
			clearError(key)
			return true
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(String(value).trim())) {
			setError(key, 'Inserisci un indirizzo email valido')
			return false
		}
		clearError(key)
		return true
	}

	const validatePeso = (key: string, value: unknown): boolean => {
		if (!value && value !== 0) {
			setError(key, 'Peso è obbligatorio')
			return false
		}
		const num = Number(String(value).replace(/[^0-9.]/g, ''))
		if (isNaN(num) || num <= 0) {
			setError(key, 'Inserisci un peso positivo')
			return false
		}
		if (num > 1000) {
			setError(key, 'Peso massimo: 1000 kg')
			return false
		}
		clearError(key)
		return true
	}

	const validateDimensione = (key: string, value: unknown, label: string): boolean => {
		if (!value && value !== 0) {
			setError(key, `${label} è obbligatorio`)
			return false
		}
		const num = Number(String(value).replace(/[^0-9.]/g, ''))
		if (isNaN(num) || num <= 0) {
			setError(key, 'Inserisci un valore positivo')
			return false
		}
		if (num > 300) {
			setError(key, 'Dimensione massima: 300 cm')
			return false
		}
		clearError(key)
		return true
	}

	const validateNomeCognome = (key: string, value: unknown): boolean => {
		if (!value || !String(value).trim()) {
			setError(key, 'Nome e Cognome è obbligatorio')
			return false
		}
		if (/\d/.test(String(value))) {
			setError(key, 'Il nome non può contenere numeri')
			return false
		}
		clearError(key)
		return true
	}

	const autoCapitalize = (value: unknown): string => {
		if (!value) return value as string
		return String(value).replace(/\b\w/g, (c: string) => c.toUpperCase())
	}

	const validateProvincia = (key: string, value: unknown): boolean => {
		if (!value || !String(value).trim()) {
			setError(key, 'Provincia è obbligatoria')
			return false
		}
		const upper = String(value).toUpperCase().trim()
		if (!/^[A-Z]{2}$/.test(upper)) {
			setError(key, 'Inserisci la sigla (2 lettere)')
			return false
		}
		if (!ITALIAN_PROVINCES.includes(upper)) {
			setError(key, 'Provincia non valida')
			return false
		}
		clearError(key)
		return true
	}

	const filterProvincia = (value: unknown): string => {
		if (!value) return value as string
		return String(value).replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase()
	}

	const getProvinceSuggestions = (input: unknown): string[] => {
		if (!input || String(input).length < 1) return []
		const upper = String(input).toUpperCase()
		return ITALIAN_PROVINCES.filter((p) => p.startsWith(upper)).slice(0, 5)
	}

	const onBlur = (key: string, validateFn: () => void): void => {
		markTouched(key)
		validateFn()
	}

	const onInput = (key: string, validateFn: () => void): void => {
		if (isTouched(key)) {
			validateFn()
		}
	}

	const errorClass = (key: string, baseClass: string = ''): string => {
		if (hasError(key)) {
			return `${baseClass} !border-red-400 !bg-red-50/30`
		}
		return baseClass
	}

	const resetAll = (): void => {
		errors.value = {}
		touched.value = {}
	}

	return {
		errors,
		touched,
		markTouched,
		isTouched,
		clearError,
		setError,
		getError,
		hasError,
		validateTelefono,
		formatTelefono,
		validateCAP,
		filterCAP,
		validateEmail,
		validatePeso,
		validateDimensione,
		validateNomeCognome,
		autoCapitalize,
		validateProvincia,
		filterProvincia,
		getProvinceSuggestions,
		onBlur,
		onInput,
		errorClass,
		resetAll,
		ITALIAN_PROVINCES,
	}
}
