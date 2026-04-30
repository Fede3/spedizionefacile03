export const FIELD_ERROR_ORDER = [
	'origin_full_name',
	'origin_address',
	'origin_address_number',
	'origin_city',
	'origin_province',
	'origin_postal_code',
	'origin_telephone_number',
	'origin_email',
	'dest_full_name',
	'dest_address',
	'dest_address_number',
	'dest_city',
	'dest_province',
	'dest_postal_code',
	'dest_telephone_number',
	'dest_email',
] as const

export const FIELD_ERROR_LABELS: Record<string, string> = {
	origin_full_name: 'Nome e Cognome partenza',
	origin_address: 'Indirizzo partenza',
	origin_address_number: 'Numero civico partenza',
	origin_city: 'Citta partenza',
	origin_province: 'Provincia partenza',
	origin_postal_code: 'CAP partenza',
	origin_telephone_number: 'Telefono partenza',
	origin_email: 'Email partenza',
	dest_full_name: 'Nome e Cognome destinazione',
	dest_address: 'Indirizzo destinazione',
	dest_address_number: 'Numero civico destinazione',
	dest_city: 'Citta destinazione',
	dest_province: 'Provincia destinazione',
	dest_postal_code: 'CAP destinazione',
	dest_telephone_number: 'Telefono destinazione',
	dest_email: 'Email destinazione',
}

export const FIELD_ERROR_IDS: Record<string, string> = {
	origin_full_name: 'name',
	origin_address: 'address',
	origin_address_number: 'address_number',
	origin_city: 'city',
	origin_province: 'province',
	origin_postal_code: 'postal_code',
	origin_telephone_number: 'telephone',
	origin_email: 'email',
	dest_full_name: 'dest_name',
	dest_address: 'dest_address',
	dest_address_number: 'dest_address_number',
	dest_city: 'dest_city',
	dest_province: 'dest_province',
	dest_postal_code: 'dest_postal_code',
	dest_telephone_number: 'dest_telephone',
	dest_email: 'dest_email',
}

export const softenErrorMessage = (message: unknown): string => {
	const raw = String(message || '').trim()
	if (!raw) return ''

	const exactMap: Record<string, string> = {
		'Telefono e obbligatorio': 'Inserisci il numero di telefono per continuare.',
		'Solo numeri consentiti': 'Usa solo cifre nel numero di telefono.',
		'Numero troppo corto': 'Il numero sembra incompleto: aggiungi qualche cifra.',
		'Numero troppo lungo': 'Il numero sembra troppo lungo: controlla le cifre.',
		'CAP e obbligatorio': 'Inserisci il CAP per continuare.',
		'Il CAP deve essere di 5 cifre': 'Il CAP deve contenere 5 cifre.',
		'CAP non valido': 'Controlla il CAP inserito.',
		'Inserisci un indirizzo email valido': 'Controlla il formato email (es. nome@email.it).',
		'Nome e Cognome e obbligatorio': 'Inserisci nome e cognome.',
		'Il nome non puo contenere numeri': 'Nel nome evita numeri e simboli.',
		'Provincia e obbligatoria': 'Inserisci la sigla della provincia (es. RM, MI).',
		'Inserisci la sigla (2 lettere)': 'Usa la sigla provincia con 2 lettere (es. RM).',
		'Provincia non valida': 'Controlla la sigla provincia inserita.',
		'Citta e obbligatoria': 'Inserisci la citta.',
		'Campo obbligatorio': 'Completa questo campo per continuare.',
	}

	if (exactMap[raw]) return exactMap[raw]
	if (/^CAP\s+\d{5}\s+non trovato/i.test(raw)) return `${raw}. Verifica il CAP oppure scegli un suggerimento qui sotto.`
	if (/non coerente con citt/i.test(raw)) return `${raw}. Ti proponiamo una correzione veloce.`
	if (/Per CAP\s+\d{5}\s+la citt/i.test(raw)) return raw.replace(/^Per CAP/i, 'Per questo CAP')
	return raw
}

export const normalizeSimpleText = (value: unknown): string => String(value || '').replace(/\s+/g, ' ').trim()

export const buildEmailSuggestion = (email: unknown): string | null => {
	const raw = String(email || '').trim().toLowerCase()
	if (!raw.includes('@')) return null
	const [local, domain] = raw.split('@')
	if (!local || !domain) return null

	const commonFixes: Record<string, string> = {
		'gmial.com': 'gmail.com',
		'gamil.com': 'gmail.com',
		'gnail.com': 'gmail.com',
		'gmai.com': 'gmail.com',
		'hotnail.com': 'hotmail.com',
		'hotmai.com': 'hotmail.com',
		'outlok.com': 'outlook.com',
		'outllok.com': 'outlook.com',
		'icloud.con': 'icloud.com',
		'yaho.com': 'yahoo.com',
	}

	const fixedDomain = commonFixes[domain]
	return fixedDomain ? `${local}@${fixedDomain}` : null
}

export const extractAddressAndNumber = (value: unknown): { street: string; number: string } | null => {
	const raw = normalizeSimpleText(value)
	if (!raw) return null
	const parts = raw.split(/[,\s]+/).filter(Boolean)
	const number = normalizeSimpleText(parts.pop())
	if (!/^\d[a-z0-9/-]*$/i.test(number)) return null
	const street = normalizeSimpleText(parts.join(' ')).replace(/[,\s]+$/g, '')
	return street && number ? { street, number } : null
}
