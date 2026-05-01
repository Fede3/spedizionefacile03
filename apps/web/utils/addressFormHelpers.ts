/**
 * Helper puri per il form indirizzi.
 *
 * Estratti da `AddressFormFields.vue` (Ondata 1 plan refactor) per separare
 * logica di parsing UI da markup. Importati da `AddressNameFields.vue`
 * (Ondata 6) e da test unit dedicati.
 */

/** Risultato dello split di un nome completo in nome + cognome. */
export interface ContactNameParts {
	firstName: string
	lastName: string
}

/**
 * Spezza un nome completo nelle sue parti nome / cognome.
 *
 * Regola: la PRIMA parola e' il nome, il RESTO il cognome (gestione
 * pratica per cognomi composti tipo "Di Stefano" o "Della Valle").
 * Stringa vuota o whitespace ritorna parti vuote.
 */
export function splitContactName(value: unknown): ContactNameParts {
	const raw = String(value ?? '').trim()
	if (!raw) return { firstName: '', lastName: '' }

	const parts = raw.split(/\s+/)
	if (parts.length === 1) {
		return { firstName: parts[0] || '', lastName: '' }
	}

	const [first, ...rest] = parts
	return {
		firstName: first || '',
		lastName: rest.join(' '),
	}
}

/**
 * Riunisce nome + cognome in un'unica stringa "Nome Cognome".
 * Gestisce parti vuote (no doppi spazi).
 */
export function joinContactName(firstName: unknown, lastName: unknown): string {
	const first = String(firstName ?? '').trim()
	const last = String(lastName ?? '').trim()
	if (first && last) return `${first} ${last}`
	return first || last
}
